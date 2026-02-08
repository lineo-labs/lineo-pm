from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models.task import Task
from backend.schemas.task import TaskCreate, TaskOut, TaskReorder, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    return query.order_by(Task.order_index.asc()).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    max_order = (
        db.query(func.max(Task.order_index))
        .filter(Task.project_id == payload.project_id)
        .scalar()
        or 0
    )
    task = Task(
        project_id=payload.project_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        start_date=payload.start_date,
        end_date=payload.end_date,
        order_index=max_order + 1,
        dependencies=payload.dependencies,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    fields_set = payload.model_fields_set
    if "title" in fields_set:
        task.title = payload.title
    if "project_id" in fields_set:
        task.project_id = payload.project_id
    if "description" in fields_set:
        task.description = payload.description
    if "status" in fields_set:
        task.status = payload.status
    if "start_date" in fields_set:
        task.start_date = payload.start_date
    if "end_date" in fields_set:
        task.end_date = payload.end_date
    if "dependencies" in fields_set:
        task.dependencies = payload.dependencies

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None


@router.post("/reorder", response_model=list[TaskOut])
def reorder_tasks(payload: TaskReorder, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.id.in_(payload.ordered_ids)).all()
    if len(tasks) != len(payload.ordered_ids):
        raise HTTPException(status_code=400, detail="One or more task IDs are invalid")

    task_map = {task.id: task for task in tasks}
    for index, task_id in enumerate(payload.ordered_ids, start=1):
        task_map[task_id].order_index = index

    db.commit()
    ordered_tasks = (
        db.query(Task)
        .filter(Task.id.in_(payload.ordered_ids))
        .order_by(Task.order_index.asc())
        .all()
    )
    return ordered_tasks
