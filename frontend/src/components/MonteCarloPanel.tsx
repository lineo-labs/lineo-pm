import { useEffect, useState } from "react";
import { runMonteCarlo, fetchScenarios } from "../lib/api";
import type { Task } from "../lib/types";

interface Props {
  projectId: number;
  tasks: Task[];
}

export const MonteCarloPanel = ({ projectId, tasks }: Props) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [runs, setRuns] = useState(1000);
  const [scenarios, setScenarios] = useState<{ id: number; name?: string }[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(tasks[0]?.scenarioId ?? null);

  useEffect(() => {
    let mounted = true;
    if (projectId) {
      fetchScenarios(projectId)
        .then((data) => {
          if (!mounted) return;
          setScenarios(data);
          if (selectedScenarioId === null && data.length > 0) setSelectedScenarioId(data[0].id);
        })
        .catch(() => {
          // ignore fetch errors for scenarios; UI will still allow run if tasks supply a scenario
        });
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="w-24 rounded-md bg-slate-900/40 p-2 text-sm text-slate-200"
          value={runs}
          onChange={(e) => setRuns(Number(e.target.value))}
          min={1}
        />
        <div>
          <label className="sr-only">Scenario</label>
          <select
            value={selectedScenarioId ?? ""}
            onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
            className="ml-2 rounded-md bg-slate-900/40 p-2 text-sm text-slate-200"
          >
            {scenarios.length === 0 && tasks[0]?.scenarioId && (
              <option value={tasks[0].scenarioId}>{`Scenario ${tasks[0].scenarioId}`}</option>
            )}
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.name ?? `Scenario ${s.id}`}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
            onClick={async () => {
            // preserve current vertical scroll position so UI doesn't jump
            const prevScroll = typeof window !== "undefined" ? (window.scrollY ?? window.pageYOffset ?? 0) : 0;
            setRunning(true);
            // keep previous `result` visible until new one arrives to avoid layout collapse
            try {
              const sid = selectedScenarioId ?? tasks[0]?.scenarioId;
              if (!sid) throw new Error("No scenario selected for simulation");
              const res = await runMonteCarlo({ scenarioId: sid, runs });
              setResult(res);
              // restore scroll after render (defensive: ensure finite number and rAF availability)
              if (typeof window !== "undefined") {
                const top = Number.isFinite(prevScroll as number) ? (prevScroll as number) : 0;
                if (typeof window.requestAnimationFrame === "function") {
                  window.requestAnimationFrame(() => window.scrollTo({ left: 0, top }));
                } else {
                  window.scrollTo({ left: 0, top });
                }
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(err);
              alert("Simulation failed");
            } finally {
              setRunning(false);
            }
          }}
          className="rounded-md border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
        >
          {running ? "Running..." : "Run Monte Carlo"}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-lg border border-slate-900 bg-slate-900/40 p-3 text-sm text-slate-200">
          {/* Summary column will be rendered as the middle column in the three-column layout below */}

          <div className="mt-3">
            <div className="mt-2 flex gap-4 items-start">
              {/* Left column: summary (moved from middle) */}
              <div className="w-48 shrink-0 text-xs text-slate-300">
                <div className="text-xs text-slate-400 mb-2">Summary</div>
                <div className="mb-1">Runs: <span className="font-medium text-slate-100">{result.runs}</span></div>
                <div className="mb-1">Baseline end: <span className="font-medium text-slate-100">{result.baseline_end}</span></div>
                <div className="mb-1">Slip probability: <span className="font-medium text-slate-100">{(() => { const sp = Number(result.slip_probability); return Number.isFinite(sp) ? `${(sp * 100).toFixed(2)}%` : "N/A"; })()}</span></div>
                <div className="mb-1">Mean slip delay (days): <span className="font-medium text-slate-100">{(() => { const m = Number(result.mean_delay_days_when_slip); return Number.isFinite(m) ? m.toFixed(2) : "N/A"; })()}</span></div>
                <div className="mb-1">Worst case date: <span className="font-medium text-slate-100">{(() => {
                  try {
                    const be = result?.baseline_end;
                    if (!be) return "N/A";
                    const bd = new Date(be);
                    if (Number.isNaN(bd.getTime())) return "N/A";
                    const hist = result?.delay_histogram || {};
                    const days = Object.entries(hist)
                      .map(([d, p]) => ({ day: Number(d), prob: Number(p) }))
                      .filter((b) => Number.isFinite(b.day) && Number.isFinite(b.prob) && b.prob > 0)
                      .map((b) => b.day);
                    if (days.length === 0) return "N/A";
                    const maxDay = Math.max(...days);
                    const worst = new Date(bd.getTime() + Math.round(maxDay) * 24 * 60 * 60 * 1000);
                    return Number.isFinite(worst.getTime()) ? worst.toISOString().slice(0, 10) : "N/A";
                  } catch (e) {
                    return "N/A";
                  }
                })()}</span></div>
              </div>

              {/* Center column: heading + Large histogram of delay days */}
              <div className="flex-1">
                <div className="text-xs text-slate-400">Delay distribution (histogram)</div>
                {(() => {
                  const hist = result?.delay_histogram || {};
                  const bins = Object.entries(hist)
                    .map(([d, p]) => ({ day: Number(d), prob: Number(p) }))
                    .filter((b) => Number.isFinite(b.day) && Number.isFinite(b.prob))
                    .sort((a, b) => a.day - b.day);

                  if (bins.length === 0) {
                    return <div className="text-xs text-slate-400">No histogram data</div>;
                  }
                  const vbW = Math.max(200, bins.length * 12);
                  const vbH = 100;
                  const maxP = bins.reduce((m, b) => Math.max(m, b.prob), 1e-9);
                  return (
                    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-64 bg-slate-900/20">
                      {bins.map((b, i) => {
                        const barW = Math.max(8, vbW / bins.length - 4);
                        const x = i * (vbW / bins.length) + 2;
                        const h = (b.prob / maxP) * (vbH - 18);
                        const y = vbH - h - 10;
                        const rawPct = Number.isFinite(b.prob) ? b.prob * 100 : NaN;
                        const pct = Number.isFinite(rawPct) && rawPct > 0 && rawPct < 0.1 ? "<0.1%" : (Number.isFinite(rawPct) ? rawPct.toFixed(1) + "%" : "N/A");
                        return (
                          <g key={b.day}>
                            <rect x={x} y={y} width={barW} height={h} fill="#60a5fa" />
                            {/* percent label above bar */}
                            <text x={x + barW / 2} y={Math.max(8, y - 4)} fontSize={6} fill="#e6f2ff" textAnchor="middle">{pct}</text>
                            {/* x-axis label: e.g. '0 day' */}
                            <text x={x + barW / 2} y={vbH - 2} fontSize={6} fill="#cbd5e1" textAnchor="middle">{`${b.day} day`}</text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Right column: compact per-task slip probabilities (top 10) */}
              <div className="w-64 shrink-0 overflow-auto text-xs text-slate-300">
                <div className="text-xs text-slate-400 mb-2">Per-task slip probability (top 10)</div>
                {(() => {
                  const entries = Object.entries(result?.per_task_slip_probability || {}).map(([tid, prob]) => ({ tid, prob: Number(prob) }));
                  const total = entries.length;
                  const top = [...entries].sort((a, b) => b.prob - a.prob).slice(0, 10);
                  return (
                    <>
                      {top.map(({ tid, prob }) => {
                        const t = tasks.find((x) => x.id === Number(tid));
                        const displayProb = Number.isFinite(prob) ? `${(prob * 100).toFixed(1)}%` : "N/A";
                        return (
                          <div key={tid} className="mb-2">
                            <div className="truncate">{t ? t.title : `Task ${tid}`}</div>
                            <div className="text-xs text-slate-400">{displayProb}</div>
                          </div>
                        );
                      })}
                      {total > 10 && (
                        <div className="text-xs text-slate-400 mt-2">+{total - 10} more</div>
                      )}
                    </>
                  );
                })()} 
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonteCarloPanel;
