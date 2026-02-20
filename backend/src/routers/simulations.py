"""Monte Carlo probabilistic schedule simulations (NumPy-optimized).

- Samples per-task durations with risk multipliers + uniform noise (±20%)
- Builds each simulated schedule respecting dependencies (FS semantics on merged deps)
- Aggregates slip probability, mean delay when slip, percentiles, per-task slip prob
- Adds delay histogram

This version vectorizes across runs using NumPy, looping only across tasks.
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
    project_id: int
    runs: int = 1000
    # optional overrides: task_id -> "low"|"medium"|"high"
    risk_overrides: Optional[Dict[int, str]] = None


def _to_ordinal(d: date) -> int:
    # date.toordinal(): integer days, stable and fast
    return int(d.toordinal())


@router.post("/montecarlo")
def run_montecarlo(payload: MonteCarloRequest, db: Session = Depends(get_db)):
    # ---- Load tasks ----
    tasks: List[Task] = (
        db.query(Task)
        .filter(Task.project_id == payload.project_id)
        .order_by(Task.order_index.asc())
        .all()
    )
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found for project")

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
        existing = set(t.dependencies or [])
        from_rels = set(rel_map.get(t.id, []))
        deps_by_id[t.id] = sorted(existing.union(from_rels))

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
    }