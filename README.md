# lines-pm

**lines-pm** is a fast, timeline-first, open-source project management tool.

It focuses on **project planning through an interactive Gantt view**, with a simple and extensible architecture.
AI features are **optional** and can be added later without affecting the core system.

lines-pm is **fully usable without AI**.

---

## Features

* Project and task management
* Interactive Gantt chart

  * Auto-zoom (days / weeks depending on date range)
  * Drag & drop task scheduling
  * Inline task editing
* Task list aligned with Gantt rows
* Fast, React-based UI
* FastAPI backend with PostgreSQL
* Docker-based local setup
* Minimal, extensible data model

---

## Philosophy

* **Performance-first**
* **Simple core, extensible design**
* **Timeline-driven planning**
* **AI optional and non-intrusive**

AI, RAG, and automation are **enhancements, not requirements**.
Even without AI, lines-pm remains fully functional.

---

## Tech Stack

### Backend

* FastAPI
* PostgreSQL
* Celery (ready for background tasks)

### Frontend

* React
* Custom Gantt implementation

### Infrastructure

* Docker
* Docker Compose

---

## Data Model (v0.1)

Currently, lines-pm uses two main entities:

* **Project**
* **Task**

This minimal model enables:

* Gantt visualization
* Task scheduling
* Future extensions (task hierarchy, milestones, AI, imports)

The schema may evolve while keeping backward compatibility where possible.

---

## Getting Started

### Requirements

* Docker
* Docker Compose

### Run locally

```bash
docker compose up
```

After startup:

* Backend API is available via **FastAPI**
* Frontend UI can be accessed in the browser

No further configuration is needed for the default setup.

---

## API

The backend exposes a **REST API** via FastAPI.

Once running, OpenAPI documentation is available at:

```
/docs
```

The API is first-class and designed to support:

* UI
* Automations
* Future AI integrations

---

## Project Status

This is an **early public release (v0.1.0)**.

* Core features are stable
* API and data model may evolve
* Authentication, multi-user support, and AI features are not included yet

Current focus:

* Core UX
* Performance
* Clear, extensible architecture

---

## Roadmap (High-level)

Planned improvements include:

* CSV export and import
* Task hierarchy
* Optional AI-assisted task generation
* File import (CSV, Excel, PDF, TXT)
* Background processing via Celery

All features will remain **optional and modular**.

---

## License

This project is released under the **Apache License 2.0**.

---

## Contributing

Contributions are welcome.

At this stage:

* Keep changes focused and minimal
* Prefer simplicity over abstraction
* Follow existing architectural patterns

More contribution guidelines will be added as the project evolves.
