"""Routers for scenario and scenario-task endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models.scenario import Scenario
from src.db.models.scenario_task import ScenarioTask
from src.db.models.task import Task
from src.schemas.scenario import (
    ScenarioCreate,
    ScenarioOut,
    ScenarioUpdate,
    ScenarioTaskCreate,
    ScenarioTaskOut,
    ScenarioTaskUpdate,
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
    # remove dependent scenario tasks first to avoid FK constraint violation
    db.query(ScenarioTask).filter(ScenarioTask.scenario_id == scenario_id).delete(synchronize_session=False)
    db.delete(scenario)
    db.commit()
    return None


@router.get("/{scenario_id}/tasks", response_model=list[ScenarioTaskOut])
def list_scenario_tasks(scenario_id: int, db: Session = Depends(get_db)):
    """List scenario-tasks for a scenario ordered by `order_index`."""
    tasks = (
        db.query(ScenarioTask)
        .filter(ScenarioTask.scenario_id == scenario_id)
        .order_by(ScenarioTask.order_index.asc())
        .all()
    )
    return tasks


@router.post("/{scenario_id}/tasks", response_model=ScenarioTaskOut, status_code=201)
def create_scenario_task(scenario_id: int, payload: ScenarioTaskCreate, db: Session = Depends(get_db)):
    """Create a scenario task and append it at the end of the scenario order."""
    # ensure scenario exists
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # optional task_id must reference an existing Task
    if payload.task_id is not None:
        task_ref = db.query(Task).filter(Task.id == payload.task_id).first()
        if not task_ref:
            raise HTTPException(status_code=400, detail="Referenced task_id is invalid")

    max_order = (
        db.query(func.max(ScenarioTask.order_index))
        .filter(ScenarioTask.scenario_id == scenario_id)
        .scalar()
        or 0
    )

    st = ScenarioTask(
        scenario_id=scenario_id,
        task_id=payload.task_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        start_date=payload.start_date,
        end_date=payload.end_date,
        order_index=max_order + 1,
        dependencies=payload.dependencies,
        overrides=payload.overrides,
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return st


@router.get("/tasks/{task_id}", response_model=ScenarioTaskOut)
def get_scenario_task(task_id: int, db: Session = Depends(get_db)):
    st = db.query(ScenarioTask).filter(ScenarioTask.id == task_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Scenario task not found")
    return st


@router.put("/tasks/{task_id}", response_model=ScenarioTaskOut)
def update_scenario_task(task_id: int, payload: ScenarioTaskUpdate, db: Session = Depends(get_db)):
    st = db.query(ScenarioTask).filter(ScenarioTask.id == task_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Scenario task not found")

    fields_set = payload.model_fields_set
    if "title" in fields_set:
        st.title = payload.title
    if "description" in fields_set:
        st.description = payload.description
    if "status" in fields_set:
        st.status = payload.status
    if "start_date" in fields_set:
        st.start_date = payload.start_date
    if "end_date" in fields_set:
        st.end_date = payload.end_date
    if "order_index" in fields_set:
        st.order_index = payload.order_index
    if "task_id" in fields_set:
        if payload.task_id is not None:
            task_ref = db.query(Task).filter(Task.id == payload.task_id).first()
            if not task_ref:
                raise HTTPException(status_code=400, detail="Referenced task_id is invalid")
        st.task_id = payload.task_id

    if "dependencies" in fields_set:
        # validate that all referenced scenario-task ids exist and belong to same scenario
        new_ids = set(payload.dependencies or [])
        if new_ids:
            tasks_found = db.query(ScenarioTask).filter(ScenarioTask.id.in_(list(new_ids))).all()
            if len(tasks_found) != len(new_ids):
                raise HTTPException(status_code=400, detail="One or more dependency IDs are invalid")
            for t in tasks_found:
                if t.scenario_id != st.scenario_id:
                    raise HTTPException(status_code=400, detail="Dependency scenario-task must belong to the same scenario")
        st.dependencies = payload.dependencies or []

    if "overrides" in fields_set:
        st.overrides = payload.overrides

    db.commit()
    db.refresh(st)
    return st


@router.delete("/tasks/{task_id}", status_code=204)
def delete_scenario_task(task_id: int, db: Session = Depends(get_db)):
    st = db.query(ScenarioTask).filter(ScenarioTask.id == task_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Scenario task not found")
    db.delete(st)
    db.commit()
    return None
