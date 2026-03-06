# Backend Architecture

## System Design Overview

The backend follows a **layered architecture** with clear separation of concerns, enabling scalability, testability, and maintainability.

### Architectural Layers

```
┌─────────────────────────────────────┐
│     API Routes / Endpoints          │  routers/
├─────────────────────────────────────┤
│     Request Validation              │  schemas/
├─────────────────────────────────────┤
│     Business Logic                  │  services/
├─────────────────────────────────────┤
│     Database Operations (ORM)       │  db/models/
├─────────────────────────────────────┤
│     PostgreSQL Database             │
└─────────────────────────────────────┘
```

## Module Structure

### 1. Database Layer (`db/`)

#### database.py
**Purpose**: Database connection and session management

**Responsibilities**:
- PostgreSQL connection initialization
- SQLAlchemy engine configuration
- Session factory setup
- Connection pooling
- Database URL parsing from environment

**Key Components**:
```python
# Engine configuration
engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=0)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### models/ (Database Models)
**Purpose**: Define data schemas using SQLAlchemy ORM

**Model Hierarchy**:

```
Base (SQLAlchemy declarative base)
├── Project
│   └── has_many: Task, Milestone, Scenario
├── Task
│   ├── belongs_to: Project
│   ├── has_many: TaskDependency
│   └── has_many: UpdateLog
├── Milestone
│   └── belongs_to: Project
├── Scenario
│   └── belongs_to: Project
├── TaskDependency
│   └── relates_to: Task
├── UpdateLog
│   └── tracks: Task updates
└── SimulationResult
    └── belongs_to: Project
```

**Key Models**:

- **Project**: Represents a project container
- **Task**: Individual work items with dates, status, priority
- **Milestone**: Project checkpoints and deliverables
- **Scenario**: Alternative project plans (optimistic/realistic/pessimistic)
- **TaskDependency**: Links between tasks
- **UpdateLog**: Audit trail of task/project changes
- **SimulationResult**: Results from Monte Carlo simulations

### 2. Validation Layer (`schemas/`)

**Purpose**: Pydantic models for request/response validation

**File Organization**:

```
schemas/
├── __init__.py
├── project.py       # Project request/response schemas
├── task.py          # Task schemas
├── milestone.py     # Milestone schemas
├── scenario.py      # Scenario schemas
├── relation.py      # Dependency/relation schemas
└── update.py        # Update/audit schemas
```

**Pattern**: Each schema file contains:

```python
# Request schema (for POST/PUT)
class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date

# Response schema (for GET)
class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # For SQLAlchemy model conversion
```

**Validation Features**:
- Type checking
- Field constraints (min/max length, regex, etc.)
- Custom validators
- Automatic documentation generation

### 3. API Routes (`routers/`)

**Purpose**: Define FastAPI endpoints and request handling

**Route Files**:

#### routers/project.py
**Endpoints**:
- `GET /projects` - List all projects
- `GET /projects/{project_id}` - Get project details
- `POST /projects` - Create new project
- `PUT /projects/{project_id}` - Update project
- `DELETE /projects/{project_id}` - Delete project

**Pattern**:
```python
router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@router.post("", response_model=ProjectResponse)
async def create_project(
    req: CreateProjectRequest,
    db: Session = Depends(get_db)
):
    project = Project(**req.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
```

#### routers/tasks.py
**Endpoints**:
- `GET /projects/{project_id}/tasks` - List tasks
- `POST /projects/{project_id}/tasks` - Create task
- `PUT /projects/{project_id}/tasks/{task_id}` - Update task
- `PATCH /projects/{project_id}/tasks/{task_id}/status` - Update status
- `DELETE /projects/{project_id}/tasks/{task_id}` - Delete task
- `POST /projects/{project_id}/tasks/{task_id}/dependencies` - Add dependency

#### routers/milestones.py
**Endpoints**:
- `GET /projects/{project_id}/milestones` - List milestones
- `POST /projects/{project_id}/milestones` - Create milestone
- `PUT /projects/{project_id}/milestones/{milestone_id}` - Update milestone
- `DELETE /projects/{project_id}/milestones/{milestone_id}` - Delete milestone

#### routers/scenarios.py
**Endpoints**:
- `GET /projects/{project_id}/scenarios` - List scenarios
- `POST /projects/{project_id}/scenarios` - Create scenario
- `PUT /projects/{project_id}/scenarios/{scenario_id}` - Update scenario
- `DELETE /projects/{project_id}/scenarios/{scenario_id}` - Delete scenario

#### routers/simulations.py
**Endpoints**:
- `POST /projects/{project_id}/simulations` - Run Monte Carlo simulation
- `GET /projects/{project_id}/simulations/{sim_id}` - Get results

#### routers/relations.py
**Endpoints**:
- Task dependency management
- Project relationship tracking

#### routers/updates.py
**Endpoints**:
- `GET /projects/{project_id}/updates` - Audit trail of changes
- `GET /tasks/{task_id}/updates` - Task-specific changes

#### routers/crud.py
**Purpose**: Helper CRUD operations shared across routes

**Functions**:
- `create_*`: Create new entities
- `read_*`: Retrieve entities
- `update_*`: Modify entities
- `delete_*`: Remove entities

### 4. Business Logic (`services/`)

**Purpose**: Complex business logic and calculations

**Typical Services**:

```python
# services/simulation_service.py
class SimulationService:
    @staticmethod
    def run_monte_carlo(
        project: Project,
        iterations: int,
        confidence_level: float
    ) -> SimulationResults:
        """Run Monte Carlo simulation on project tasks"""
        # Statistical analysis
        # Duration prediction
        # Risk calculation
        pass

# services/project_service.py
class ProjectService:
    @staticmethod
    def calculate_critical_path(project: Project) -> List[Task]:
        """Determine critical path for project"""
        pass
```

### 5. Async Tasks (`tasks/`)

**Purpose**: Background job processing with Celery

**Examples**:

```python
# tasks/simulation.py
@celery_app.task
def run_simulation_async(project_id: str, iterations: int):
    """Async Monte Carlo simulation"""
    pass

# tasks/notifications.py
@celery_app.task
def send_milestone_alert(milestone_id: str):
    """Notify stakeholders of milestone"""
    pass
```

**Features**:
- Long-running operations
- Scheduled jobs
- Retry logic
- Task status tracking

## Request/Response Flow

### Example: Create Task

```
1. Frontend sends POST /projects/123/tasks
   {
     "name": "Design API",
     "priority": "HIGH",
     "start_date": "2025-03-10",
     "due_date": "2025-03-20"
   }

2. FastAPI route handler (routers/tasks.py)
   - Receives request
   - Validates against CreateTaskRequest schema
   - Calls CRUD/Service layer

3. Business Logic (services/task_service.py)
   - Validates task constraints
   - Calculates derived fields (duration, etc.)
   - Prepares data

4. Database Layer (models/)
   - Creates Task ORM instance
   - Validates database constraints
   - Executes SQL INSERT

5. Response Construction
   - Fetches created Task from database
   - Converts to TaskResponse schema
   - Returns JSON to client
```

## Error Handling

### Error Handling Strategy

```python
from fastapi import HTTPException

@router.get("/{project_id}")
async def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
```

### Error Response Format

```json
{
  "detail": "Error message here",
  "error_code": "NOT_FOUND"
}
```

## Dependency Injection

FastAPI uses dependency injection for:
- Database sessions
- User authentication
- Request parameters
- Environment variables

```python
async def get_project(
    project_id: str = Path(...),           # URL parameter
    db: Session = Depends(get_db),         # DB injection
    skip: int = Query(0),                  # Query parameter
    limit: int = Query(10)                 # Query parameter
):
    pass
```

## Database Migrations

### Alembic Configuration

Located in `migrations/`:
- **env.py**: Migration environment configuration
- **script.py.mako**: Migration script template
- **versions/**: Individual migration files

### Migration Process

```bash
# Generate migration
alembic revision --autogenerate -m "Add field to project"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Configuration Management

### Environment Variables

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    CELERY_BROKER_URL: str
    SECRET_KEY: str
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
```

## Testing Architecture

### Test Organization

```
tests/
├── unit/
│   ├── test_services.py
│   ├── test_schemas.py
│   └── test_models.py
├── integration/
│   ├── test_routes.py
│   └── test_database.py
└── fixtures/
    └── conftest.py
```

### Testing Pattern

```python
def test_create_project(db: Session):
    """Test project creation"""
    project_data = {"name": "Test", "start_date": date.today(), ...}
    project = create_project(db, project_data)
    assert project.name == "Test"
    assert project in db.query(Project).all()
```

## Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization with indexes
- Eager loading relationships
- Pagination for large result sets

### Application Optimization
- Async/await for I/O operations
- Caching with Redis
- Task offloading to Celery
- Response compression

### Example: Pagination

```python
@router.get("/projects")
async def list_projects(
    skip: int = Query(0),
    limit: int = Query(10),
    db: Session = Depends(get_db)
):
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects
```

## Monitoring & Logging

### Request Logging

```python
from fastapi import Request
from fastapi.middleware import Middleware

middleware = Middleware(LoggingMiddleware)

app = FastAPI(middleware=[middleware])
```

### Error Tracking

```python
import logging

logger = logging.getLogger(__name__)

try:
    # Operation
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

## API Security

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Request Validation

- Pydantic automatic validation
- SQL injection prevention (parameterized queries)
- Input sanitization

## Next Steps

- [Database & Models](./database) - Detailed data model documentation
- [API Endpoints](./api-endpoints) - Complete endpoint reference
- [Setup Guide](./setup) - Installation and deployment
