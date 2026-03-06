# Frontend API Integration

## Overview

The frontend communicates with the **FastAPI backend** through a centralized API client located at `lib/api.ts`. This layer handles all HTTP requests, response parsing, error handling, and type-safe communication.

## API Client Architecture

### Core Client (`lib/api.ts`)

The API client provides:
- **Type-safe API calls**: Full TypeScript support for requests and responses
- **Centralized configuration**: Single source for API base URL and settings
- **Error handling**: Consistent error management and user feedback
- **Request/response interceptors**: Automatic token injection, logging, etc.
- **Retry logic**: Automatic retry for failed requests (optional)

### Base Configuration

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// API client initialization
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## API Endpoints Structure

### Projects

#### List Projects
```typescript
GET /api/projects
Response: Project[]
```

**Component Usage**:
```typescript
const projects = await api.getProjects();
```

---

#### Get Project Details
```typescript
GET /api/projects/{project_id}
Response: Project
```

**Component Usage**:
```typescript
const project = await api.getProject(projectId);
```

---

#### Create Project
```typescript
POST /api/projects
Request: CreateProjectRequest {
  name: string;
  description?: string;
  start_date: string; // ISO 8601
  end_date: string;   // ISO 8601
}
Response: Project
```

**Component Usage** (`CreateProjectForm.tsx`):
```typescript
const newProject = await api.createProject({
  name: 'Q2 Planning',
  description: 'Q2 2025 project planning',
  start_date: '2025-04-01',
  end_date: '2025-06-30'
});
```

---

#### Update Project
```typescript
PUT /api/projects/{project_id}
Request: UpdateProjectRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}
Response: Project
```

**Component Usage** (`ProjectEditDialog.tsx`):
```typescript
const updated = await api.updateProject(projectId, {
  name: 'Updated Project Name'
});
```

---

#### Delete Project
```typescript
DELETE /api/projects/{project_id}
Response: { success: boolean }
```

---

### Tasks

#### List Tasks by Project
```typescript
GET /api/projects/{project_id}/tasks
Response: Task[]
```

**Component Usage** (`TaskList.tsx`):
```typescript
const tasks = await api.getProjectTasks(projectId);
```

---

#### Create Task
```typescript
POST /api/projects/{project_id}/tasks
Request: CreateTaskRequest {
  name: string;
  description?: string;
  start_date: string;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to?: string; // User ID
  parent_task_id?: string;
  dependencies?: string[]; // Task IDs
}
Response: Task
```

**Component Usage** (`TaskCreateForm.tsx`):
```typescript
const task = await api.createTask(projectId, {
  name: 'Design database schema',
  priority: 'HIGH',
  start_date: '2025-03-10',
  due_date: '2025-03-20'
});
```

---

#### Update Task
```typescript
PUT /api/projects/{project_id}/tasks/{task_id}
Request: UpdateTaskRequest
Response: Task
```

---

#### Update Task Status
```typescript
PATCH /api/projects/{project_id}/tasks/{task_id}/status
Request: { status: 'TODO' | 'IN_PROGRESS' | 'DONE' }
Response: Task
```

---

#### Delete Task
```typescript
DELETE /api/projects/{project_id}/tasks/{task_id}
Response: { success: boolean }
```

---

### Milestones

#### List Milestones
```typescript
GET /api/projects/{project_id}/milestones
Response: Milestone[]
```

**Component Usage** (`MainSection.tsx`):
```typescript
const milestones = await api.getProjectMilestones(projectId);
```

---

#### Create Milestone
```typescript
POST /api/projects/{project_id}/milestones
Request: CreateMilestoneRequest {
  name: string;
  target_date: string; // ISO 8601
  description?: string;
}
Response: Milestone
```

**Component Usage** (`MilestoneCreateForm.tsx`):
```typescript
const milestone = await api.createMilestone(projectId, {
  name: 'Beta Release',
  target_date: '2025-06-15',
  description: 'Beta version release to internal testers'
});
```

---

#### Update Milestone
```typescript
PUT /api/projects/{project_id}/milestones/{milestone_id}
Request: UpdateMilestoneRequest
Response: Milestone
```

---

### Scenarios

#### List Scenarios
```typescript
GET /api/projects/{project_id}/scenarios
Response: Scenario[]
```

---

#### Create Scenario
```typescript
POST /api/projects/{project_id}/scenarios
Request: CreateScenarioRequest {
  name: string;
  case: 'OPTIMISTIC' | 'REALISTIC' | 'PESSIMISTIC';
  adjustments?: {
    task_id: string;
    duration_adjustment: number; // in days
  }[];
}
Response: Scenario
```

---

### Simulations (Monte Carlo)

#### Run Simulation
```typescript
POST /api/projects/{project_id}/simulations
Request: SimulationRequest {
  iterations: number; // e.g., 10000
  confidence_level: number; // 0.0 - 1.0 (e.g., 0.95 for 95%)
  task_ids?: string[]; // specific tasks or all
}
Response: SimulationResults {
  project_id: string;
  iterations: number;
  mean_duration: number;
  std_deviation: number;
  min_duration: number;
  max_duration: number;
  percentile_50: number;
  percentile_75: number;
  percentile_95: number;
  confidence_range: [number, number];
  distribution: DistributionPoint[];
}
```

**Component Usage** (`MonteCarloPanel.tsx`):
```typescript
const results = await api.runSimulation(projectId, {
  iterations: 10000,
  confidence_level: 0.95
});
```

---

## Type Definitions

### Core Types (to be defined in `src/types/`)

```typescript
// Project
interface Project {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

// Task
interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  start_date: string;
  due_date: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to?: string;
  parent_task_id?: string;
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

// Milestone
interface Milestone {
  id: string;
  project_id: string;
  name: string;
  target_date: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  created_at: string;
  updated_at: string;
}

// Scenario
interface Scenario {
  id: string;
  project_id: string;
  name: string;
  case: 'OPTIMISTIC' | 'REALISTIC' | 'PESSIMISTIC';
  created_at: string;
}

// Simulation Results
interface SimulationResults {
  project_id: string;
  iterations: number;
  mean_duration: number;
  std_deviation: number;
  min_duration: number;
  max_duration: number;
  percentile_50: number;
  percentile_75: number;
  percentile_95: number;
  confidence_range: [number, number];
}
```

---

## Error Handling

### Error Response Format
```typescript
interface APIError {
  status: number;
  message: string;
  details?: Record<string, any>;
}
```

### Error Handling Pattern

```typescript
try {
  const project = await api.getProject(projectId);
} catch (error) {
  if (error.status === 404) {
    // Handle not found
  } else if (error.status === 400) {
    // Handle validation error
    console.error(error.details);
  } else {
    // Handle other errors
  }
}
```

---

## Common Use Cases

### Fetching Data for Display

```typescript
// In component hook or effect
const [tasks, setTasks] = useState<Task[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getProjectTasks(projectId);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchTasks();
}, [projectId]);
```

### Submitting Forms

```typescript
// In form submission handler
const handleCreateTask = async (formData: CreateTaskRequest) => {
  try {
    setSubmitting(true);
    const newTask = await api.createTask(projectId, formData);
    // Update UI state
    setTasks([...tasks, newTask]);
    // Show success message
  } catch (error) {
    // Show error message
  } finally {
    setSubmitting(false);
  }
};
```

### Handling Real-time Updates

```typescript
// Poll for updates
useEffect(() => {
  const interval = setInterval(async () => {
    const updated = await api.getProject(projectId);
    setProject(updated);
  }, 5000); // Poll every 5 seconds
  
  return () => clearInterval(interval);
}, [projectId]);
```

---

## Backend API Server

### Running the Backend

The backend API server must be running for the frontend to function:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn src.main:app --reload
```

**Default URL**: `http://localhost:8000`

### Environment Configuration

Set the API base URL via environment variable:

```bash
# .env.local or in terminal
VITE_API_URL=http://localhost:8000/api
```

Or modify directly in `lib/api.ts`:

```typescript
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';
```

---

## Best Practices

✅ **Use TypeScript**: Ensure all API calls have proper type definitions  
✅ **Error Handling**: Always handle potential errors in API calls  
✅ **Loading States**: Show loading indicators for async operations  
✅ **Caching**: Cache frequently accessed data when appropriate  
✅ **Rate Limiting**: Be mindful of API rate limits  
✅ **Validation**: Validate data before sending to API  

---

## Troubleshooting

### CORS Issues
If you see CORS errors, ensure the backend has proper CORS configuration:

```python
# Backend cors_origins should include frontend URL
cors_origins = ["http://localhost:5173", "http://localhost:3000"]
```

### API Connection Failures
- Verify backend is running: `http://localhost:8000/docs`
- Check `VITE_API_URL` environment variable
- Verify network connectivity
- Check browser console for detailed error messages

---

## Next Steps

- [Setup & Development](./setup) - Running frontend locally
- [Architecture](./architecture) - Component structure and patterns
- [Components](./components) - Component documentation reference
