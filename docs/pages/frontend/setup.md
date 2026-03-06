# Frontend Setup Guide

Complete instructions for setting up, configuring, and running the Lineo PM frontend.

## Prerequisites

### System Requirements

- **Node.js**: 18+ (includes npm)
- **npm**: 9+ (or yarn/pnpm)
- **Git**: For version control
- **Backend API**: Running on `http://localhost:8000` (see [Backend Setup](../backend/setup))

### Check Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version
```

---

## Installation Steps

### 1. Navigate to Frontend Directory

```bash
cd path_to_project/lineo-pm/frontend
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install

# Or using pnpm
pnpm install
```

**Installed Dependencies**:
- react ^18.3.1
- react-dom ^18.3.1
- typescript ^5.5.3
- vite ^5.4.0
- tailwindcss ^3.4.4
- date-fns ^3.6.0
- react-day-picker ^8.10.1
- And other UI and utility libraries

---

## Configuration

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
cd path_to_project/lineo-pm/frontend
```

```bash
cat > .env.local << EOF
# API Configuration
VITE_API_URL=http://localhost:8000/api

# App Configuration
VITE_APP_NAME=Lineo PM
VITE_APP_ENV=development
EOF
```

### Environment Variables Reference

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api` | `http://localhost:8000/api` |
| `VITE_APP_NAME` | Application name | `Lineo PM` | `Lineo PM` |
| `VITE_APP_ENV` | Environment | `development`, `production` | `development` |

### Backend Connection

Edit `src/lib/api.ts` to configure the API base URL:

```typescript
// Frontend/src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

If using different backend URL, update `.env.local`:

```bash
VITE_API_URL=http://your-backend-url:8000/api
```

---

## Running the Frontend

### Development Mode

```bash
cd path_to_project/lineo-pm/frontend

# Start development server
npm run dev
```

**Expected Output**:
```
  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### Access Application

- **App URL**: `http://localhost:5173`
- **Vite HMR**: Hot Module Reload enabled for instant updates

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

**Build Output**: `dist/` folder contains optimized assets

---

## Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── AppShell.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── Gantt/           # Gantt chart components
│   │   ├── Scenario/        # Scenario components
│   │   ├── ui/              # Reusable UI primitives
│   │   └── __tests__/       # Component tests
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and API client
│   │   ├── api.ts           # API client
│   │   ├── dateRange.ts     # Date utilities
│   │   └── [other utils]
│   ├── types/                # TypeScript type definitions
│   ├── mocks/                # Mock data
│   ├── assets/               # Images, fonts, etc.
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Vite entry point
│   └── index.css             # Global styles
├── public/                    # Static assets
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.cjs       # Tailwind CSS configuration
├── postcss.config.cjs        # PostCSS configuration
├── tailwind.config.cjs       # Tailwind CSS configuration
├── .env.local                # Environment variables (create this)
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
└── package.json              # Dependencies and scripts
```

---

## Development Workflow

### 1. Start Backend (in separate terminal)

```bash
cd backend
source venv/bin/activate  # Or activate your Python environment
python -m uvicorn src.main:app --reload
```

The backend should be running on `http://localhost:8000`

### 2. Start Frontend (in another terminal)

```bash
cd frontend
npm install  # Install dependencies if first time
npm run dev
```

The frontend should be running on `http://localhost:5173`

### 3. Verify Connection

- Open `http://localhost:5173` in browser
- Check browser console for API errors
- Verify Swagger UI at `http://localhost:8000/docs`

### 4. Development Tips

- **Hot Reload**: Changes reflect instantly
- **Source Maps**: Debug TypeScript directly in browser
- **Network Tab**: Check API requests in DevTools
- **Console**: Check for errors and warnings

---

## Code Quality

### Linting (if configured)

```bash
# Check code style
npm run lint

# Fix style issues
npm run lint:fix
```

### Type Checking

```bash
# Check TypeScript compilation
npx tsc --noEmit
```

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## Building for Production

### Optimization Steps

```bash
# Build optimized production bundle
npm run build

# Analyze bundle size
npm run build -- --analyze
```

### Production Build Output

```
dist/
├── index.html              # Main HTML file
├── assets/
│   ├── index-*.js          # Main JavaScript bundle
│   ├── vendor-*.js         # Vendor dependencies
│   ├── index-*.css         # Compiled styles
│   └── [images, fonts]     # Static assets
└── [other assets]
```

### Deployment

Deploy the `dist/` folder to your hosting:

```bash
# Copy to server
scp -r dist/* user@server:/var/www/lineo-pm/

# Or using cloud deployment
npm run deploy  # If configured
```

---

## Browser Support

- **Chrome/Chromium**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

---

## Common Issues

### Issue: Backend Connection Error

**Error in Console**: `Failed to fetch from http://localhost:8000/api`

**Solution**:
1. Verify backend is running: `http://localhost:8000/docs`
2. Check `VITE_API_URL` in `.env.local`
3. Ensure backend CORS is configured correctly
4. Check firewall/network settings

### Issue: Port 5173 Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::5173`

**Solution**:
```bash
# Run on different port
npm run dev -- --port 5174

# Or kill process using port 5173
lsof -i :5173
kill -9 <PID>
```

### Issue: Dependencies Not Found

**Error**: `Cannot find module '@component/...'`

**Solution**:
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript Errors

**Error**: `Type 'X' is not assignable to type 'Y'`

**Solution**:
1. Check type definitions in`src/types/`
2. Review component props interfaces
3. Enable strict type checking: `src/tsconfig.json`

### Issue: Hot Module Reload Not Working

**Error**: Changes don't reflect in browser

**Solution**:
1. Restart dev server: `Ctrl+C` then `npm run dev`
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check `vite.config.ts` HMR configuration

---

## Performance Tips

### Bundle Optimization

- Use dynamic imports for large components
- Lazy load routes and features
- Tree-shake unused code
- Optimize images and assets

### Runtime Performance

- Use `React.memo()` for expensive components
- Implement proper key props in lists
- Avoid unnecessary re-renders with `useCallback`
- Minimize state updates

### Example: Code Splitting

```typescript
// Lazy load heavy component
import { lazy, Suspense } from 'react';

const MonteCarloPanel = lazy(() => import('@components/MonteCarloPanel'));

export const App = () => (
  <Suspense fallback={<Loading />}>
    <MonteCarloPanel />
  </Suspense>
);
```

---

## Debugging

### Browser DevTools

1. Open DevTools: `F12` or `Right-click → Inspect`
2. **Console Tab**: Check logs and errors
3. **Network Tab**: Monitor API requests
4. **Elements Tab**: Inspect React components
5. **Sources Tab**: Debug TypeScript code

### React DevTools Extension

Install [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/) for:
- Component tree inspection
- Props and state debugging
- Performance profiling

### Environment Configuration

For debugging API calls:

```bash
# In .env.local
VITE_DEBUG=true
```

Enable logging in `src/lib/api.ts`:

```typescript
// Log all API requests
client.interceptors.request.use(config => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});
```

---

## Deployment Checklist

- [ ] Remove `VITE_DEBUG` environment variable
- [ ] Update `VITE_API_URL` to production backend
- [ ] Run `npm run build` and verify `dist/` folder
- [ ] Test production build locally: `npm run preview`
- [ ] Check TypeScript: `npx tsc --noEmit`
- [ ] Verify all images and assets are included
- [ ] Test on target browsers
- [ ] Set up CDN for static assets
- [ ] Configure HTTP caching headers
- [ ] Set up error logging/monitoring

---

## Integration with Backend

### API Client Usage

All API calls go through `src/lib/api.ts`:

```typescript
import { api } from '@lib/api';

// Get projects
const projects = await api.getProjects();

// Create project
const newProject = await api.createProject({
  name: 'New Project',
  start_date: '2025-03-10',
  end_date: '2025-06-30'
});

// See [API Integration Guide](./api) for all endpoints
```

### Backend APIs Consumed

- **Projects**: CRUD operations
- **Tasks**: Task management and tracking
- **Milestones**: Milestone planning
- **Scenarios**: What-if analysis
- **Simulations**: Monte Carlo analysis
- **Updates**: Audit trail tracking

See [API Integration Guide](./api) for complete endpoint documentation.

---

## Next Steps

- [API Integration Guide](./api) - Backend API endpoint reference
- [Components Documentation](./components) - Component library
- [Architecture](./architecture) - Application structure details

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
