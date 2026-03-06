# Frontend Components

## Component Library Reference

### Core Layout Components

#### AppShell
**File**: `components/AppShell.tsx`

Main application wrapper component that provides the overall layout structure including header, sidebar, and content area.

**Features**:
- Layout management
- Navigation integration
- Responsive design

**Props**:
```typescript
interface AppShellProps {
  children: React.ReactNode;
  // Additional props
}
```

**Usage**:
```typescript
<AppShell>
  <MainSection />
</AppShell>
```

---

#### MainSection
**File**: `components/MainSection.tsx`

Primary content area component that displays the main application content.

**Features**:
- Content layout
- Responsive container
- Integration point for main features

---

#### Sidebar
**File**: `components/Sidebar.tsx`

Navigation sidebar component for app navigation and project/task selection.

**Features**:
- Navigation links
- Project list with selection
- Collapsible menu items

---

### Project Management Components

#### ProjectCard
**File**: `components/ProjectCard.tsx`

Displays a single project with key information and quick action buttons.

**Features**:
- Project summary display
- Edit/delete actions
- Status indicators
- Team member display

**Props**:
```typescript
interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}
```

---

#### ProjectSelector
**File**: `components/ProjectSelector.tsx`

Dropdown component for selecting between multiple projects.

**Features**:
- Project filtering
- Search functionality
- Quick selection
- Multi-project support

**Props**:
```typescript
interface ProjectSelectorProps {
  projects: Project[];
  selected: Project | null;
  onSelect: (project: Project) => void;
}
```

---

#### CreateProjectButton
**File**: `components/CreateProjectButton.tsx`

Button trigger for creating a new project.

**Features**:
- Project creation trigger
- Modal/dialog integration

**Usage**:
```typescript
<CreateProjectButton onProjectCreated={handleNewProject} />
```

---

#### CreateProjectForm
**File**: `components/CreateProjectForm.tsx`

Form component for creating new projects.

**Features**:
- Project name input
- Description field
- Start/end date selection
- Form validation
- Submit handling

**Fields**:
- Project Name (required)
- Description (optional)
- Start Date
- End Date

---

#### ProjectEditDialog
**File**: `components/ProjectEditDialog.tsx`

Modal dialog for editing existing project details.

**Features**:
- Edit project properties
- Confirm/cancel actions
- Form validation

---

### Task Management Components

#### TaskList
**File**: `components/TaskList.tsx`

Displays a list of tasks with filtering and sorting options.

**Features**:
- Task listing with status indicators
- Sorting options
- Filter controls
- Task selection

**Props**:
```typescript
interface TaskListProps {
  projectId: string;
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
}
```

---

#### TasksCard
**File**: `components/TasksCard.tsx`

Card component displaying task summary or details.

**Features**:
- Task information display
- Progress indicator
- Quick action buttons
- Status badges

---

#### TaskCreateForm
**File**: `components/TaskCreateForm.tsx`

Form for creating new tasks within a project.

**Features**:
- Task name input
- Description
- Assignee assignment
- Date assignment
- Priority setting
- Dependency linking

**Fields**:
- Task Name (required)
- Description
- Start Date
- End Date
- Assignee
- Priority (Low, Medium, High)
- Dependencies

---

#### TaskEditDialog
**File**: `components/TaskEditDialog.tsx`

Modal for editing task details.

**Features**:
- Edit task properties
- Update task status
- Change assignments

---

### Milestone Components

#### MilestoneCreateForm
**File**: `components/MilestoneCreateForm.tsx`

Form for creating new project milestones.

**Features**:
- Milestone name input
- Target date selection
- Description
- Form validation

**Fields**:
- Milestone Name (required)
- Target Date
- Description
- Status

---

#### MilestoneEditDialog
**File**: `components/MilestoneEditDialog.tsx`

Dialog for editing milestone information.

**Features**:
- Update milestone details
- Change target date
- Edit description

---

### Visualization Components

#### CrossProjectGantt
**File**: `components/CrossProjectGantt.tsx`

Advanced Gantt chart component displaying multiple projects and tasks.

**Features**:
- Timeline visualization
- Multiple project display
- Task dependency visualization
- Drag-and-drop task scheduling
- Zoom and pan controls
- Critical path highlighting

**Props**:
```typescript
interface CrossProjectGanttProps {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  onTaskUpdate: (task: Task) => void;
  dateRange?: DateRange;
}
```

**Gantt/ Sub-components**:
- `GanttChart.tsx` - Main chart rendering
- `GanttTimeline.tsx` - Timeline header
- `GanttRow.tsx` - Individual task row
- `GanttBar.tsx` - Task bar visualization

---

#### DateRangePicker
**File**: `components/DateRangePicker.tsx`

Interactive date range selection component.

**Features**:
- Calendar interface
- Range selection
- Preset ranges (Today, This Week, This Month, This Year)
- Date input fields
- Validation

**Props**:
```typescript
interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
  presets?: DatePreset[];
}
```

**Utility**: Uses [dateRange.ts](./lib/dateRange.ts) for date calculations.

---

### Analysis Components

#### MonteCarloPanel
**File**: `components/MonteCarloPanel.tsx`

Panel for configuring and displaying Monte Carlo simulation results.

**Features**:
- Simulation parameter input
- Results visualization
- Probability distribution graphs
- Duration range prediction
- Risk assessment

**Props**:
```typescript
interface MonteCarloPanelProps {
  project: Project;
  tasks: Task[];
  onSimulationRun: (results: SimulationResults) => void;
}
```

---

#### RiskAdjustResultPanel
**File**: `components/RiskAdjustResultPanel.tsx`

Displays risk-adjusted results and recommendations.

**Features**:
- Risk adjustment visualization
- Confidence levels
- Recommendation display
- Duration adjustments

---

### Form & Selection Components

#### MultiSelectDropdown
**File**: `components/MultiSelectDropdown.tsx`

Reusable multi-select dropdown component.

**Features**:
- Multiple item selection
- Search/filter within dropdown
- Tag display for selected items
- Clear selection
- Keyboard navigation

**Props**:
```typescript
interface MultiSelectDropdownProps<T> {
  items: T[];
  selected: T[];
  onSelect: (items: T[]) => void;
  renderItem: (item: T) => string;
  placeholder?: string;
}
```

---

### UI Components (ui/ folder)

Primitive reusable UI components:

- **Button**: Standard button component with variants
- **Input**: Text input field with validation
- **Select**: Dropdown selector
- **Form**: Form wrapper with validation
- **Modal**: Modal dialog wrapper
- **Card**: Card container component
- **Badge**: Status/label badge
- **Tooltip**: Hover tooltip component
- **Loading**: Loading spinner/skeleton
- **Alert**: Alert message component

**Example Usage**:
```typescript
import { Button, Input, Modal } from '@components/ui';

<Modal open={isOpen} onClose={onClose}>
  <Input 
    value={name} 
    onChange={(e) => setName(e.target.value)} 
    placeholder="Enter name"
  />
  <Button onClick={handleSubmit}>Submit</Button>
</Modal>
```

---

## Component Patterns

### Props Distribution
- Props should be minimal and focused
- Use TypeScript interfaces for type safety
- Provide sensible defaults

### Event Handling
- Use `on*` prefix for callback props
- Pass relevant data to callbacks
- Handle loading and error states

### Error Boundaries
- Wrap feature components with error boundaries
- Display user-friendly error messages
- Provide recovery actions

### Accessibility
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Focus management

---

## Next Steps

- [API Integration Guide](./api) - How components fetch and update data
- [Setup & Development](./setup) - Running the frontend locally
- [Architecture Deep Dive](./architecture) - Broader architectural patterns
