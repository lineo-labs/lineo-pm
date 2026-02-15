"""FastAPI application bootstrap and startup tasks for Lines PM backend.

This module configures the FastAPI app, CORS middleware and registers
startup actions used to initialise the database and seed sample data.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import SessionLocal, init_db
from backend.routers import api_router
from backend.seed import (
	ensure_default_project,
	ensure_sample_milestones,
	ensure_sample_tasks,
	ensure_sample_updates,
)


app = FastAPI(title="Lines PM Backend")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=False,
	allow_methods=["*"],
	allow_headers=["*"],
)
app.include_router(api_router)


@app.get("/health")
def health_check():
    """Return a simple health status.

    Returns:
        dict: A dictionary with a `status` key indicating service health.
    """
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    """Initialise the database and seed default/sample data.

    This function runs on application startup. It initialises the database
    schema and ensures a default project and sample milestones, tasks and
    updates exist for development/testing purposes.
    """
    init_db()
    db = SessionLocal()
    try:
        project = ensure_default_project(db)
        tasks = ensure_sample_tasks(db, project.id)
        ensure_sample_updates(db, project.id, tasks)
        ensure_sample_milestones(db, project.id)
    finally:
        db.close()
