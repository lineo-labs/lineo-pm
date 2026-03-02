"""Monte Carlo probabilistic schedule simulations (NumPy-optimized).

Overview
--------
This module runs Monte Carlo simulations to estimate the probability and
magnitude of project schedule slip relative to the baseline. Simulations are
vectorized with NumPy: durations for all runs are sampled into a matrix and the
code iterates only over tasks (not over runs) for performance.

Step-by-step explanation
------------------------
1. Load tasks
     - Query `Task` objects for the project ordered by `order_index`. Build
         `id_to_idx` / `idx_to_id` maps to index into NumPy arrays.

2. Load relations and merge dependencies
     - Query `Relation` objects and build `deps_by_id` that merges the
         `Task.dependencies` list with relations, without mutating ORM objects.

3. Topological order
     - Construct a graph from FS relations (treated as predecessor->successor)
         and compute a topological ordering. If a cycle is detected, fall back to
         the stored `order_index` to preserve deterministic behavior.

4. Baseline and reference durations
     - Convert `start_date` / `end_date` to ordinal integers (days) and compute
         base durations per task and the baseline project end date.

5. RNG and runs configuration
     - Clamp `runs` to a safe range (1..100000) and create a NumPy RNG for fast
         sampling.

6. Risk multipliers and overrides
     - Map risk labels (`low`/`medium`/`high`) to multipliers (0.5/1.0/1.5) and
         apply any `risk_overrides` passed in the request.

7. Sample task durations
     - For each task and run sample noise ~ U(0.8, 1.2). Compute
         `dur = round(base_duration * multiplier * noise)` and clamp to >= 1 day.
         Result: a `(n_tasks, runs)` integer matrix of durations.

8. Predecessor indices
     - For fast vectorized access build, for each task, an array of predecessor
         indices into the internal 0..n_tasks-1 indexing.

9. Build schedules (vectorized across runs)
     - For each task in topological order:
         - `earliest` = baseline_start (scalar)
         - if predecessors exist, compute per-run max of their `end` values and
             take `earliest = max(earliest, pred_end_max)` (vectorized)
         - `start = earliest`; `end = start + dur(task, run)`
     - This produces `starts` and `ends` arrays with shape `(n_tasks, runs)`.

10. Project delays and statistics
        - `project_end` = max over tasks of `ends` (per run).
        - `delays` = max(0, project_end - baseline_end_project) (per run).
        - `slip_probability` = fraction of runs with `delay > 0`.
        - `mean_delay_days_when_slip` = mean of delays where `delay > 0` (0 if none).
        - Percentiles (p50/p75/p90/p99) computed with
            `np.quantile(method="nearest")` to avoid interpolation.
        - `per_task_slip_probability`: for each task, fraction of runs where
            `end_task > baseline_end_task`.
        - `delay_histogram`: probability histogram mapping integer days -> probability.

Output
------
The endpoint returns a JSON-serializable dict with keys: `runs`, `baseline_end`,
`slip_probability`, `mean_delay_days_when_slip`, `percentiles_days`,
`per_task_slip_probability`, and `delay_histogram`.

Implementation notes
--------------------
- The implementation focuses on memory and speed: NumPy `int32`/`float32`
    types and vectorization across runs while looping only over tasks.
- ORM objects are not mutated while building dependency maps.
- Results are reproducible within the probabilistic nature of RNG-driven sampling
    (NumPy RNG is used).
"""

from __future__ import annotations

from collections import deque
from datetime import date
from typing import Dict, Optional, List

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models.task import Task
from src.db.models.relation import Relation

router = APIRouter(prefix="/simulations", tags=["simulations"])


class MonteCarloRequest(BaseModel):
    scenario_id: int
    runs: int = 1000
    # optional overrides: task_id -> "low"|"medium"|"high"
    risk_overrides: Optional[Dict[int, str]] = None


def _to_ordinal(d: date) -> int:
    # date.toordinal(): integer days, stable and fast
    return int(d.toordinal())


@router.post("/montecarlo")
def run_montecarlo(payload: MonteCarloRequest, db: Session = Depends(get_db)):
    # delegate to helper that returns both summary and raw arrays
    res = _simulate_scenario(payload.scenario_id, payload.runs, payload.risk_overrides, db)
    # build response using same keys as before
    return {
        "runs": int(res["runs"]),
        "baseline_end": date.fromordinal(int(res["baseline_end_project"]) ).isoformat(),
        "slip_probability": float(res["slip_probability"]),
        "mean_delay_days_when_slip": float(res["mean_delay"]),
        "percentiles_days": {
            "p50": float(res["percentiles"]["p50"]),
            "p75": float(res["percentiles"]["p75"]),
            "p90": float(res["percentiles"]["p90"]),
            "p99": float(res["percentiles"]["p99"]),
        },
        "per_task_slip_probability": {k: float(v) for k, v in res["per_task_probs"].items()},
        "delay_histogram": {k: float(v) for k, v in res["delay_histogram"].items()},
        "critical_index": {k: float(v) for k, v in res["critical_index"].items()},
        "critical_path": res.get("critical_path", []),
    }
    tasks: List[Task] = (
        db.query(Task)
        .filter(Task.scenario_id == payload.scenario_id)
        .order_by(Task.order_index.asc())
        .all()
    )
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found for scenario")

    task_ids = [t.id for t in tasks]
    n_tasks = len(tasks)

    # Map task_id -> index [0..n_tasks-1]
    id_to_idx = {t.id: i for i, t in enumerate(tasks)}
    idx_to_id = {i: t.id for i, t in enumerate(tasks)}

    # ---- Load relations once ----
    rels: List[Relation] = (
        db.query(Relation)
        .filter(
            Relation.source_task_id.in_(task_ids),
            Relation.destination_task_id.in_(task_ids),
        )
        .all()
    )

    # ---- Merge "dependencies" stored in Task + relations (same intent as your code) ----
    # Build rel_map: destination -> [sources]
    rel_map: Dict[int, List[int]] = {}
    for r in rels:
        rel_map.setdefault(r.destination_task_id, []).append(r.source_task_id)

    # Merge into a local deps dict (do NOT mutate ORM objects if you can avoid it)
    deps_by_id: Dict[int, List[int]] = {}
    for t in tasks:
        # Dependencies are derived from the `relations` table only.
        from_rels = set(rel_map.get(t.id, []))
        deps_by_id[t.id] = sorted(from_rels)

    # ---- Topological order (based on FS relations only, fallback to order_index if cycles) ----
    adj = {tid: [] for tid in task_ids}
    indeg = {tid: 0 for tid in task_ids}

    for r in rels:
        if str(r.relation_type).lower() == "fs":
            adj[r.source_task_id].append(r.destination_task_id)
            indeg[r.destination_task_id] += 1

    q = deque([tid for tid, d in indeg.items() if d == 0])
    topo_ids: List[int] = []
    while q:
        n = q.popleft()
        topo_ids.append(n)
        for nb in adj.get(n, []):
            indeg[nb] -= 1
            if indeg[nb] == 0:
                q.append(nb)

    if len(topo_ids) != n_tasks:
        # cycle detected; fallback to stored order
        topo_ids = [t.id for t in tasks]

    topo_idx = np.array([id_to_idx[tid] for tid in topo_ids], dtype=np.int32)

    # ---- Baseline arrays (ordinal day integers) ----
    baseline_start = np.array([_to_ordinal(t.start_date) for t in tasks], dtype=np.int32)
    baseline_end_task = np.array([_to_ordinal(t.end_date) for t in tasks], dtype=np.int32)

    baseline_end_project = int(baseline_end_task.max())

    # Base durations in days (>=1)
    base_dur = np.maximum(1, (baseline_end_task - baseline_start)).astype(np.int32)

    # ---- Runs + RNG ----
    runs = int(max(1, min(100000, payload.runs)))
    rng = np.random.default_rng()

    # ---- Risk multipliers per task ----
    risk_map = {"low": 0.5, "medium": 1.0, "high": 1.5}

    overrides = {int(k): v for k, v in (payload.risk_overrides or {}).items()}
    mult = np.ones(n_tasks, dtype=np.float32)  # default medium
    for tid, label in overrides.items():
        if tid in id_to_idx:
            mult[id_to_idx[tid]] = float(risk_map.get(label, 1.0))

    # ---- Sample durations matrix: (n_tasks, runs) ----
    # noise ~ U(0.8, 1.2)
    noise = rng.uniform(0.8, 1.2, size=(n_tasks, runs)).astype(np.float32)
    dur_f = (base_dur.astype(np.float32)[:, None] * mult[:, None] * noise)
    dur = np.rint(dur_f).astype(np.int32)
    dur = np.maximum(1, dur)

    # ---- Dependencies as index lists (for vectorized max end) ----
    preds_idx: List[np.ndarray] = []
    for t in tasks:
        preds = deps_by_id.get(t.id, []) or []
        # Keep only preds that exist in this project
        pidx = [id_to_idx[p] for p in preds if p in id_to_idx]
        preds_idx.append(np.array(pidx, dtype=np.int32))

    # ---- Build schedules vectorized across runs ----
    starts = np.zeros((n_tasks, runs), dtype=np.int32)
    ends = np.zeros((n_tasks, runs), dtype=np.int32)

    for ti in topo_idx:
        # earliest start is baseline start
        earliest = baseline_start[ti]  # scalar
        s = np.full((runs,), earliest, dtype=np.int32)

        p = preds_idx[ti]
        if p.size > 0:
            # max end across predecessors, vectorized over runs
            pred_end_max = ends[p, :].max(axis=0)
            s = np.maximum(s, pred_end_max)

        starts[ti, :] = s
        ends[ti, :] = s + dur[ti, :]

    # ---- Project delays ----
    project_end = ends.max(axis=0)  # (runs,)
    delays = np.maximum(0, project_end - baseline_end_project).astype(np.int32)

    slip_mask = delays > 0
    slip_count = int(slip_mask.sum())
    slip_probability = float(slip_count / runs)

    mean_delay = float(delays[slip_mask].mean()) if slip_count else 0.0

    # Percentiles (match your "nearest index" behavior reasonably well)
    # If you want the exact old behavior, keep the manual index; this is close and stable.
    def pct(p: float) -> float:
        if runs == 0:
            return 0.0
        # method="nearest" avoids interpolation and keeps integer-ish behavior
        return float(np.quantile(delays, p / 100.0, method="nearest"))

    # ---- Per-task slip probability (task end > baseline task end) ----
    per_task_slip_counts = (ends > baseline_end_task[:, None]).sum(axis=1).astype(np.int32)
    per_task_probs = {str(idx_to_id[i]): float(per_task_slip_counts[i] / runs) for i in range(n_tasks)}

    # ---- Histogram day -> probability ----
    max_delay = int(delays.max()) if runs else 0
    counts = np.bincount(delays, minlength=max_delay + 1)
    delay_histogram = {str(d): float(counts[d] / runs) for d in range(max_delay + 1)}
    # ---- Backward pass: compute latest_end per task per run, slack and critical mask ----
    # Build successors index lists from `adj` (which maps id->list[id])
    succ_idx: List[np.ndarray] = []
    for i in range(n_tasks):
        tid = idx_to_id[i]
        succs = adj.get(tid, []) or []
        sidx = [id_to_idx[s] for s in succs if s in id_to_idx]
        succ_idx.append(np.array(sidx, dtype=np.int32))

    latest_end = np.zeros((n_tasks, runs), dtype=np.int32)
    project_end_arr = project_end.astype(np.int32)

    # reverse topological order
    for ti in reversed(topo_idx):
        # `ti` may be a numpy scalar; cast to int for list indexing
        ti_int = int(ti)
        sidx = succ_idx[ti_int]
        if sidx.size == 0:
            latest_end[ti_int, :] = project_end_arr
        else:
            # candidate latest end is min over successors of (succ_latest_end - succ_dur)
            cand = (latest_end[sidx, :] - dur[sidx, :]).min(axis=0)
            latest_end[ti_int, :] = cand

    # slack per task per run and critical mask
    slack = latest_end - ends
    critical_mask = slack == 0  # shape (n_tasks, runs)

    # critical index: fraction of runs where task is critical
    critical_counts = critical_mask.sum(axis=1).astype(np.int32)
    critical_index = {str(idx_to_id[i]): float(critical_counts[i] / runs) for i in range(n_tasks)}

    # critical path: most frequent set of critical tasks observed across runs
    # represent each run's critical set as a comma-joined string of task ids in topo order
    path_counts: Dict[str, int] = {}
    # iterate runs and build keys
    for r in range(runs):
        mask_r = critical_mask[:, r]
        if not mask_r.any():
            key = ""
        else:
            ids_in_order = [str(idx_to_id[int(i)]) for i in topo_idx if mask_r[int(i)]]
            key = ",".join(ids_in_order)
        path_counts[key] = path_counts.get(key, 0) + 1

    # select most common key with deterministic tie-break (lexicographically smallest)
    if path_counts:
        max_count = max(path_counts.values())
        candidates = [k for k, v in path_counts.items() if v == max_count]
        chosen = min(candidates)
        critical_path = [] if chosen == "" else [int(x) for x in chosen.split(",")]
    else:
        critical_path = []

    return {
        "runs": runs,
        "baseline_end": date.fromordinal(baseline_end_project).isoformat(),
        "slip_probability": slip_probability,
        "mean_delay_days_when_slip": mean_delay,
        "percentiles_days": {
            "p50": pct(50),
            "p75": pct(75),
            "p90": pct(90),
            "p99": pct(99),
        },
        # keys as task_id strings (JSON-friendly)
        "per_task_slip_probability": per_task_probs,
        "delay_histogram": delay_histogram,
        "critical_index": critical_index,
        "critical_path": critical_path,
    }


def _simulate_scenario(scenario_id: int, runs_in: int | None, risk_overrides: Optional[Dict[int, str]], db: Session):
    """Core simulation helper used by other endpoints.

    Returns a dict containing summary metrics and raw arrays used by the
    risk-adjuster. This is kept internal (leading underscore) to avoid
    changing the public HTTP shape but allows reuse from other routers.
    """
    # ---- Load tasks ----
    tasks: List[Task] = (
        db.query(Task)
        .filter(Task.scenario_id == scenario_id)
        .order_by(Task.order_index.asc())
        .all()
    )
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found for scenario")

    task_ids = [t.id for t in tasks]
    n_tasks = len(tasks)

    # Map task_id -> index [0..n_tasks-1]
    id_to_idx = {t.id: i for i, t in enumerate(tasks)}
    idx_to_id = {i: t.id for i, t in enumerate(tasks)}

    # ---- Load relations once ----
    rels: List[Relation] = (
        db.query(Relation)
        .filter(
            Relation.source_task_id.in_(task_ids),
            Relation.destination_task_id.in_(task_ids),
        )
        .all()
    )

    # Build rel_map: destination -> [sources]
    rel_map: Dict[int, List[int]] = {}
    for r in rels:
        rel_map.setdefault(r.destination_task_id, []).append(r.source_task_id)

    deps_by_id: Dict[int, List[int]] = {}
    for t in tasks:
        from_rels = set(rel_map.get(t.id, []))
        deps_by_id[t.id] = sorted(from_rels)

    # ---- Topological order (based on FS relations only, fallback to order_index if cycles) ----
    adj = {tid: [] for tid in task_ids}
    indeg = {tid: 0 for tid in task_ids}

    for r in rels:
        if str(r.relation_type).lower() == "fs":
            adj[r.source_task_id].append(r.destination_task_id)
            indeg[r.destination_task_id] += 1

    q = deque([tid for tid, d in indeg.items() if d == 0])
    topo_ids: List[int] = []
    while q:
        n = q.popleft()
        topo_ids.append(n)
        for nb in adj.get(n, []):
            indeg[nb] -= 1
            if indeg[nb] == 0:
                q.append(nb)

    if len(topo_ids) != n_tasks:
        topo_ids = [t.id for t in tasks]

    topo_idx = np.array([id_to_idx[tid] for tid in topo_ids], dtype=np.int32)

    # ---- Baseline arrays (ordinal day integers) ----
    baseline_start = np.array([_to_ordinal(t.start_date) for t in tasks], dtype=np.int32)
    baseline_end_task = np.array([_to_ordinal(t.end_date) for t in tasks], dtype=np.int32)

    baseline_end_project = int(baseline_end_task.max())

    base_dur = np.maximum(1, (baseline_end_task - baseline_start)).astype(np.int32)

    # ---- Runs + RNG ----
    runs = int(max(1, min(100000, runs_in or 1000)))
    rng = np.random.default_rng()

    # ---- Risk multipliers per task ----
    risk_map = {"low": 0.5, "medium": 1.0, "high": 1.5}

    overrides = {int(k): v for k, v in (risk_overrides or {}).items()}
    mult = np.ones(n_tasks, dtype=np.float32)  # default medium
    for tid, label in overrides.items():
        if tid in id_to_idx:
            mult[id_to_idx[tid]] = float(risk_map.get(label, 1.0))

    # ---- Sample durations matrix: (n_tasks, runs) ----
    noise = rng.uniform(0.8, 1.2, size=(n_tasks, runs)).astype(np.float32)
    dur_f = (base_dur.astype(np.float32)[:, None] * mult[:, None] * noise)
    dur = np.rint(dur_f).astype(np.int32)
    dur = np.maximum(1, dur)

    # ---- Dependencies as index lists (for vectorized max end) ----
    preds_idx: List[np.ndarray] = []
    for t in tasks:
        preds = deps_by_id.get(t.id, []) or []
        pidx = [id_to_idx[p] for p in preds if p in id_to_idx]
        preds_idx.append(np.array(pidx, dtype=np.int32))

    # ---- Build schedules vectorized across runs ----
    starts = np.zeros((n_tasks, runs), dtype=np.int32)
    ends = np.zeros((n_tasks, runs), dtype=np.int32)

    for ti in topo_idx:
        earliest = baseline_start[ti]
        s = np.full((runs,), earliest, dtype=np.int32)
        p = preds_idx[ti]
        if p.size > 0:
            pred_end_max = ends[p, :].max(axis=0)
            s = np.maximum(s, pred_end_max)
        starts[ti, :] = s
        ends[ti, :] = s + dur[ti, :]

    project_end = ends.max(axis=0)
    delays = np.maximum(0, project_end - baseline_end_project).astype(np.int32)

    slip_mask = delays > 0
    slip_count = int(slip_mask.sum())
    slip_probability = float(slip_count / runs)
    mean_delay = float(delays[slip_mask].mean()) if slip_count else 0.0

    def pct(p: float) -> float:
        if runs == 0:
            return 0.0
        return float(np.quantile(delays, p / 100.0, method="nearest"))

    per_task_slip_counts = (ends > baseline_end_task[:, None]).sum(axis=1).astype(np.int32)
    per_task_probs = {str(idx_to_id[i]): float(per_task_slip_counts[i] / runs) for i in range(n_tasks)}

    max_delay = int(delays.max()) if runs else 0
    counts = np.bincount(delays, minlength=max_delay + 1)
    delay_histogram = {str(d): float(counts[d] / runs) for d in range(max_delay + 1)}

    # backward pass for critical mask
    succ_idx: List[np.ndarray] = []
    for i in range(n_tasks):
        tid = idx_to_id[i]
        succs = adj.get(tid, []) or []
        sidx = [id_to_idx[s] for s in succs if s in id_to_idx]
        succ_idx.append(np.array(sidx, dtype=np.int32))

    latest_end = np.zeros((n_tasks, runs), dtype=np.int32)
    project_end_arr = project_end.astype(np.int32)
    for ti in reversed(topo_idx):
        ti_int = int(ti)
        sidx = succ_idx[ti_int]
        if sidx.size == 0:
            latest_end[ti_int, :] = project_end_arr
        else:
            cand = (latest_end[sidx, :] - dur[sidx, :]).min(axis=0)
            latest_end[ti_int, :] = cand

    slack = latest_end - ends
    critical_mask = slack == 0
    critical_counts = critical_mask.sum(axis=1).astype(np.int32)
    critical_index = {str(idx_to_id[i]): float(critical_counts[i] / runs) for i in range(n_tasks)}

    # build most frequent critical path key
    path_counts: Dict[str, int] = {}
    for r in range(runs):
        mask_r = critical_mask[:, r]
        if not mask_r.any():
            key = ""
        else:
            ids_in_order = [str(idx_to_id[int(i)]) for i in topo_idx if mask_r[int(i)]]
            key = ",".join(ids_in_order)
        path_counts[key] = path_counts.get(key, 0) + 1
    if path_counts:
        max_count = max(path_counts.values())
        candidates = [k for k, v in path_counts.items() if v == max_count]
        chosen = min(candidates)
        critical_path = [] if chosen == "" else [int(x) for x in chosen.split(",")]
    else:
        critical_path = []

    return {
        "runs": runs,
        "tasks": tasks,
        "id_to_idx": id_to_idx,
        "idx_to_id": idx_to_id,
        "baseline_start": baseline_start,
        "baseline_end_task": baseline_end_task,
        "baseline_end_project": baseline_end_project,
        "base_dur": base_dur,
        "dur": dur,  # sampled durations matrix
        "starts": starts,
        "ends": ends,
        "project_end": project_end,
        "delays": delays,
        "slip_probability": slip_probability,
        "mean_delay": mean_delay,
        "percentiles": {"p50": pct(50), "p75": pct(75), "p90": pct(90), "p99": pct(99)},
        "per_task_probs": per_task_probs,
        "delay_histogram": delay_histogram,
        "critical_index": critical_index,
        "critical_counts": critical_counts,
        "critical_path": critical_path,
        "preds_idx": preds_idx,
        "topo_idx": topo_idx,
        "adj": adj,
    }