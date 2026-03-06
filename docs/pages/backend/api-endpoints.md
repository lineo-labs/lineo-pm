# Backend API Endpoints

Complete reference of all REST API endpoints available in the Lineo PM backend.

## Base URL

```
http://localhost:8000/api
```

## Authentication

*(Authentication implementation details if applicable)*

Currently endpoints are open. Add authentication headers if implemented:
```
Authorization: Bearer <token>
```

## Response Format

### Success Response (2xx)

```json
{
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response (4xx, 5xx)

```json
{
  "detail": "Error description",
  "error_code": "ERROR_CODE"
}
```

---

## Projects Endpoints

### List All Projects

```
GET /projects
```

**Query Parameters**:
- `skip` (int): Number of projects to skip (pagination)
- `limit` (int): Maximum projects to return (default: 10)

**Response** (200):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q2 Planning",
    "description": "Second quarter project planning",
    "start_date": "2025-04-01",
    "end_date": "2025-06-30",
    "status": "ACTIVE",
    "created_at": "2025-03-05T10:00:00Z",
    "updated_at": "2025-03-05T10:00:00Z"
  }
]
```

---

### Get Project Details

```
GET /projects/{project_id}
```

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q2 Planning",
  "description": "Second quarter project planning",
  "start_date": "2025-04-01",
  "end_date": "2025-06-30",
  "status": "ACTIVE",
  "created_at": "2025-03-05T10:00:00Z",
  "updated_at": "2025-03-05T10:00:00Z"
}
```

**Errors**:
- 404: Project not found

---

### Create Project

```
POST /projects
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Q2 Planning",
  "description": "Second quarter project planning",
  "start_date": "2025-04-01",
  "end_date": "2025-06-30"
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q2 Planning",
  "description": "Second quarter project planning",
  "start_date": "2025-04-01",
  "end_date": "2025-06-30",
  "status": "PLANNING",
  "created_at": "2025-03-05T10:00:00Z",
  "updated_at": "2025-03-05T10:00:00Z"
}
```

**Validation Errors** (422):
- `name`: Required, max 255 characters
- `start_date`: Must be before `end_date`
- `end_date`: Required
- Duplicate project names

---

### Update Project

```
PUT /projects/{project_id}
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Q2 Strategic Planning",
  "description": "Updated description",
  "start_date": "2025-04-01",
  "end_date": "2025-07-15"
}
```

**Response** (200): Updated project object

**Errors**:
- 404: Project not found
- 422: Validation error

---

### Delete Project

```
DELETE /projects/{project_id}
```

**Response** (204): No content

**Errors**:
- 404: Project not found

---

## Tasks Endpoints

### List Project Tasks

```
GET /projects/{project_id}/tasks
```

**Query Parameters**:
- `skip` (int): Pagination offset
- `limit` (int): Max results (default: 10)
- `status` (string): Filter by status (TODO, IN_PROGRESS, DONE)
- `priority` (string): Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)

**Response** (200):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Design API",
    "description": "Design REST API structure",
    "start_date": "2025-03-10",
    "due_date": "2025-03-20",
    "duration_days": 10,
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "assigned_to": "john@example.com",
    "parent_task_id": null,
    "progress": 50,
    "created_at": "2025-03-05T10:00:00Z",
    "updated_at": "2025-03-05T10:00:00Z"
  }
]
```

---

### Create Task

```
POST /projects/{project_id}/tasks
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Design API",
  "description": "Design REST API structure",
  "start_date": "2025-03-10",
  "due_date": "2025-03-20",
  "priority": "HIGH",
  "assigned_to": "john@example.com"
}
```

**Response** (201): Created task object

**Validation**:
- `name`: Required, max 255 characters
- `start_date` < `due_date`

---

### Get Task Details

```
GET /projects/{project_id}/tasks/{task_id}
```

**Response** (200): Task object with expanded dependencies

**Errors**:
- 404: Task not found

---

### Update Task

```
PUT /projects/{project_id}/tasks/{task_id}
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Design REST API",
  "description": "Design complete REST API",
  "priority": "CRITICAL",
  "progress": 75
}
```

**Response** (200): Updated task object

---

### Update Task Status

```
PATCH /projects/{project_id}/tasks/{task_id}/status
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```

**Values**: `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`

**Response** (200): Updated task object

---

### Delete Task

```
DELETE /projects/{project_id}/tasks/{task_id}
```

**Response** (204): No content

---

### Add Task Dependency

```
POST /projects/{project_id}/tasks/{task_id}/dependencies
Content-Type: application/json
```

**Request Body**:
```json
{
  "depends_on_id": "550e8400-e29b-41d4-a716-446655440002",
  "dependency_type": "FINISH_TO_START",
  "lag_days": 0
}
```

**Valid Dependency Types**:
- `FINISH_TO_START`: Task starts after predecessor finishes
- `START_TO_START`: Tasks start simultaneously
- `FINISH_TO_FINISH`: Tasks finish simultaneously

**Response** (201): Dependency object

---

### Get Task Dependencies

```
GET /projects/{project_id}/tasks/{task_id}/dependencies
```

**Response** (200):
```json
{
  "dependencies": [...],
  "dependents": [...]
}
```

---

### Remove Task Dependency

```
DELETE /projects/{project_id}/tasks/{task_id}/dependencies/{dependency_id}
```

**Response** (204): No content

---

## Milestones Endpoints

### List Project Milestones

```
GET /projects/{project_id}/milestones
```

**Response** (200):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Beta Release",
    "description": "Beta version release",
    "target_date": "2025-06-15",
    "status": "NOT_STARTED",
    "order": 1,
    "created_at": "2025-03-05T10:00:00Z",
    "updated_at": "2025-03-05T10:00:00Z"
  }
]
```

---

### Create Milestone

```
POST /projects/{project_id}/milestones
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Beta Release",
  "description": "Beta version release to testers",
  "target_date": "2025-06-15"
}
```

**Response** (201): Created milestone object

---

### Update Milestone

```
PUT /projects/{project_id}/milestones/{milestone_id}
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Public Beta Release",
  "status": "IN_PROGRESS",
  "target_date": "2025-06-20"
}
```

**Response** (200): Updated milestone object

---

### Delete Milestone

```
DELETE /projects/{project_id}/milestones/{milestone_id}
```

**Response** (204): No content

---

## Scenarios Endpoints

### List Project Scenarios

```
GET /projects/{project_id}/scenarios
```

**Response** (200):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Realistic Timeline",
    "case": "REALISTIC",
    "description": "Standard project timeline",
    "created_at": "2025-03-05T10:00:00Z",
    "updated_at": "2025-03-05T10:00:00Z"
  }
]
```

---

### Create Scenario

```
POST /projects/{project_id}/scenarios
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Aggressive Timeline",
  "case": "OPTIMISTIC",
  "description": "Accelerated project delivery"
}
```

**Valid Cases**: `OPTIMISTIC`, `REALISTIC`, `PESSIMISTIC`

**Response** (201): Created scenario object

---

### Update Scenario

```
PUT /projects/{project_id}/scenarios/{scenario_id}
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Fast Track",
  "description": "Updated description"
}
```

**Response** (200): Updated scenario object

---

### Delete Scenario

```
DELETE /projects/{project_id}/scenarios/{scenario_id}
```

**Response** (204): No content

---

## Simulations Endpoints

### Run Monte Carlo Simulation

```
POST /projects/{project_id}/simulations
Content-Type: application/json
```

**Request Body**:
```json
{
  "iterations": 10000,
  "confidence_level": 0.95,
  "task_ids": ["task-1", "task-2"]
}
```

**Parameters**:
- `iterations` (int): Number of simulations (1000-100000)
- `confidence_level` (float): Confidence interval (0.0-1.0, typically 0.95)
- `task_ids` (array, optional): Specific tasks to simulate (all if omitted)

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "iterations": 10000,
  "mean_duration": 45.5,
  "std_deviation": 3.2,
  "min_duration": 38,
  "max_duration": 58,
  "percentile_50": 45,
  "percentile_75": 48,
  "percentile_95": 52,
  "confidence_level": 0.95,
  "confidence_range": [42, 52],
  "created_at": "2025-03-05T10:15:00Z"
}
```

---

### Get Simulation Results

```
GET /projects/{project_id}/simulations/{simulation_id}
```

**Response** (200): Simulation results object

**Errors**:
- 404: Simulation not found

---

### List Project Simulations

```
GET /projects/{project_id}/simulations
```

**Query Parameters**:
- `limit` (int): Max results

**Response** (200): Array of simulation results (most recent first)

---

## Updates (Audit Trail) Endpoints

### Get Project Update History

```
GET /projects/{project_id}/updates
```

**Query Parameters**:
- `skip` (int): Pagination offset
- `limit` (int): Max results
- `entity_type` (string): Filter (PROJECT, TASK, MILESTONE)

**Response** (200):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440040",
    "entity_type": "TASK",
    "entity_id": "550e8400-e29b-41d4-a716-446655440001",
    "field_name": "status",
    "old_value": "TODO",
    "new_value": "IN_PROGRESS",
    "changed_by": "john@example.com",
    "created_at": "2025-03-05T11:30:00Z"
  }
]
```

---

### Get Task Update History

```
GET /projects/{project_id}/tasks/{task_id}/updates
```

**Response** (200): Array of update log entries for task

---

## System Endpoints

### Health Check

```
GET /health
```

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-03-05T10:00:00Z"
}
```

---

### API Documentation

- **Swagger UI**: `GET /docs`
- **ReDoc**: `GET /redoc`
- **OpenAPI Schema**: `GET /openapi.json`

---

## Rate Limiting

*(Implement if needed)*

Current implementation has no rate limiting. Add if required:
- X-RateLimit-Limit header
- X-RateLimit-Remaining header
- 429 Too Many Requests response

---

## Pagination

Most list endpoints support pagination:

**Query Parameters**:
- `skip` (int): Number of items to skip (default: 0)
- `limit` (int): Max items to return (default: 10, max: 100)

**Example**:
```
GET /projects?skip=20&limit=10
```

---

## Filtering & Sorting

### Filtering

Tasks support filtering by multiple fields:

```
GET /projects/{project_id}/tasks?status=IN_PROGRESS&priority=HIGH
```

### Sorting

*(Implement if needed)*

```
GET /projects?sort=created_at&order=asc
```

---

## Common Error Responses

### 400 Bad Request

```json
{
  "detail": "Invalid request format"
}
```

### 404 Not Found

```json
{
  "detail": "Resource not found"
}
```

### 422 Unprocessable Entity

```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "ensure this value has at least 1 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error"
}
```

---

## Testing Endpoints

### Using curl

```bash
# List projects
curl http://localhost:8000/api/projects

# Create project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "start_date": "2025-04-01",
    "end_date": "2025-06-30"
  }'

# Get specific project
curl http://localhost:8000/api/projects/{project_id}
```

### Using Swagger UI

Visit `http://localhost:8000/docs` to test endpoints interactively with automatic request/response formatting.

---

## Next Steps

- [Database Models](./database) - Data model documentation
- [Architecture](./architecture) - System design details
- [Setup Guide](./setup) - Installation and configuration
