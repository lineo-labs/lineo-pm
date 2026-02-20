<div align="center">

<p align="center">
    <img src="frontend/src/assets/logo.png" width="160" alt="lineo logo" />
<p>


<h1 align="center">Open Source Decision-Driven Planning Engine</h1>

![Demo](docs/demo-preview.gif)

</div>

## What is lineo?

**Lineo-PM** is not a task manager, but a modern decision-engine tool built around **dependencies propagation** and **scenario planning**.

It helps you to answer questions:
> what happens if I move this?
> what if plan B is needed?

The GIF above shows the core interaction: dragging a task to a new date automatically updates all dependent tasks, allowing you to instantly see the impact of your decision.

The idea is simple: **Move activities. Change dependencies. Instantly see the impact.**

Lineo helps you understand **how decisions affect time**.

Hover over a task to highlight its dependency chain and immediately visualize project dynamics.

---

## What are scenarios?

Scenarios are persistent alternative project timelines that you can create, modify, and compare with actual baselines. They allow you to model different "what if" situations without affecting your main plan. You can save multiple scenarios, each representing a different set of assumptions or decisions, and easily switch between them to analyze their impacts. **Planning becomes a measurable decision process.**

You can promote a scenario to become the new baseline, or keep it as a reference for future planning. This way, you can explore various options and make informed decisions based on how they affect your project timeline.

---

## Why lineo?

Most project tools focus on task tracking, gamification, or Kanban workflows.

Lineo focuses on **decision support**.

It is **time-first**, not board-first.

With lineo you can:

* Visualize the entire project timeline at a glance
* Adjust schedules using intuitive drag & drop
* Understand milestone impact instantly
* Track progress as a coherent timeline story
* Maintain update logs for audit and reporting

Instead of managing tasks, you manage **project flow**.

---

## Designed For:

* Project managers
* Founders
* CTOs
* Executives
* Product Leaders

People who need to:

* Replan under pressure
* Explain delays
* Model impacts before making decisions
* Tell the story of a project

## Key Features (Current)

* Interactive Gantt charts with drag-and-drop scheduling
* Cascading dependency propagation
* No spaghetti lineo - (lock higlighting)
* Time-first UX
* Narrative Updates
* Decision impact modeling

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/lineo-pm.git
cd lineo-pm
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

> Other features and improvements will be added based on user feedback and contributions. Order of implementation may change.

---

## Contributing

Contributions are welcome.

* Prefer small, focused pull requests
* Follow the existing architecture:

  * FastAPI backend
  * PostgreSQL database
  * React frontend
  
* Keep changes consistent with the project style

## Branches:

* `main`: Stable production-ready code
* `dev`: Active development branch (new features, bug fixes)

## Workflow:
1. All contributions must be made against the `dev` branch
2. Create a new branch for your feature or bug fix (e.g. `feature/new-feature` or `bugfix/issue-123`)
3. Open a pull request against `dev` with a clear description of your changes
4. PRs will be reviewed and merged into `dev` after approval
5. Periodically, `dev` will be merged into `main` for stable releases
---

## License

Apache License 2.0
