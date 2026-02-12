from fastapi import APIRouter

from backend.routers.milestones import router as milestones_router
from backend.routers.project import router as project_router
from backend.routers.tasks import router as tasks_router
from backend.routers.updates import router as updates_router

api_router = APIRouter(prefix="/api")
api_router.include_router(milestones_router)
api_router.include_router(project_router)
api_router.include_router(tasks_router)
api_router.include_router(updates_router)

__all__ = ["api_router"]
