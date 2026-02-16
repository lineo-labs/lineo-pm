"""Task-related API routes and date propagation helpers.

Includes endpoints to list, create, update, delete and reorder tasks. Date
propagation logic ensures successor tasks respect finish-to-start relations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
import csv
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models.task import Task
from backend.db.models.relation import Relation
from collections import deque
from backend.schemas.task import TaskCreate, TaskOut, TaskReorder, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """List tasks, optionally filtered by project.

    Args:
        project_id (int | None): Optional project id to filter tasks.
        db (Session): Database session provided by dependency.

    Returns:
        list[Task]: Ordered list of tasks for the (optional) project.
    """
    query = db.query(Task)
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    tasks = query.order_by(Task.order_index.asc()).all()

    # include relations as dependencies in the returned Task objects so frontend
    # sees relations created via the relations endpoints as task.dependencies
    if tasks:
        task_ids = [t.id for t in tasks]
        rels = (
            db.query(Relation)
            .filter(Relation.destination_task_id.in_(task_ids))
            .all()
        )
        rel_map: dict[int, list[int]] = {}
        for r in rels:
            rel_map.setdefault(r.destination_task_id, []).append(r.source_task_id)

        for t in tasks:
            existing = set(t.dependencies or [])
            from_rels = set(rel_map.get(t.id, []))
            merged = sorted(existing.union(from_rels))
            t.dependencies = merged

    return tasks




@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task within a project.

    Args:
        payload (TaskCreate): Pydantic payload with task data.
        db (Session): Database session provided by dependency.

    Returns:
        Task: The created task.
    """

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
    """Create a new task within a project.

    Args:
        payload (TaskCreate): Pydantic payload with task data.
        db (Session): Database session provided by dependency.

    Returns:
        Task: The created task.
    """


@router.put("/{task_id}", response_model=list[TaskOut])
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task and propagate date changes to successors if needed.

    Args:
        task_id (int): ID of the task to update.
        payload (TaskUpdate): Pydantic payload with updated fields.
        db (Session): Database session provided by dependency.

    Returns:
        list[Task]: List of updated tasks after propagation.
    """
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
        # update JSON column
        task.dependencies = payload.dependencies
        # synchronize Relation rows: dependencies list are predecessor task ids
        # remove existing predecessor relations for this task that are not in the new list
        existing_rels = (
            db.query(Relation)
            .filter(Relation.destination_task_id == task.id)
            .all()
        )
        existing_src_ids = {r.source_task_id for r in existing_rels}
        new_src_ids = set(payload.dependencies or [])

        # delete relations that are no longer present
        for r in existing_rels:
            if r.source_task_id not in new_src_ids:
                db.delete(r)

        # validate candidate source tasks exist and belong to same project
        if new_src_ids:
            tasks_for_src = db.query(Task).filter(Task.id.in_(list(new_src_ids))).all()
            if len(tasks_for_src) != len(new_src_ids):
                raise HTTPException(status_code=400, detail="One or more dependency task IDs are invalid")
            for t_src in tasks_for_src:
                if t_src.project_id != task.project_id:
                    raise HTTPException(status_code=400, detail="Dependency tasks must belong to the same project")

        # create missing relations
        for src_id in new_src_ids - existing_src_ids:
            rel = Relation(source_task_id=src_id, destination_task_id=task.id, relation_type="FS")
            db.add(rel)

    # commit the direct update first
    db.commit()
    db.refresh(task)

    updated_ids: list[int] = [task.id]

    # if dates changed, propagate to related tasks (finish-to-start 'FS')
    if "start_date" in fields_set or "end_date" in fields_set:
        propagated = _propagate_date_changes([task.id], db)
        # include origin task as updated
        updated_ids = list({*updated_ids, *propagated})

    db.refresh(task)

    # return full list of updated tasks
    updated_tasks = (
        db.query(Task)
        .filter(Task.id.in_(updated_ids))
        .order_by(Task.order_index.asc())
        .all()
    )
    return updated_tasks




def _propagate_date_changes(changed_task_ids: list[int], db: Session):
    """Propagate date changes from given tasks to successors via relations.

    Rules implemented (supported relation types):
    - 'FS' (finish-to-start): successor.start_date must be >= predecessor.end_date

    The propagation is breadth-first and will shift successors forward preserving their duration.
    A safety limit prevents infinite loops / cycles from causing runaway updates.
    """
    if not changed_task_ids:
        return

    # load all tasks in the same project(s) as changed tasks
    # collect affected project ids
    changed_tasks = db.query(Task).filter(Task.id.in_(changed_task_ids)).all()
    project_ids = {t.project_id for t in changed_tasks}

    # nothing to do if no matching changed tasks were found
    if not project_ids:
        return

    tasks = db.query(Task).filter(Task.project_id.in_(list(project_ids))).all()
    task_map: dict[int, Task] = {t.id: t for t in tasks}

    # load relations inside the project(s)
    rels = (
        db.query(Relation)
        .filter(Relation.source_task_id.in_(list(task_map.keys())))
        .filter(Relation.destination_task_id.in_(list(task_map.keys())))
        .all()
    )

    rel_map: dict[int, list[tuple[int, str]]] = {}
    for r in rels:
        rel_map.setdefault(r.source_task_id, []).append((r.destination_task_id, r.relation_type))

    # BFS queue seeded with changed tasks
    q = deque(changed_task_ids)
    # track how many times we've updated a specific task to detect cycles
    update_counts: dict[int, int] = {}
    MAX_UPDATES_PER_TASK = 10
    MAX_ITERATIONS = 10000
    iterations = 0

    updated_set: set[int] = set(changed_task_ids)

    while q and iterations < MAX_ITERATIONS:
        iterations += 1
        src_id = q.popleft()
        src_task = task_map.get(src_id)
        if src_task is None:
            continue

        for dest_id, rel_type in rel_map.get(src_id, []):
            dest_task = task_map.get(dest_id)
            if dest_task is None:
                continue

            if str(rel_type).lower() == "fs":
                # require concrete dates to compare/shift
                if src_task.end_date is None or dest_task.start_date is None or dest_task.end_date is None:
                    continue

                required_start = src_task.end_date
                if dest_task.start_date < required_start:
                    # preserve duration
                    duration = dest_task.end_date - dest_task.start_date
                    dest_task.start_date = required_start
                    dest_task.end_date = required_start + duration
                    db.add(dest_task)
                    # count updates for safety
                    update_counts[dest_id] = update_counts.get(dest_id, 0) + 1
                    updated_set.add(dest_id)
                    if update_counts[dest_id] > MAX_UPDATES_PER_TASK:
                        # abort propagation to avoid infinite loops
                        raise HTTPException(status_code=400, detail=f"Cycle or excessive updates detected while propagating dates (task {dest_id})")
                    # enqueue successor to propagate further
                    q.append(dest_id)
            else:
                # unknown relation type: ignore for now
                continue

    if iterations >= MAX_ITERATIONS:
        raise HTTPException(status_code=400, detail="Exceeded maximum propagation iterations (possible cycle)")

    # persist all adjusted tasks
    db.commit()
    return list(updated_set)




@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task by ID.

    Args:
        task_id (int): ID of the task to delete.
        db (Session): Database session provided by dependency.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None




@router.post("/reorder", response_model=list[TaskOut])
def reorder_tasks(payload: TaskReorder, db: Session = Depends(get_db)):
    """Reorder tasks according to `payload.ordered_ids`.

    Args:
        payload (TaskReorder): Payload containing the new order of task IDs.
        db (Session): Database session provided by dependency.

    Returns:
        list[Task]: Tasks in their new order.
    """
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


@router.get("/export")
def export_tasks_csv(project_id: int = Query(...), db: Session = Depends(get_db)):
    """Export tasks for a project as CSV.

    Args:
        project_id (int): Project ID to export tasks for.
        db (Session): Database session.

    Returns:
        StreamingResponse: CSV file download response.
    """
    tasks = (
        db.query(Task)
        .filter(Task.project_id == project_id)
        .order_by(Task.order_index.asc())
        .all()
    )

    # include relations as dependencies (same logic as list_tasks)
    if tasks:
        task_ids = [t.id for t in tasks]
        rels = (
            db.query(Relation)
            .filter(Relation.destination_task_id.in_(task_ids))
            .all()
        )
        rel_map: dict[int, list[int]] = {}
        for r in rels:
            rel_map.setdefault(r.destination_task_id, []).append(r.source_task_id)

        for t in tasks:
            existing = set(t.dependencies or [])
            from_rels = set(rel_map.get(t.id, []))
            merged = sorted(existing.union(from_rels))
            t.dependencies = merged

    si = io.StringIO()
    writer = csv.writer(si, delimiter=';')
    writer.writerow(["id", "title", "description", "status", "start_date", "end_date", "order_index", "dependencies"])
    for t in tasks:
        deps = "|".join(map(str, t.dependencies or []))
        writer.writerow([
            t.id,
            t.title or "",
            t.description or "",
            t.status or "",
            t.start_date.isoformat() if t.start_date else "",
            t.end_date.isoformat() if t.end_date else "",
            t.order_index or "",
            deps,
        ])

    si.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="project_{project_id}_tasks.csv"'}
    return StreamingResponse(iter([si.getvalue()]), media_type="text/csv", headers=headers)

