from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import SessionLocal, init_db
from backend.routers import api_router
from backend.seed import ensure_default_project, ensure_sample_tasks, ensure_sample_updates

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
	return {"status": "ok"}


@app.on_event("startup")
def on_startup():
	init_db()
	db = SessionLocal()
	try:
		project = ensure_default_project(db)
		tasks = ensure_sample_tasks(db, project.id)
		ensure_sample_updates(db, project.id, tasks)
	finally:
		db.close()
