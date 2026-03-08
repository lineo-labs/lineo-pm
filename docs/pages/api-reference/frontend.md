# Frontend API Reference

## Overview

The Lineo-PM frontend communicates with the backend through a typed TypeScript API client layer located in `frontend/src/lib/`. This client abstracts all HTTP communication, providing typed functions for every backend endpoint. Components never call `fetch` directly — they use the API client, which returns typed domain objects.

## TypeDoc Documentation

Full auto-generated TypeScript documentation for the frontend API client, types, and interfaces is available at:

```
frontend/docs/typedoc/
```

This includes:

- **Functions** — API client functions grouped by domain
- **Interfaces** — TypeScript interfaces for all domain types
- **Types** — Type aliases and union types used across the application
- **Variables** — Exported constants

To regenerate the TypeDoc documentation:

```bash
cd frontend
npm run docs   # or the equivalent typedoc script
```

## Key Types and Interfaces

### `Project`

Represents a project in the system.

```typescript
interface Project {
  id: number;
  name: string;
  description?: string;
  start_date: string;     // ISO date: YYYY-MM-DD
  end_date: string;       // ISO date: YYYY-MM-DD
  created_at: string;
  updated_at: string;
}
```

### `Task`

Represents an individual unit of work within a project.

```typescript
interface Task {
  id: number;
  project_id: number;
  scenario_id?: number;
  name: string;
  start_date: string;
  end_date: string;
  risk_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}
```

### `Milestone`

A key delivery marker in the project timeline.

```typescript
interface Milestone {
  id: number;
  project_id: number;
  name: string;
  target_date: string;
}
```

### `Scenario`

An alternative planning timeline associated with a project.

```typescript
interface Scenario {
  id: number;
  project_id: number;
  name: string;
  is_baseline: boolean;
  created_at: string;
}
```

### `Relation`

A dependency link from one task (predecessor) to another (successor).

```typescript
interface Relation {
  id: number;
  predecessor_id: number;
  successor_id: number;
  type: 'finish_to_start';
}
```

### `Update`

A narrative update record attached to a project or scenario.

```typescript
interface Update {
  id: number;
  project_id: number;
  scenario_id?: number;
  content: string;
  created_at: string;
  author?: string;
}
```

### `SimulationResult`

The output of a Monte Carlo simulation run.

```typescript
interface SimulationResult {
  id: number;
  project_id: number;
  scenario_id?: number;
  slip_probability: number;        // 0.0 – 1.0
  p50_delay_days: number;
  p75_delay_days: number;
  p85_delay_days: number;
  p95_delay_days: number;
  delay_distribution: number[];    // histogram bucket counts
  per_task_slip_risk: Record<number, number>;
  critical_index: Record<number, number>;
  status: 'pending' | 'running' | 'complete' | 'failed';
  created_at: string;
}
```

## API Client Pattern

All exports from the API client module follow a consistent pattern:

```typescript
// Example: fetch all tasks for a project
const tasks = await getTasks(projectId);

// Example: create a new task
const task = await createTask({ project_id, name, start_date, end_date, risk_level });

// Example: trigger a simulation
const job = await runSimulation(projectId, scenarioId);
const result = await getSimulationResult(job.id);
```

Refer to the TypeDoc output in `frontend/docs/typedoc/` for the full list of available functions and their signatures.
