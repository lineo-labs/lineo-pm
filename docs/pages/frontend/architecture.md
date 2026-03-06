# Frontend Architecture

## Folder Structure

The frontend follows a scalable, modular architecture designed for maintainability and reusability.

### Directory Organization

```
frontend/src/
│
├── components/                 # Reusable React components
│   ├── AppShell.tsx           # Main application wrapper
│   ├── CreateProjectButton.tsx # Project creation trigger
│   ├── CreateProjectForm.tsx   # Project form component
│   ├── CrossProjectGantt.tsx   # Multi-project Gantt chart
│   ├── DateRangePicker.tsx     # Date range selection
│   ├── MainSection.tsx         # Main content area
│   ├── MilestoneCreateForm.tsx # Milestone creation form
│   ├── MilestoneEditDialog.tsx # Milestone editing dialog
│   ├── MonteCarloPanel.tsx     # Monte Carlo analysis panel
│   ├── MultiSelectDropdown.tsx # Multi-select component
│   ├── ProjectCard.tsx         # Project display card
│   ├── ProjectEditDialog.tsx   # Project editing dialog
│   ├── ProjectSelector.tsx     # Project selection dropdown
│   ├── RiskAdjustResultPanel.tsx # Risk adjustment results
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── TaskCreateForm.tsx      # Task creation form
│   ├── TaskEditDialog.tsx      # Task editing dialog
│   ├── TaskList.tsx            # Task listing component
│   ├── TasksCard.tsx           # Task card display
│   ├── Gantt/                 # Gantt chart components
│   ├── Scenario/              # Scenario management components
│   ├── ui/                    # Reusable UI primitives
│   └── __tests__/             # Component tests
│
├── hooks/                      # Custom React hooks
│   └── [custom hooks]         # Shared logic extraction
│
├── lib/                        # Utility functions and APIs
│   ├── api.ts                 # Centralized API client
│   ├── dateRange.ts           # Date range utilities
│   └── [other utilities]      # Helper functions
│
├── mocks/                      # Mock data for development/testing
│   └── [mock data files]      # Sample project, task, milestone data
│
├── types/                      # TypeScript type definitions
│   └── [type definitions]     # Props, API responses, domain models
│
├── assets/                     # Static assets
│   └── [images, icons, fonts] # Multimedia resources
│
├── App.tsx                     # Root component
├── main.tsx                    # Vite entry point
└── index.css                   # Global styles
```

## Component Hierarchy

### Page-Level Components
- **AppShell**: Main layout wrapper containing header, sidebar, and content area
- **MainSection**: Primary content area component

### Feature Components
- **Project Management**
  - ProjectSelector
  - ProjectCard
  - CreateProjectButton
  - CreateProjectForm
  - ProjectEditDialog

- **Task Management**
  - TaskList
  - TasksCard
  - TaskCreateForm
  - TaskEditDialog

- **Milestone Management**
  - MilestoneCreateForm
  - MilestoneEditDialog

- **Visualization**
  - CrossProjectGantt (Gantt/)
  - DateRangePicker
  - MonteCarloPanel
  - RiskAdjustResultPanel

### UI Components
- **ui/ folder**: Low-level reusable components
  - Buttons, Forms, Modals
  - Dropdowns, Selects, Inputs
  - Cards, Panels, Sections

## Data Flow

### 1. API Communication Layer
```
Component → API Client (lib/api.ts)
    ↓
FastAPI Backend
    ↓
API Response → Component State
    ↓
UI Re-render
```

### 2. State Management
- **Local State**: `useState` for component-specific state
- **Shared State**: Custom hooks or Context API
- **Async Operations**: Callback functions for API interactions

### 3. Hook Architecture

Custom hooks handle cross-cutting concerns:
- Form validation and submission
- Data fetching and caching
- Window/DOM events
- Local storage persistence

## Code Organization Principles

### Separation of Concerns
- **Components**: UI rendering and user interaction
- **Hooks**: Stateful logic and side effects
- **Lib**: Pure utility functions and API client
- **Types**: Type definitions and interfaces

### Component Design Pattern

```typescript
// Props interface
interface MyComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
}

// Component implementation
export const MyComponent: React.FC<MyComponentProps> = ({ 
  title, 
  onSubmit 
}) => {
  // Component logic
  return (
    // JSX
  );
};
```

### Hook Pattern

```typescript
// Custom hook for shared logic
export const useMyFeature = () => {
  const [state, setState] = useState(initialState);
  
  const handleAction = useCallback(() => {
    // Logic here
  }, []);
  
  return { state, handleAction };
};
```

## Module Resolution

Vite automatically handles module resolution with these features:
- ES modules (ESM) for all imports
- Relative imports for same-directory files
- Path aliases can be configured in `vite.config.ts`

## Styling Strategy

### Tailwind CSS
- **Utility-first CSS**: Compose styles using utility classes
- **Responsive Design**: Mobile-first breakpoints
- **Custom Colors**: Extended palette in `tailwind.config.cjs`

### CSS Files
- `index.css`: Global styles and Tailwind directives
- Component-scoped CSS via Tailwind utilities

## Testing Architecture

### Component Testing
- Located in `components/__tests__/`
- Unit and integration tests
- Mocking API calls and hooks

### Test Utilities
- Testing Library for component testing
- Jest for test runners
- Mock data in `mocks/` folder

## TypeScript Configuration

### Strict Mode
- All type checking enabled
- Strict null checks
- No implicit `any`

### Path Aliases (Optional)
Configure in `tsconfig.json` for cleaner imports:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@lib/*": ["src/lib/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

## Build Process

### Development
```
npm run dev
↓
Vite dev server with HMR
↓
http://localhost:5173
```

### Production
```
npm run build
↓
TypeScript compilation + minification
↓
dist/ folder with optimized bundles
```

## Performance Considerations

### Code Splitting
- Automatic per-route code splitting
- Dynamic imports for lazy loading
- Chunk optimization

### Optimization Techniques
- Tree-shaking unused code
- CSS purging (Tailwind)
- Image optimization
- Bundle analysis

## Integration with Backend

The frontend integrates with the **FastAPI backend** through:
- RESTful API calls ([lib/api.ts](./api))
- JSON request/response format
- Authentication tokens (if implemented)
- Real-time updates (optional WebSocket)

## Next Steps

- [Component Documentation](./components) - Detailed component descriptions
- [API Integration Guide](./api) - Backend API endpoint reference
- [Setup & Development](./setup) - Installation and local development
