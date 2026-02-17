<div align="center">

<p align="center">
    <img src="frontend/src/assets/logo.png"/>
<p>


<h1 align="center">Open Source Decision-Driven Project Management</h1>

![Demo](docs/demo-preview.gif)

</div>
---

## What is Lines?

**Lines-PM** is a modern open-source project management tool built around **interactive Gantt charts** and **decision-driven planning**.

It is designed for **Project Managers, founders, and executives** who need to **understand and manipulate project timelines visually**, without getting lost in task micro-management.

The core idea is simple:

> Move activities. Change dependencies. Instantly see the impact.

Lines helps you understand **how decisions affect time**.

Hover over a task to highlight its dependency chain and immediately visualize project dynamics.

---

## Why Lines?

Most project tools focus on task tracking, gamification, or Kanban workflows.

Lines focuses on **decision support**.

It is **time-first**, not board-first.

With Lines you can:

* Visualize the entire project timeline at a glance
* Adjust schedules using intuitive drag & drop
* Understand milestone impact instantly
* Track progress as a coherent timeline story
* Maintain update logs for audit and reporting

Instead of managing tasks, you manage **project flow**.

---

## Key Features (Current)

### Projects

* Create, edit, and switch between projects

### Tasks

* Create and reorder tasks
* Edit status (`todo | in_progress | done`)
* Inline editing inside the Gantt

### Milestones

* Create, edit, and drag directly on the timeline

### Interactive Gantt Chart

* Drag & drop scheduling
* Automatic dependency propagation
* Auto-zoom based on date range
* Inline editing
* Dependency chain highlighting on hover

### Synchronized Task List

* Task list always aligned with Gantt rows

### Optimistic UI

* Instant client-side updates with backend confirmation

### Project Updates

* Timeline-based notes attached to projects

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/lines-pm.git
cd lines-pm
```

### 2. Start development containers

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### 3. Access the application

Frontend:
[http://localhost:5173](http://localhost:5173)

Backend OpenAPI docs:
`/docs` on the API URL

> Note: Celery is configured for background jobs. The application works even if workers are not running.

---

## Technology Stack

**Backend**

* FastAPI
* PostgreSQL (async SQLAlchemy)
* Celery (background jobs ready)

**Frontend**

* React
* TypeScript
* Tailwind CSS
* Vite

**Infrastructure**

* Docker
* Docker Compose

---

## Roadmap

* [ ] CSV import
* [ ] PDF export
* [ ] Baseline drafting and comparison
* [ ] Cross-project Gantt view
* [ ] User authentication & permissions
* [ ] Shared project views (collaboration / view-only mode)
* [ ] Optional AI Assistant (Jarvis-style) for:

  * Auto-suggest task durations
  * Generate project summaries
  * Intelligent CSV/Excel import
  * Natural language queries (e.g. "Show me all tasks delayed by more than 2 days")
  * Predictive analytics (e.g. "What happens if we delay Task X by 3 days?")
  * Bottleneck identification (e.g. "Which tasks are most likely to cause delays?")

> Other features and improvements will be added based on user feedback and contributions.

---

## Contributing

Contributions are welcome.

* Prefer small, focused pull requests
* Follow the existing architecture:

  * FastAPI backend
  * React frontend
* Keep changes consistent with the project style

---

## License

Apache License 2.0
