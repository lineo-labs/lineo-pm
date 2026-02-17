"""API router package that aggregates individual endpoint routers."""

from fastapi import APIRouter

from src.routers.milestones import router as milestones_router
from src.routers.project import router as project_router
from src.routers.tasks import router as tasks_router
from src.routers.updates import router as updates_router
from src.routers.relations import router as relations_router

api_router = APIRouter(prefix="/api")
api_router.include_router(milestones_router)
api_router.include_router(project_router)
api_router.include_router(tasks_router)
api_router.include_router(updates_router)
api_router.include_router(relations_router)

__all__ = ["api_router"]
