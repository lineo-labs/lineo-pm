from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models.relation import Relation
from src.db.models.task import Task
from src.schemas.relation import RelationOut, RelationCreate, RelationUpdate, PossibleRelationsOut
from src.schemas.task import TaskOut

router = APIRouter(prefix="/relations", tags=["relations"])


@router.get("", response_model=list[RelationOut])
def list_relations(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(Relation)
    if project_id is not None:
        # relations table doesn't store project_id; join to tasks and filter by task.project_id
        query = query.join(Task, Relation.source_task_id == Task.id).filter(Task.project_id == project_id)

    rels = query.order_by(Relation.id_relation.asc()).all()

    # build response objects including project_id (derived from source task)
    out: list[RelationOut] = []
    for r in rels:
        src = db.get(Task, r.source_task_id)
        project_id_val = src.project_id if src is not None else None
        out.append(
            RelationOut(
                id_relation=r.id_relation,
                project_id=project_id_val,
                source_task_id=r.source_task_id,
                destination_task_id=r.destination_task_id,
                relation_type=r.relation_type,
            )
        )
    return out


@router.post("", response_model=RelationOut, status_code=201)
def create_relation(payload: RelationCreate, db: Session = Depends(get_db)):
    if payload.relation_type != "FS":
        raise HTTPException(status_code=400, detail="Only 'FS' relation_type is supported")

    # validate tasks exist and belong to the same project
    task_ids = [payload.source_task_id, payload.destination_task_id]
    tasks = db.query(Task).filter(Task.id.in_(task_ids)).all()
    if len(tasks) != 2:
        raise HTTPException(status_code=400, detail="One or more task IDs are invalid")
    for t in tasks:
        if t.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Tasks must belong to the given project")

    rel = Relation(
        source_task_id=payload.source_task_id,
        destination_task_id=payload.destination_task_id,
        relation_type=payload.relation_type,
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)

    src = db.get(Task, rel.source_task_id)
    project_id_val = src.project_id if src is not None else None
    return RelationOut(
        id_relation=rel.id_relation,
        project_id=project_id_val,
        source_task_id=rel.source_task_id,
        destination_task_id=rel.destination_task_id,
        relation_type=rel.relation_type,
    )


@router.put("/{id_relation}", response_model=RelationOut)
def update_relation(id_relation: int, payload: RelationUpdate, db: Session = Depends(get_db)):
    rel = db.query(Relation).filter(Relation.id_relation == id_relation).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")

    fields_set = payload.model_fields_set
    if "source_task_id" in fields_set:
        rel.source_task_id = payload.source_task_id
    if "destination_task_id" in fields_set:
        rel.destination_task_id = payload.destination_task_id
    if "relation_type" in fields_set:
        if payload.relation_type != "FS":
            raise HTTPException(status_code=400, detail="Only 'FS' relation_type is supported")
        rel.relation_type = payload.relation_type

    # if task ids or project changed, validate consistency
    task_ids = [rel.source_task_id, rel.destination_task_id]
    tasks = db.query(Task).filter(Task.id.in_(task_ids)).all()
    if len(tasks) != 2:
        raise HTTPException(status_code=400, detail="One or more task IDs are invalid")
    for t in tasks:
        # ensure tasks belong to the same project as each other
        if t.project_id != tasks[0].project_id:
            raise HTTPException(status_code=400, detail="Tasks must belong to the given project")

    db.commit()
    db.refresh(rel)

    src = db.get(Task, rel.source_task_id)
    project_id_val = src.project_id if src is not None else None
    return RelationOut(
        id_relation=rel.id_relation,
        project_id=project_id_val,
        source_task_id=rel.source_task_id,
        destination_task_id=rel.destination_task_id,
        relation_type=rel.relation_type,
    )



@router.delete("/{id_relation}", status_code=204)
def delete_relation(id_relation: int, db: Session = Depends(get_db)):
    rel = db.query(Relation).filter(Relation.id_relation == id_relation).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")
    db.delete(rel)
    db.commit()
    return None


def _build_adjacency(task_ids: list[int], rels: list[Relation]) -> dict[int, list[int]]:
    adj: dict[int, list[int]] = {tid: [] for tid in task_ids}
    for r in rels:
        if r.source_task_id in adj:
            adj[r.source_task_id].append(r.destination_task_id)
    return adj


def _dfs(start: int, adj: dict[int, list[int]]) -> set[int]:
    seen = set()
    stack = [start]
    while stack:
        node = stack.pop()
        for nb in adj.get(node, []):
            if nb not in seen:
                seen.add(nb)
                stack.append(nb)
    return seen


@router.get("/possible", response_model=PossibleRelationsOut)
def possible_dependencies(
    task_id: int | None = Query(default=None),
    direction: str = Query(default="predecessors"),
    db: Session = Depends(get_db),
):
    """Return tasks in the same project that can be linked to `task_id`.

    NOTE: this endpoint returns only candidates that can be linked as
    predecessors (i.e. candidate -> task_id) in the `possible` list.

    The `active` list contains only existing relations where the
    destination is `task_id` (i.e. active predecessors -> task_id).

    The endpoint excludes:
    - the task itself
    - already existing relations in the same direction
    - relations that would create direct inverse duplicates
    - relations that would create cycles
    """
    if task_id is None:
        raise HTTPException(status_code=400, detail="task_id is required")

    if direction not in ("predecessors", "successors", "both"):
        raise HTTPException(status_code=400, detail="invalid direction")

    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project_id = task.project_id
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    task_ids = [t.id for t in tasks]

    # load relations within project
    rels = (
        db.query(Relation)
        .filter(Relation.source_task_id.in_(task_ids))
        .filter(Relation.destination_task_id.in_(task_ids))
        .all()
    )

    """API routes for managing relations between tasks.

    Provides endpoints to list, create, update and delete task relations and
    to compute possible dependency candidates.
    """
    adj = _build_adjacency(task_ids, rels)
    # reverse adjacency for computing nodes that can reach a node
    rev_adj: dict[int, list[int]] = {tid: [] for tid in task_ids}
    for src, dests in adj.items():
        for d in dests:
            rev_adj[d].append(src)

    reachable_from_task = _dfs(task_id, adj)
    nodes_reaching_task = _dfs(task_id, rev_adj)

    existing_sources_to_task = {r.source_task_id for r in rels if r.destination_task_id == task_id}
    existing_dest_from_task = {r.destination_task_id for r in rels if r.source_task_id == task_id}

    out: list[TaskOut] = []
    for cand in tasks:
        if cand.id == task_id:
            continue

        # Only include candidates that are allowed to be predecessors
        # (candidate -> task_id). We intentionally ignore successor
        # candidacy here — the frontend expects predecessors only.
        allowed_as_pred = True
        if cand.id in existing_sources_to_task:
            allowed_as_pred = False
        if cand.id in reachable_from_task:
            allowed_as_pred = False
        if cand.id in existing_dest_from_task:
            allowed_as_pred = False

        if allowed_as_pred:
            out.append(
                TaskOut(
                    id=cand.id,
                    project_id=cand.project_id,
                    title=cand.title,
                    description=cand.description,
                    status=cand.status,
                    start_date=cand.start_date,
                    end_date=cand.end_date,
                    dependencies=cand.dependencies,
                    order_index=cand.order_index,
                )
            )

    # build active relations list: only relations that are predecessors
    # to the given task (source -> task_id)
    active: list[RelationOut] = []
    for r in rels:
        if r.destination_task_id != task_id:
            continue
        src = db.get(Task, r.source_task_id)
        project_id_val = src.project_id if src is not None else None
        active.append(
            RelationOut(
                id_relation=r.id_relation,
                project_id=project_id_val,
                source_task_id=r.source_task_id,
                destination_task_id=r.destination_task_id,
                relation_type=r.relation_type,
            )
        )

    return PossibleRelationsOut(possible=out, active=active)
