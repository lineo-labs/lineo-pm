# Backend Setup Guide

Complete instructions for setting up, configuring, and running the Lineo PM backend.

## Prerequisites

### System Requirements

- **OS**: Linux, macOS, or Windows (with WSL)
- **Python**: 3.11 or higher
- **PostgreSQL**: 12 or higher
- **Redis**: 6.0 or higher (for Celery task queue)
- **Git**: For version control
- **pip/pip3**: Python package manager (included with Python)

### Check Prerequisites

```bash
# Check Python version
python --version  # Should be 3.11+

# Check PostgreSQL
psql --version

# Check Redis
redis-cli --version
```

---

## Installation Steps

### 1. Clone Repository

```bash
cd path_to_project/lineo-pm
```

### 2. Navigate to Backend

```bash
cd backend
```

### 3. Create Python Virtual Environment

**Option A: Using venv (recommended)**

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

**Option B: Using conda**

```bash
conda create -n lineo-pm python=3.11
conda activate lineo-pm
```

### 4. Install Dependencies

```bash
# Install from pyproject.toml
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"
```

**Dependencies installed**:
- fastapi ^0.122.0
- uvicorn ^0.38.0
- sqlalchemy ^2.0.44
- psycopg[binary] ^3.2.10
- pydantic ^2.12.5
- alembic ^1.17.2
- celery ^5.5.3
- redis ^5.2.1
- gunicorn ^23.0.0
- numpy ^1.26.0 (for Monte Carlo simulations)

---

## 3. Database Setup

### Prerequisites

PostgreSQL must be installed and running.

### Initialize Database

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER lineo_user WITH PASSWORD 'your_password';
CREATE DATABASE lineo_pm OWNER lineo_user;
GRANT ALL PRIVILEGES ON DATABASE lineo_pm TO lineo_user;
EOF
```

### Configure Connection

Create `.env` file in the backend directory:

```bash
cd path_to_project/lineo-pm/backend
```

```bash
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://lineo_user:your_password@localhost:5432/lineo_pm

# Redis Configuration (for Celery)
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Application Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True
ENVIRONMENT=development

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
EOF
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | Secret key for security | Random string (generate with `openssl rand -hex 32`) |
| `DEBUG` | Debug mode | `True` or `False` |
| `ENVIRONMENT` | Environment name | `development`, `staging`, `production` |

### Run Database Migrations

```bash
# Navigate to backend directory
cd path_to_project/lineo-pm/backend

# Run migrations
alembic upgrade head
```

### Seed Database (Optional)

```bash
# Seed with sample data
python -m src.seed

# Or using script
python src/seed.py
```

This creates sample projects, tasks, milestones, and scenarios for testing.

---

## 4. Running the Backend

### Development Mode

```bash
cd path_to_project/lineo-pm/backend

# Activate virtual environment (if not already activated)
source venv/bin/activate

# Start development server
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Press CTRL+C to quit
INFO:     Started server process [1234]
```

### Production Mode

```bash
# Using gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app --bind 0.0.0.0:8000

# Or with environment variables
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --env ENVIRONMENT=production \
  src.main:app --bind 0.0.0.0:8000
```

### Accessing the API

After starting the server:

- **API Root**: `http://localhost:8000/api`
- **Interactive Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Alternative Docs**: `http://localhost:8000/redoc` (ReDoc)
- **Health Check**: `http://localhost:8000/health`

---

## 5. Running Celery Task Queue (Optional)

For background task processing:

### Start Celery Worker

```bash
# In a separate terminal
cd path_to_project/lineo-pm/backend

# Activate virtual environment
source venv/bin/activate

# Start worker
celery -A src.celery_app worker --loglevel=info
```

### Start Celery Beat (Scheduler)

For periodic tasks:

```bash
# In another terminal
celery -A src.celery_app beat --loglevel=info
```

---

## 6. Docker Setup (Alternative)

### Using Docker Compose

```bash
cd path_to_project/lineo-pm

# Build and start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Stop services
docker-compose -f docker-compose.dev.yml down
```

This starts:
- FastAPI backend
- PostgreSQL database
- Redis cache/queue
- Celery worker

---

## Project Structure

```
backend/
├── pyproject.toml          # Project metadata and dependencies
├── src/
│   ├── main.py             # FastAPI application entry point
│   ├── celery_app.py       # Celery configuration
│   ├── seed.py             # Database seeding script
│   ├── db/
│   │   ├── database.py     # Database connection
│   │   └── models/         # SQLAlchemy models
│   ├── routers/            # API endpoint handlers
│   │   ├── project.py
│   │   ├── tasks.py
│   │   ├── milestones.py
│   │   ├── scenarios.py
│   │   ├── simulations.py
│   │   ├── relations.py
│   │   └── updates.py
│   ├── schemas/            # Pydantic validation models
│   │   ├── project.py
│   │   ├── task.py
│   │   ├── milestone.py
│   │   ├── scenario.py
│   │   ├── relation.py
│   │   └── update.py
│   ├── services/           # Business logic
│   │   └── [service modules]
│   └── tasks/              # Celery background tasks
├── migrations/             # Database migration files
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── tests/                  # Unit and integration tests
├── .env                    # Environment variables (create this)
├── .env.example            # Template for environment variables
└── .gitignore              # Git ignore rules
```

---

## Configuration

### Database Configuration

Connection pool settings in `.env`:

```bash
# In src/db/database.py
DATABASE_URL=postgresql://lineo_user:password@localhost:5432/lineo_pm?client_encoding=utf8
```

### CORS Configuration

If frontend is on different origin, configure CORS in `src/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Logging Configuration

Configure logging level:

```bash
# In .env
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

---

## Development Workflow

### 1. Start Database

```bash
# PostgreSQL should be running
# Check: psql -l

# Or with Docker
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lineo_pm \
  -p 5432:5432 \
  postgres:15
```

### 2. Start Redis

```bash
# Redis server
redis-server

# Or with Docker
docker run -d --name redis -p 6379:6379 redis:7
```

### 3. Run Migrations

```bash
alembic upgrade head
```

### 4. Start Backend Server

```bash
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Start Celery Worker (optional)

```bash
celery -A src.celery_app worker --loglevel=info
```

### 6. Test API

Visit `http://localhost:8000/docs` to test endpoints.

---

## Testing

### Run Unit Tests

```bash
pytest tests/
```

### Run with Coverage

```bash
pytest --cov=src tests/
```

### Run Specific Test

```bash
pytest tests/test_projects.py::test_create_project -v
```

---

## Common Issues

### Issue: Database Connection Error

**Error**: `sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server`

**Solution**:
1. Verify PostgreSQL is running: `psql -l`
2. Check `DATABASE_URL` in `.env` is correct
3. Verify user and password: `psql -U lineo_user -d lineo_pm`

### Issue: Redis Connection Error

**Error**: `redis.exceptions.ConnectionError: Error -1 connecting to localhost:6379`

**Solution**:
1. Verify Redis is running: `redis-cli ping` (should return PONG)
2. Check `REDIS_URL` in `.env` if using custom settings

### Issue: Migrations Not Applying

**Error**: `sqlalchemy.exc.ProgrammingError: (psycopg2.ProgrammingError) relation does not exist`

**Solution**:
```bash
# Reset migrations (development only - loses data)
alembic downgrade base
alembic upgrade head
```

### Issue: Port Already in Use

**Error**: `Address already in use`

**Solution**:
```bash
# Run on different port
python -m uvicorn src.main:app --port 8001

# Or kill process using port 8000
lsof -i :8000
kill -9 <PID>
```

---

## Performance Tuning

### Database Connection Pool

```python
# In src/db/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,           # Connections to keep in pool
    max_overflow=10,        # Extra connections allowed
    pool_pre_ping=True,     # Verify connections before using
    pool_recycle=3600       # Recycle connections after 1 hour
)
```

### Gunicorn Workers

```bash
# For CPU count
gunicorn -w $((2 * $(nproc) + 1)) \
  -k uvicorn.workers.UvicornWorker \
  src.main:app
```

### Database Query Optimization

Use `.options()` to eagerly load relationships:

```python
db.query(Project)\
    .options(
        joinedload(Project.tasks),
        joinedload(Project.milestones)
    ).all()
```

---

## Deployment Checklist

- [ ] Set `DEBUG=False` in production `.env`
- [ ] Use strong `SECRET_KEY` (generate: `openssl rand -hex 32`)
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Configure CORS for frontend domain
- [ ] Set up environment-specific configuration
- [ ] Test all API endpoints
- [ ] Review database migrations
- [ ] Set up CI/CD pipeline

---

## Environment-Specific Configuration

### Development

```bash
DEBUG=True
ENVIRONMENT=development
DATABASE_URL=postgresql://lineo_user:password@localhost:5432/lineo_pm
REDIS_URL=redis://localhost:6379/0
```

### Staging

```bash
DEBUG=False
ENVIRONMENT=staging
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/lineo_pm
REDIS_URL=redis://staging-redis.example.com:6379/0
```

### Production

```bash
DEBUG=False
ENVIRONMENT=production
DATABASE_URL=postgresql://user:secure_pass@prod-db.example.com:5432/lineo_pm
REDIS_URL=redis://prod-redis.example.com:6379/0
```

---

## Next Steps

- [API Endpoints Reference](./api-endpoints) - Complete endpoint documentation
- [Database Models](./database) - Data schema reference
- [Architecture](./architecture) - System design patterns
- [Frontend Setup](../frontend/setup) - Configure and run frontend
