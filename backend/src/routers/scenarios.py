"""Routers for scenario and scenario-task endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date
import numpy as np
from typing import Dict
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models.scenario import Scenario
from src.db.models.task import Task
from src.db.models.relation import Relation
from src.schemas.scenario import (
    ScenarioCreate,
    ScenarioOut,
    ScenarioUpdate,
)
from src.schemas.task import (
    TaskCreate,
    TaskOut,
    TaskUpdate,
)
from pydantic import BaseModel

# reuse simulation helper
from src.routers.simulations import _simulate_scenario

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioOut])
def list_scenarios(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    """List scenarios, optionally filtered by project."""
    query = db.query(Scenario)
    if project_id is not None:
        query = query.filter(Scenario.project_id == project_id)
    scenarios = query.order_by(Scenario.created_at.asc()).all()
    return scenarios


@router.post("", response_model=ScenarioOut, status_code=201)
def create_scenario(payload: ScenarioCreate, db: Session = Depends(get_db)):
    """Create a new scenario for a project."""
    scenario = Scenario(
        project_id=payload.project_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.put("/{scenario_id}", response_model=ScenarioOut)
def update_scenario(scenario_id: int, payload: ScenarioUpdate, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    fields_set = payload.model_fields_set
    if "name" in fields_set:
        scenario.name = payload.name
    if "description" in fields_set:
        scenario.description = payload.description

    db.commit()
    db.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    # remove dependent relations and tasks first to avoid FK constraint violation
    # collect task ids that belong to this scenario
    task_ids = [t[0] for t in db.query(Task.id).filter(Task.scenario_id == scenario_id).all()]
    if task_ids:
        # delete any relations that reference these tasks (as source or destination)
        db.query(Relation).filter(
            (Relation.source_task_id.in_(task_ids)) | (Relation.destination_task_id.in_(task_ids))
        ).delete(synchronize_session=False)
        # now delete the tasks
        db.query(Task).filter(Task.scenario_id == scenario_id).delete(synchronize_session=False)
    db.delete(scenario)
    db.commit()
    return None


@router.post("/{scenario_id}/promote", status_code=204)
def promote_scenario_to_baseline(scenario_id: int, db: Session = Depends(get_db)):
    """Mark the specified scenario as the project's baseline and unset others."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # unset baseline flag for all scenarios of the same project
    db.query(Scenario).filter(Scenario.project_id == scenario.project_id).update(
        {Scenario.is_baseline: False}, synchronize_session=False
    )
    # set this scenario as baseline
    scenario.is_baseline = True
    db.commit()
    return None


@router.get("/{scenario_id}/tasks", response_model=list[TaskOut])
def list_scenario_tasks(scenario_id: int, db: Session = Depends(get_db)):
    """List tasks for a scenario ordered by `order_index`."""
    tasks = (
        db.query(Task)
        .filter(Task.scenario_id == scenario_id)
        .order_by(Task.order_index.asc())
        .all()
    )
    return tasks


@router.post("/{scenario_id}/tasks", response_model=TaskOut, status_code=201)
def create_scenario_task(scenario_id: int, payload: TaskCreate, db: Session = Depends(get_db)):
    """Create a task within a scenario and append it at the end of the scenario order."""
    # ensure scenario exists
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # create a new Task attached to this scenario
    max_order = (
        db.query(func.max(Task.order_index))
        .filter(Task.scenario_id == scenario_id)
        .scalar()
        or 0
    )

    t = Task(
        scenario_id=scenario_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        start_date=payload.start_date,
        end_date=payload.end_date,
        order_index=max_order + 1,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    # Persist dependencies as Relation rows (do not write into Task.dependencies JSON)
    new_src_ids = set(payload.dependencies or [])
    if new_src_ids:
        tasks_for_src = db.query(Task).filter(Task.id.in_(list(new_src_ids))).all()
        if len(tasks_for_src) != len(new_src_ids):
            raise HTTPException(status_code=400, detail="One or more dependency IDs are invalid")
        for tt in tasks_for_src:
            if tt.scenario_id != t.scenario_id:
                raise HTTPException(status_code=400, detail="Dependency task must belong to the same scenario")
        for src_id in new_src_ids:
            rel = Relation(source_task_id=src_id, destination_task_id=t.id, relation_type="FS")
            db.add(rel)
        db.commit()
    return t


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_scenario_task(task_id: int, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@router.put("/tasks/{task_id}", response_model=TaskOut)
def update_scenario_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    fields_set = payload.model_fields_set
    if "title" in fields_set:
        t.title = payload.title
    if "description" in fields_set:
        t.description = payload.description
    if "status" in fields_set:
        t.status = payload.status
    if "start_date" in fields_set:
        t.start_date = payload.start_date
    if "end_date" in fields_set:
        t.end_date = payload.end_date
    if "order_index" in fields_set:
        t.order_index = payload.order_index

    if "dependencies" in fields_set:
        # validate that all referenced task ids exist and belong to same scenario
        new_ids = set(payload.dependencies or [])
        if new_ids:
            tasks_found = db.query(Task).filter(Task.id.in_(list(new_ids))).all()
            if len(tasks_found) != len(new_ids):
                raise HTTPException(status_code=400, detail="One or more dependency IDs are invalid")
            for tt in tasks_found:
                if tt.scenario_id != t.scenario_id:
                    raise HTTPException(status_code=400, detail="Dependency task must belong to the same scenario")
        # synchronize Relation rows for this task (destination = t.id)
        existing_rels = db.query(Relation).filter(Relation.destination_task_id == t.id).all()
        existing_src_ids = {r.source_task_id for r in existing_rels}
        # delete removed relations
        for r in existing_rels:
            if r.source_task_id not in new_ids:
                db.delete(r)
        # create missing relations
        for src_id in new_ids - existing_src_ids:
            rel = Relation(source_task_id=src_id, destination_task_id=t.id, relation_type="FS")
            db.add(rel)

    # no per-task overrides field anymore

    db.commit()
    db.refresh(t)
    return t


@router.delete("/tasks/{task_id}", status_code=204)
def delete_scenario_task(task_id: int, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()
    return None



class RiskAdjustRequest(BaseModel):
    target_p: int  # 80|90|99
    runs: int | None = 100000
    name: str | None = None


@router.post("/{scenario_id}/risk_adjust")
def create_risk_adjusted_scenario(scenario_id: int, payload: RiskAdjustRequest, db: Session = Depends(get_db)):
    """Create a new scenario with risk-adjusted dates based on Monte Carlo.

    The simulation always runs on the active baseline scenario
    (``is_baseline=True``) of the project that *scenario_id* belongs to.

    Algorithm implemented server-side follows the requested steps:
    - run MC and compute P_target of project finish
    - compute buffer B = P_target - baseline_finish (days)
    - compute per-task weight w_i = CI_i * sigma_i (fallbacks applied)
    - allocate b_i = B * w_i / sum(w)
    - D*_i = P50_i + b_i
    - forward deterministic pass to compute start/end dates
    - create new scenario and duplicate tasks/relations with adjusted dates
    - validate with a Monte Carlo rerun and return achieved probability
    """
    # validate target
    if payload.target_p not in (80, 90, 99):
        raise HTTPException(status_code=400, detail="target_p must be one of 80,90,99")

    # ── Always resolve to the baseline scenario of the project ──────────
    ref_scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not ref_scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    baseline = (
        db.query(Scenario)
        .filter(Scenario.project_id == ref_scenario.project_id, Scenario.is_baseline == True)  # noqa: E712
        .first()
    )
    if not baseline:
        raise HTTPException(
            status_code=404,
            detail="No active baseline scenario found for this project",
        )
    # use the baseline scenario id from this point on
    scenario_id = baseline.id

    # run first Monte Carlo on the baseline scenario
    sim = _simulate_scenario(scenario_id, payload.runs, None, db)

    runs = int(sim["runs"])
    baseline_end = int(sim["baseline_end_project"]) if "baseline_end_project" in sim else sim["baseline_end_project"]
    # project_end is an ndarray of ordinals
    project_end = sim["project_end"]

    # P_target_finish ordinals
    p_val = float(payload.target_p) / 100.0
    p_target = int(np.quantile(project_end, p_val, method="nearest"))

    B = int(max(0, p_target - baseline_end))

    # per-task CI
    critical_index = sim["critical_index"]  # dict str(id)->float
    # sigma_i: std of sampled durations
    dur = sim["dur"]  # (n_tasks, runs)
    n_tasks = dur.shape[0]
    sigma = np.std(dur, axis=1)

    # weights
    w = np.zeros(n_tasks, dtype=np.float64)
    id_to_idx = sim["id_to_idx"]
    idx_to_id = sim["idx_to_id"]
    for i in range(n_tasks):
        tid = idx_to_id[i]
        ci = float(critical_index.get(str(tid), 0.0))
        s = float(sigma[i])
        if s > 0:
            w[i] = ci * s
        else:
            # fallback: use CI * mean(duration)
            w[i] = ci * float(dur[i, :].mean())

    total_w = float(w.sum())
    if total_w <= 0:
        # fallback: equal weights
        w = np.ones(n_tasks, dtype=np.float64)
        total_w = float(w.sum())

    # allocate buffer b_i
    b = (B * (w / total_w)).astype(np.float64)

    # base duration chosen as per-task P50
    p50 = np.array([float(np.quantile(dur[i, :], 0.5, method="nearest")) for i in range(n_tasks)])
    d_star = p50 + b
    # ensure integer days >=1
    d_star_int = np.maximum(1, np.rint(d_star).astype(np.int32))

    # deterministically recompute dates (forward pass)
    baseline_start = sim["baseline_start"]  # ndarray
    preds_idx = sim["preds_idx"]
    topo_idx = sim["topo_idx"]

    starts = np.zeros(n_tasks, dtype=np.int32)
    ends = np.zeros(n_tasks, dtype=np.int32)
    for ti in topo_idx:
        ti_int = int(ti)
        earliest = int(baseline_start[ti_int])
        if preds_idx[ti_int].size > 0:
            pred_ends = [ends[int(p)] for p in preds_idx[ti_int]]
            if pred_ends:
                earliest = max(earliest, max(pred_ends))
        starts[ti_int] = earliest
        ends[ti_int] = earliest + int(d_star_int[ti_int])

    # create new scenario and tasks – source is the baseline resolved above
    src_scenario = baseline

    name = payload.name or f"Risk-adjusted P{payload.target_p} of {src_scenario.name}"
    new_s = Scenario(project_id=src_scenario.project_id, name=name, description=f"Auto-generated risk adjusted (P{payload.target_p})")
    db.add(new_s)
    db.commit()
    db.refresh(new_s)

    # create tasks (preserve titles, descriptions, status, order_index)
    old_to_new: Dict[int, int] = {}
    for i in range(n_tasks):
        old_id = int(idx_to_id[i])
        t = sim["tasks"][i]
        s_date = date.fromordinal(int(starts[i]))
        e_date = date.fromordinal(int(ends[i]))
        new_t = Task(
            scenario_id=new_s.id,
            title=t.title,
            description=t.description,
            status=t.status,
            start_date=s_date,
            end_date=e_date,
            order_index=t.order_index,
        )
        db.add(new_t)
        db.flush()
        old_to_new[old_id] = new_t.id

    # persist relations mapping old ids to new ids
    rels = db.query(Relation).filter(Relation.source_task_id.in_(list(old_to_new.keys())), Relation.destination_task_id.in_(list(old_to_new.keys()))).all()
    for r in rels:
        src_new = old_to_new.get(r.source_task_id)
        dst_new = old_to_new.get(r.destination_task_id)
        if src_new and dst_new:
            nr = Relation(source_task_id=src_new, destination_task_id=dst_new, relation_type=r.relation_type)
            db.add(nr)

    db.commit()

    # validation: rerun Monte Carlo on new scenario to compute achieved probability
    sim_new = _simulate_scenario(new_s.id, payload.runs, None, db)
    project_end_new = sim_new["project_end"]
    # probability that project_end <= p_target
    achieved = float((project_end_new <= p_target).sum() / float(sim_new["runs"]))

    # --- Build per-task shift details ---
    task_details = []
    for i in range(n_tasks):
        tid = idx_to_id[i]
        t = sim["tasks"][i]
        ci_val = float(critical_index.get(str(tid), 0.0))
        sigma_val = float(sigma[i])
        buffer_i = float(b[i])
        p50_val = float(p50[i])
        baseline_dur_i = int(sim["base_dur"][i])
        new_dur_i = int(d_star_int[i])

        orig_start = date.fromordinal(int(sim["baseline_start"][i]))
        orig_end = date.fromordinal(int(sim["baseline_end_task"][i]))
        new_start = date.fromordinal(int(starts[i]))
        new_end = date.fromordinal(int(ends[i]))

        # Build human-readable shift reason
        if buffer_i < 0.5:
            reason = "Minimal buffer: low critical index or low duration uncertainty"
        else:
            parts = []
            if ci_val >= 0.5:
                parts.append(f"high critical index ({ci_val:.2f})")
            elif ci_val >= 0.2:
                parts.append(f"moderate critical index ({ci_val:.2f})")
            else:
                parts.append(f"low critical index ({ci_val:.2f})")
            if sigma_val > 0:
                parts.append(f"duration uncertainty σ={sigma_val:.1f}d")
            reason = " and ".join(parts) + f" → +{buffer_i:.1f}d buffer"

        start_shift = int(starts[i]) - int(sim["baseline_start"][i])
        end_shift = int(ends[i]) - int(sim["baseline_end_task"][i])

        task_details.append({
            "task_id": int(tid),
            "task_title": t.title,
            "original_start": orig_start.isoformat(),
            "original_end": orig_end.isoformat(),
            "new_start": new_start.isoformat(),
            "new_end": new_end.isoformat(),
            "baseline_duration_days": baseline_dur_i,
            "p50_duration_days": int(p50_val),
            "buffer_days": round(buffer_i, 1),
            "new_duration_days": new_dur_i,
            "critical_index": round(ci_val, 4),
            "sigma_days": round(sigma_val, 2),
            "start_shift_days": start_shift,
            "end_shift_days": end_shift,
            "shift_reason": reason,
        })

    # --- Build original Monte Carlo summary ---
    delays_orig = sim["delays"]
    slip_mask_orig = delays_orig > 0
    slip_count_orig = int(slip_mask_orig.sum())
    slip_probability_orig = float(slip_count_orig / runs)
    mean_delay_orig = float(delays_orig[slip_mask_orig].mean()) if slip_count_orig else 0.0

    def pct_orig(p):
        return float(np.quantile(delays_orig, p / 100.0, method="nearest"))

    max_delay_orig = int(delays_orig.max()) if runs else 0
    counts_orig = np.bincount(delays_orig, minlength=max_delay_orig + 1)
    delay_histogram_orig = {str(d): float(counts_orig[d] / runs) for d in range(max_delay_orig + 1)}

    original_montecarlo = {
        "runs": runs,
        "baseline_end": date.fromordinal(int(baseline_end)).isoformat(),
        "slip_probability": slip_probability_orig,
        "mean_delay_days_when_slip": mean_delay_orig,
        "percentiles_days": {
            "p50": pct_orig(50),
            "p75": pct_orig(75),
            "p90": pct_orig(90),
            "p99": pct_orig(99),
        },
        "per_task_slip_probability": {k: float(v) for k, v in sim["per_task_probs"].items()},
        "delay_histogram": delay_histogram_orig,
        "critical_index": {k: float(v) for k, v in sim["critical_index"].items()},
        "critical_path": sim.get("critical_path", []),
    }

    return {
        "new_scenario_id": new_s.id,
        "buffer_days": B,
        "achieved_probability": achieved,
        "target_probability": float(payload.target_p) / 100.0,
        "task_details": task_details,
        "original_montecarlo": original_montecarlo,
    }
