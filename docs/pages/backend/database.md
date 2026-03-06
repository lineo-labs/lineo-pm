# Backend Database & Models

## Database Overview

Lineo PM uses **PostgreSQL** as the primary data persistence layer with **SQLAlchemy** as the ORM (Object-Relational Mapping) framework.

### Connection Details

```
Host: localhost
Port: 5432
Database: lineo_pm
User: lineo_user (configurable)
```

### Connection String

```
postgresql://lineo_user:password@localhost:5432/lineo_pm
```

Set via environment variable:
```bash
DATABASE_URL=postgresql://lineo_user:password@localhost:5432/lineo_pm
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐
│   Project   │ (1)
└──────┬──────┘
       │
       ├───→ (N) Task
       ├───→ (N) Milestone
       └───→ (N) Scenario


┌───────────────────────┐
│  Task (0..many)       │
└───────┬───────────────┘
        │
        └───→ TaskDependency (M2M)
        └───→ UpdateLog (1:N)
```

---

## Core Models

### 1. Project Model

**Table**: `projects`

**Purpose**: Container for tasks, milestones, and scenarios

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key (auto-generated) |
| name | String(255) | No | Project name |
| description | Text | Yes | Detailed description |
| start_date | Date | No | Project start date |
| end_date | Date | No | Project end date |
| status | Enum | No | Status: PLANNING, ACTIVE, COMPLETED, ARCHIVED |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update timestamp |

**Relationships**:
- `tasks`: One-to-many with Task
- `milestones`: One-to-many with Milestone
- `scenarios`: One-to-many with Scenario
- `updates`: One-to-many with UpdateLog

**Indexes**:
- PRIMARY KEY: id
- UNIQUE: name
- INDEX: created_at, updated_at

**Constraints**:
- `start_date` must be before `end_date`
- `name` max length 255 characters

**SQL Definition**:
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_date <= end_date)
);
```

---

### 2. Task Model

**Table**: `tasks`

**Purpose**: Individual work items within projects

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| project_id | UUID | No | Foreign key to Project |
| name | String(255) | No | Task name |
| description | Text | Yes | Detailed description |
| start_date | Date | No | Task start date |
| due_date | Date | No | Task due date |
| duration_days | Integer | No | Estimated duration in days |
| priority | Enum | No | Priority: LOW, MEDIUM, HIGH, CRITICAL |
| status | Enum | No | Status: TODO, IN_PROGRESS, DONE, CANCELLED |
| assigned_to | String(255) | Yes | Assignee name/ID |
| parent_task_id | UUID | Yes | Parent task (for hierarchical tasks) |
| progress | Integer | No | Progress percentage (0-100) |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update timestamp |

**Relationships**:
- `project`: Many-to-one with Project (required)
- `dependencies`: Many-to-many with Task (via TaskDependency)
- `dependents`: Many-to-many with Task (reverse)
- `updates`: One-to-many with UpdateLog
- `parent`: Self-reference (hierarchical)
- `children`: Self-reference (hierarchical)

**Indexes**:
- PRIMARY KEY: id
- FOREIGN KEY: project_id
- FOREIGN KEY: parent_task_id
- INDEX: project_id, status, priority
- INDEX: due_date
- INDEX: created_at

**Constraints**:
- `start_date` must be before `due_date`
- `progress` must be 0-100
- `project_id` required (FK)
- `duration_days` > 0

**SQL Definition**:
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    duration_days INTEGER NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(50) NOT NULL DEFAULT 'TODO',
    assigned_to VARCHAR(255),
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CHECK (start_date <= due_date),
    CHECK (progress >= 0 AND progress <= 100),
    CHECK (duration_days > 0)
);
```

---

### 3. Milestone Model

**Table**: `milestones`

**Purpose**: Key project checkpoints and deliverables

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| project_id | UUID | No | Foreign key to Project |
| name | String(255) | No | Milestone name |
| description | Text | Yes | Detailed description |
| target_date | Date | No | Target completion date |
| status | Enum | No | Status: NOT_STARTED, IN_PROGRESS, COMPLETED |
| order | Integer | No | Display order in timeline |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update timestamp |

**Relationships**:
- `project`: Many-to-one with Project (required)

**Indexes**:
- PRIMARY KEY: id
- FOREIGN KEY: project_id
- INDEX: project_id, target_date
- INDEX: status

**Constraints**:
- `project_id` required (FK)
- `name` unique per project
- `order` >= 0

**SQL Definition**:
```sql
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE (project_id, name)
);
```

---

### 4. Scenario Model

**Table**: `scenarios`

**Purpose**: Alternative project plans (what-if analysis)

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| project_id | UUID | No | Foreign key to Project |
| name | String(255) | No | Scenario name |
| case | Enum | No | Case: OPTIMISTIC, REALISTIC, PESSIMISTIC |
| description | Text | Yes | Description of adjustments |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update timestamp |

**Relationships**:
- `project`: Many-to-one with Project (required)
- `adjustments`: One-to-many with ScenarioAdjustment

**Indexes**:
- PRIMARY KEY: id
- FOREIGN KEY: project_id
- INDEX: project_id, case
- UNIQUE: (project_id, case) - One scenario per case per project

**Constraints**:
- `project_id` required (FK)
- One scenario per project per case

**SQL Definition**:
```sql
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    "case" VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE (project_id, "case")
);
```

---

### 5. TaskDependency Model (Junction Table)

**Table**: `task_dependencies`

**Purpose**: Represents dependencies between tasks (M2M relationship)

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| task_id | UUID | No | FK to dependent task |
| depends_on_id | UUID | No | FK to predecessor task |
| dependency_type | Enum | No | Type: FINISH_TO_START, START_TO_START, etc. |
| lag_days | Integer | No | Days between tasks (default 0) |
| created_at | DateTime | No | Creation timestamp |

**Relationships**:
- `task`: Many-to-one with Task (dependent task)
- `prerequisite`: Many-to-one with Task (predecessor task)

**Indexes**:
- PRIMARY KEY: id
- FOREIGN KEY: task_id, depends_on_id
- UNIQUE: (task_id, depends_on_id)
- INDEX: depends_on_id (for reverse lookup)

**Constraints**:
- `task_id` != `depends_on_id` (no self-dependencies)
- `lag_days` >= 0

**SQL Definition**:
```sql
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    depends_on_id UUID NOT NULL,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'FINISH_TO_START',
    lag_days INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE (task_id, depends_on_id),
    CHECK (task_id != depends_on_id),
    CHECK (lag_days >= 0)
);
```

---

### 6. UpdateLog Model

**Table**: `update_logs`

**Purpose**: Audit trail of changes (for tracking modifications)

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| entity_type | Enum | No | Type: PROJECT, TASK, MILESTONE |
| entity_id | UUID | No | ID of modified entity |
| field_name | String(100) | No | Field that was changed |
| old_value | Text | Yes | Previous value |
| new_value | Text | No | New value |
| changed_by | String(255) | Yes | User who made change |
| created_at | DateTime | No | Timestamp of change |

**Indexes**:
- PRIMARY KEY: id
- INDEX: entity_type, entity_id
- INDEX: created_at
- INDEX: changed_by

**SQL Definition**:
```sql
CREATE TABLE update_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 7. SimulationResult Model

**Table**: `simulation_results`

**Purpose**: Store Monte Carlo simulation results

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key |
| project_id | UUID | No | Foreign key to Project |
| iterations | Integer | No | Number of simulations run |
| mean_duration | Float | No | Mean project duration (days) |
| std_deviation | Float | No | Standard deviation |
| min_duration | Float | No | Minimum duration observed |
| max_duration | Float | No | Maximum duration observed |
| percentile_50 | Float | No | 50th percentile (median) |
| percentile_75 | Float | No | 75th percentile |
| percentile_95 | Float | No | 95th percentile |
| confidence_level | Float | No | Confidence level used (0-1) |
| created_at | DateTime | No | Creation timestamp |

**Relationships**:
- `project`: Many-to-one with Project (required)

**Indexes**:
- PRIMARY KEY: id
- FOREIGN KEY: project_id
- INDEX: project_id, created_at

**SQL Definition**:
```sql
CREATE TABLE simulation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    iterations INTEGER NOT NULL,
    mean_duration FLOAT NOT NULL,
    std_deviation FLOAT NOT NULL,
    min_duration FLOAT NOT NULL,
    max_duration FLOAT NOT NULL,
    percentile_50 FLOAT NOT NULL,
    percentile_75 FLOAT NOT NULL,
    percentile_95 FLOAT NOT NULL,
    confidence_level FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CHECK (iterations > 0),
    CHECK (confidence_level >= 0 AND confidence_level <= 1)
);
```

---

## Database Migrations

### Alembic Setup

Migrations are managed using **Alembic**:

```bash
# Create migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Migration Versioning

Located in `backend/src/migrations/versions/`:
- Sequential version naming
- Each file contains `upgrade()` and `downgrade()` functions
- Automatically generated or manually edited

---

## Data Integrity

### Referential Integrity
- Foreign key constraints enforce relationships
- ON DELETE CASCADE removes dependent records
- ON DELETE SET NULL allows nullable foreign keys

### Business Rule Enforcement
- CHECK constraints validate field values
- UNIQUE constraints prevent duplicates
- NOT NULL constraints ensure required fields

### Data Validation
- Pydantic schemas validate at application level
- Database constraints as additional safety layer
- Type coercion and conversion

---

## Query Optimization

### Common Queries

#### Get all tasks for a project with dependencies

```python
tasks = db.query(Task)\
    .filter(Task.project_id == project_id)\
    .options(
        joinedload(Task.dependencies),
        joinedload(Task.dependents)
    )\
    .all()
```

#### Get project with all entities

```python
project = db.query(Project)\
    .filter(Project.id == project_id)\
    .options(
        joinedload(Project.tasks),
        joinedload(Project.milestones),
        joinedload(Project.scenarios)
    )\
    .first()
```

### Performance Considerations

- Use `joinedload()` for eager loading relationships
- Avoid N+1 query problems
- Use pagination for large result sets
- Index frequently queried fields

---

## Backup & Recovery

### Backup Command

```bash
pg_dump -U lineo_user -d lineo_pm > backup.sql
```

### Restore Command

```bash
psql -U lineo_user -d lineo_pm < backup.sql
```

---

## Next Steps

- [API Endpoints](./api-endpoints) - REST API reference
- [Architecture](./architecture) - System design details
- [Setup Guide](./setup) - Database initialization and configuration
