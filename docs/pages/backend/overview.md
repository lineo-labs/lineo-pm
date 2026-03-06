# Backend Overview

The Lineo PM backend is a robust, scalable **FastAPI application** built with **Python 3.11+**, featuring async operations, comprehensive REST APIs, PostgreSQL persistence, and Celery task queue for background processing.

## Key Features

### 🚀 Performance
- **Async Operations**: Non-blocking I/O with asyncio and Starlette
- **Type Safety**: Pydantic for automatic validation and serialization
- **Scalability**: Designed for horizontal scaling with task queue support

### 📊 Project Management
- **Project CRUD**: Create, read, update, delete projects
- **Task Management**: Hierarchical tasks with dependencies and status tracking
- **Milestone Planning**: Track project milestones and deliverables
- **Scenario Analysis**: Multiple what-if scenarios for project planning

### 📈 Advanced Analytics
- **Monte Carlo Simulation**: Statistical analysis for project duration estimation
- **Risk Assessment**: Probability-based risk evaluation
- **Duration Prediction**: Confidence intervals for project completion

### 🔄 Background Processing
- **Celery** for async task queue
- **Redis** for caching and message broker
- **Scheduled Tasks**: Periodic jobs and notifications

### 💾 Data Persistence
- **PostgreSQL**: Relational database with ACID compliance
- **SQLAlchemy ORM**: Object-relational mapping for database operations
- **Alembic**: Database migration management

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | ^0.122.0 |
| Language | Python | 3.11+ |
| Database | PostgreSQL | 12+ |
| ORM | SQLAlchemy | ^2.0.44 |
| Task Queue | Celery | ^5.5.3 |
| Cache/Message Broker | Redis | ^5.2.1 |
| Server | Uvicorn | ^0.38.0 |
| Validation | Pydantic | ^2.12.5 |
| Migration Tool | Alembic | ^1.17.2 |

## Application Architecture

### Directory Structure

```
backend/src/
├── main.py              # FastAPI app initialization
├── celery_app.py        # Celery configuration
├── setup.py             # Package setup
├── seed.py              # Database seeding
├── cli/                 # Command-line interfaces
├── db/                  # Database layer
│   ├── database.py      # Database connection
│   └── models/          # SQLAlchemy models
├── routers/             # API endpoints
│   ├── __init__.py
│   ├── crud.py          # CRUD operations
│   ├── project.py       # Project routes
│   ├── tasks.py         # Task routes
│   ├── milestones.py    # Milestone routes
│   ├── scenarios.py     # Scenario routes
│   ├── relations.py     # Relationship routes
│   ├── simulations.py   # Simulation routes
│   └── updates.py       # Update tracking routes
├── schemas/             # Pydantic schemas
│   ├── __init__.py
│   ├── project.py       # Project schemas
│   ├── task.py          # Task schemas
│   ├── milestone.py     # Milestone schemas
│   ├── scenario.py      # Scenario schemas
│   ├── relation.py      # Relation schemas
│   └── update.py        # Update schemas
├── services/            # Business logic
│   └── [service modules]
└── tasks/               # Celery tasks
    └── [task modules]
```

### Core Concepts

#### RESTful Architecture
- **Resource-oriented**: URLs mapped to entities (projects, tasks, etc.)
- **Standard HTTP methods**: GET, POST, PUT, DELETE, PATCH
- **JSON serialization**: All requests/responses in JSON format

#### Request/Response Flow

```
Request
  ↓
Route Handler (routers/)
  ↓
Validation (schemas/)
  ↓
Business Logic (services/)
  ↓
Database Operations (models/)
  ↓
Response (schemas/)
```

#### Database Layer
- SQLAlchemy models define database structure
- Alembic manages schema migrations
- Connection pooling for performance
- Transaction management for data integrity

#### Task Queue
- Celery workers process async tasks
- Redis message broker
- Task scheduling and retries
- Background job monitoring

## API Documentation

### Automatic API Documentation

FastAPI generates interactive API docs:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

Visit Swagger UI after starting the backend to explore all endpoints interactively.

## Core Entities

### Project
- **Purpose**: Container for tasks and milestones
- **Key Attributes**: name, description, start_date, end_date
- **Relationships**: Has many tasks, milestones, scenarios

### Task
- **Purpose**: Individual work items with duration and status
- **Key Attributes**: name, start_date, due_date, status, priority
- **Relationships**: Belongs to project, can have dependencies

### Milestone
- **Purpose**: Project checkpoints and deliverables
- **Key Attributes**: name, target_date, status
- **Relationships**: Belongs to project, linked to tasks

### Scenario
- **Purpose**: "What-if" planning variations
- **Key Attributes**: name, case (optimistic/realistic/pessimistic)
- **Relationships**: Belongs to project, contains task adjustments

## Key Features

### 1. Project Management
- Create and manage multi-project portfolios
- Track project progress and timeline deviations
- Support for project dependencies

### 2. Task Tracking
- Hierarchical task structure
- Task dependencies and critical path analysis
- Status tracking: TODO, IN_PROGRESS, DONE
- Priority levels for task prioritization

### 3. Milestone Planning
- Milestone creation and tracking
- Link milestones to tasks
- Determine project completion status

### 4. Scenario Analysis
- Create multiple project scenarios
- Compare optimistic/realistic/pessimistic cases
- Task duration adjustments per scenario

### 5. Monte Carlo Simulation
- Statistical duration prediction
- Confidence interval calculation
- Risk quantification
- Supports task-specific uncertainty

### 6. Database Integrity
- Foreign key constraints
- Cascade delete policies
- Transaction rollback on errors
- Data validation at ORM level

## Deployment

### Development
```bash
python -m uvicorn src.main:app --reload
```

### Production
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app
```

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/lineo_pm
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
```

## Performance Characteristics

- **Request latency**: ~50-200ms for typical operations
- **Throughput**: 500+ requests/second per instance
- **Database connections**: Connection pooling with configurable pool size
- **Task processing**: Async Celery workers with configurable concurrency

## Monitoring & Health Checks

### Health Check Endpoint
```
GET /health
Response: { "status": "healthy" }
```

### Logging
- Structured logging with timestamps
- Request/response logging
- Error and exception logging
- Task queue monitoring

## Next Steps

- [Architecture Deep Dive](./architecture) - Detailed system design
- [Database & Models](./database) - Data model reference
- [API Endpoints](./api-endpoints) - Complete endpoint documentation
- [Setup Guide](./setup) - Installation and development instructions
