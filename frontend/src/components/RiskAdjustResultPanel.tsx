import { useState } from "react";

export interface RiskAdjustTaskDetail {
  task_id: number;
  task_title: string;
  original_start: string;
  original_end: string;
  new_start: string;
  new_end: string;
  baseline_duration_days: number;
  p50_duration_days: number;
  buffer_days: number;
  new_duration_days: number;
  critical_index: number;
  sigma_days: number;
  start_shift_days: number;
  end_shift_days: number;
  shift_reason: string;
}

export interface OriginalMonteCarloResult {
  runs: number;
  baseline_end: string;
  slip_probability: number;
  mean_delay_days_when_slip: number;
  percentiles_days: { p50: number; p75: number; p90: number; p99: number };
  per_task_slip_probability: Record<string, number>;
  delay_histogram: Record<string, number>;
  critical_index: Record<string, number>;
  critical_path: number[];
}

export interface RiskAdjustResult {
  new_scenario_id: number;
  buffer_days: number;
  achieved_probability: number;
  target_probability: number;
  task_details: RiskAdjustTaskDetail[];
  original_montecarlo: OriginalMonteCarloResult;
}

interface Props {
  result: RiskAdjustResult;
  onClose: () => void;
}

export const RiskAdjustResultPanel = ({ result, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState<"shifts" | "montecarlo">("shifts");
  const mc = result.original_montecarlo;

  // Build histogram bars (top 30 bins by delay days)
  const histoEntries = Object.entries(mc.delay_histogram)
    .map(([d, p]) => ({ delay: Number(d), prob: Number(p) }))
    .sort((a, b) => a.delay - b.delay)
    .slice(0, 40);
  const maxProb = Math.max(...histoEntries.map((e) => e.prob), 0.01);

  // Critical index sorted desc, top 10
  const ciEntries = Object.entries(mc.critical_index)
    .map(([id, ci]) => ({ id: Number(id), ci: Number(ci) }))
    .sort((a, b) => b.ci - a.ci)
    .slice(0, 10);

  // Map task IDs to titles from task_details
  const idToTitle: Record<number, string> = {};
  for (const td of result.task_details) {
    idToTitle[td.task_id] = td.task_title;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Risk-Adjusted Scenario Created
          </h3>
          <p className="text-xs text-slate-400">
            Scenario #{result.new_scenario_id} — P{Math.round(result.target_probability * 100)} target — achieved{" "}
            {Math.round(result.achieved_probability * 100)}% — total buffer: {result.buffer_days}d
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-1 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("shifts")}
          className={`px-3 py-1.5 text-xs font-medium ${
            activeTab === "shifts"
              ? "border-b-2 border-amber-400 text-amber-300"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Task Shifts ({result.task_details.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("montecarlo")}
          className={`px-3 py-1.5 text-xs font-medium ${
            activeTab === "montecarlo"
              ? "border-b-2 border-sky-400 text-sky-300"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Original Monte Carlo
        </button>
      </div>

      {/* ===== SHIFTS TAB ===== */}
      {activeTab === "shifts" && (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900/90 text-slate-400">
              <tr>
                <th className="py-1.5 pr-2 text-left font-medium">Task</th>
                <th className="px-2 py-1.5 text-right font-medium">Orig dates</th>
                <th className="px-2 py-1.5 text-right font-medium">New dates</th>
                <th className="px-2 py-1.5 text-right font-medium">Buffer</th>
                <th className="px-2 py-1.5 text-right font-medium">CI</th>
                <th className="px-2 py-1.5 text-right font-medium">σ</th>
                <th className="px-2 py-1.5 text-right font-medium">End Δ</th>
                <th className="pl-2 py-1.5 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.task_details.map((td) => {
                const hasShift = td.end_shift_days !== 0 || td.start_shift_days !== 0;
                return (
                  <tr
                    key={td.task_id}
                    className={`border-t border-slate-800/50 ${hasShift ? "" : "opacity-50"}`}
                  >
                    <td className="py-1.5 pr-2 text-slate-200 font-medium max-w-[160px] truncate" title={td.task_title}>
                      {td.task_title}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-400 whitespace-nowrap">
                      {td.original_start} → {td.original_end}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <span className={hasShift ? "text-amber-300" : "text-slate-400"}>
                        {td.new_start} → {td.new_end}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {td.buffer_days > 0 ? (
                        <span className="text-amber-400">+{td.buffer_days}d</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span
                        className={
                          td.critical_index >= 0.5
                            ? "text-red-400"
                            : td.critical_index >= 0.2
                            ? "text-amber-400"
                            : "text-slate-400"
                        }
                      >
                        {(td.critical_index * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">
                      {td.sigma_days.toFixed(1)}d
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {td.end_shift_days > 0 ? (
                        <span className="text-red-400">+{td.end_shift_days}d</span>
                      ) : td.end_shift_days < 0 ? (
                        <span className="text-emerald-400">{td.end_shift_days}d</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="pl-2 py-1.5 text-slate-400 max-w-[260px] truncate" title={td.shift_reason}>
                      {td.shift_reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== ORIGINAL MONTE CARLO TAB ===== */}
      {activeTab === "montecarlo" && (
        <div>
          <div className="flex gap-4 items-start">
            {/* Left: summary */}
            <div className="w-52 shrink-0 text-xs text-slate-300">
              <div className="text-xs text-slate-400 mb-2 font-medium">Original Scenario Monte Carlo</div>
              <div className="mb-1">
                Runs: <span className="font-medium text-slate-100">{mc.runs.toLocaleString()}</span>
              </div>
              <div className="mb-1">
                Baseline end: <span className="font-medium text-slate-100">{mc.baseline_end}</span>
              </div>
              <div className="mb-1">
                Slip probability:{" "}
                <span className="font-medium text-slate-100">
                  {(mc.slip_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mb-1">
                Mean slip delay:{" "}
                <span className="font-medium text-slate-100">
                  {mc.mean_delay_days_when_slip.toFixed(1)}d
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-400 mb-1 font-medium">Percentiles (delay days)</div>
              <div className="mb-0.5">
                P50: <span className="font-medium text-slate-100">{mc.percentiles_days.p50}d</span>
              </div>
              <div className="mb-0.5">
                P75: <span className="font-medium text-slate-100">{mc.percentiles_days.p75}d</span>
              </div>
              <div className="mb-0.5">
                P90: <span className="font-medium text-slate-100">{mc.percentiles_days.p90}d</span>
              </div>
              <div className="mb-0.5">
                P99: <span className="font-medium text-slate-100">{mc.percentiles_days.p99}d</span>
              </div>
            </div>

            {/* Center: histogram */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 mb-1 font-medium">Delay distribution</div>
              {histoEntries.length > 0 && (
                <svg
                  viewBox={`0 0 ${histoEntries.length * 12} 100`}
                  className="w-full h-28"
                  preserveAspectRatio="none"
                >
                  {histoEntries.map((e, i) => {
                    const h = (e.prob / maxProb) * 90;
                    return (
                      <g key={e.delay}>
                        <rect
                          x={i * 12}
                          y={95 - h}
                          width={10}
                          height={h}
                          fill={e.delay === 0 ? "#10b981" : "#f59e0b"}
                          opacity={0.7}
                          rx={1}
                        />
                        {i % 5 === 0 && (
                          <text
                            x={i * 12 + 5}
                            y={100}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="6"
                          >
                            {e.delay}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Right: critical index + path */}
            <div className="w-56 shrink-0 overflow-auto text-xs text-slate-300">
              <div className="text-xs text-slate-400 mb-2 font-medium">Critical Index (top 10)</div>
              {ciEntries.map((e) => (
                <div key={e.id} className="mb-1 flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-red-500/60"
                    style={{ width: `${Math.max(4, e.ci * 100)}%` }}
                  />
                  <span className="text-slate-200 truncate max-w-[120px]" title={idToTitle[e.id] ?? `#${e.id}`}>
                    {idToTitle[e.id] ?? `#${e.id}`}
                  </span>
                  <span className="ml-auto text-slate-400">{(e.ci * 100).toFixed(0)}%</span>
                </div>
              ))}

              {mc.critical_path.length > 0 && (
                <>
                  <div className="mt-3 text-xs text-slate-400 mb-1 font-medium">Most frequent critical path</div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    {mc.critical_path.map((id) => idToTitle[id] ?? `#${id}`).join(" → ")}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAdjustResultPanel;
