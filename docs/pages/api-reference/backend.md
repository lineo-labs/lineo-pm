# Backend API Reference

## Overview

The Lineo-PM backend exposes a RESTful JSON API built with [FastAPI](https://fastapi.tiangolo.com/). All endpoints accept and return JSON. Authentication and authorization configuration depends on your deployment setup.

## Interactive Documentation

FastAPI generates live, interactive API documentation automatically from the codebase. When the backend is running, you can explore and test all endpoints directly in the browser:

| Format | URL |
|---|---|
| **Swagger UI** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **ReDoc** | [http://localhost:8000/redoc](http://localhost:8000/redoc) |
| **OpenAPI JSON** | [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json) |

The Swagger UI is the recommended starting point for exploring the API — it allows you to inspect request/response schemas and execute requests with live data.

## Endpoint Groups

| Group | Base Path | Description |
|---|---|---|
| **Projects** | `/projects` | Create, read, update, and delete projects; list all projects |
| **Tasks** | `/tasks` | Manage tasks within a project; update dates, durations, and risk levels |
| **Milestones** | `/milestones` | Create and manage milestone markers within a project |
| **Scenarios** | `/scenarios` | Create scenarios, clone from baseline, switch active scenario, promote to baseline |
| **Simulations** | `/simulations` | Trigger Monte Carlo simulation jobs; retrieve results and per-task statistics |
| **Relations** | `/relations` | Define and remove task-to-task dependency relationships (finish-to-start) |
| **Updates** | `/updates` | Add, edit, and retrieve narrative update entries for projects and scenarios |

## Request and Response Format

All request bodies and responses use `application/json`. Timestamps follow ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`). Dates (for task and milestone scheduling) use the `YYYY-MM-DD` format.

## Error Responses

The API returns standard HTTP status codes:

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (validation error) |
| `404` | Resource not found |
| `422` | Unprocessable entity (Pydantic validation failure) |
| `500` | Internal server error |

Error responses include a JSON body with a `detail` field describing the error.
