"""Routers for scenario and scenario-task endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
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
    # remove dependent tasks first to avoid FK constraint violation
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
