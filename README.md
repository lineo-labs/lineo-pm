
Lines-PM

Lines-PM — Visual, time-native planning for those responsible for the plan, not the tickets.
A modern, self-hosted open-source project management tool built around an interactive Gantt/timeline view, focused on planning and storytelling, not just executing tasks.


---

Why Lines?

Unlike traditional Kanban tools, Lines is time-first:

Visualize your project at a glance with an interactive timeline

Plan and adjust tasks with drag & drop

Track milestones and project progress as a story

Keep an immutable log of updates for audit and storytelling


Lines is designed for planners, not ticket-doers.


---

Key Features (current)

Projects: create, edit, select

Tasks: create, reorder, edit statuses (todo | in_progress | done)

Milestones: create, edit, drag along the timeline

Interactive Gantt:

Drag & drop scheduling

Auto-zoom based on date range

Inline task editing


Synchronized task list: aligned with Gantt rows

Optimistic UI: instant client-side updates with backend confirmation

Updates: append-only notes attached to the project timeline (immutable)

Seed data: try the app immediately


> ⚠️ Current limitations: Tasks are currently free-moving; automatic dependency propagation is planned for future releases.




---

Screenshots / Demo

(Add at least 1 GIF or screenshot here showing: Gantt + drag, milestones, side panel, updates)


---

Quick Start

1. Clone the repo:



git clone https://github.com/your-org/lines-pm.git
cd lines-pm

2. Start development containers:



docker compose -f docker-compose.dev.yml up -d --build

3. Access the frontend: http://localhost:5173
Backend OpenAPI docs: /docs on the API URL



> Note: Celery is configured for background jobs; the app works without workers running.




---

Technology Stack

Backend: FastAPI, PostgreSQL (async SQLAlchemy), Celery ready

Frontend: React, TypeScript, Tailwind CSS, Vite

Dev / Infra: Docker, docker-compose



---

Roadmap / Upcoming

CSV import/export

Task hierarchies

Gantt UX improvements

Optional AI integrations (plugin-based)

Automatic dependency propagation



---

Contributing

Forks & PRs welcome — prefer small, focused changes.
Follow existing architecture and style (FastAPI backend, React frontend).


---

License

Apache License 3.0


---
