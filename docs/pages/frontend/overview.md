# Frontend Overview

The Lineo PM frontend is a modern, interactive **React application** built with **TypeScript** and **Vite**, featuring advanced project management capabilities including Gantt charts, Monte Carlo simulations, and comprehensive task management.

## Key Features

### 🎨 User Interface
- **Responsive Design**: Tailwind CSS for modern, mobile-friendly layouts
- **Interactive Components**: Reusable React components for consistent UX
- **Real-time Updates**: Dynamic state management for instant UI reflection

### 📊 Project Management
- **Gantt Charts**: Cross-project timeline visualization with drag-and-drop support
- **Milestone Planning**: Create and track project milestones
- **Task Management**: Hierarchical task organization with dependencies
- **Scenario Planning**: Multiple scenario simulation and comparison

### 📈 Advanced Analysis
- **Monte Carlo Simulation**: Risk analysis with probability distributions
- **Risk Adjustment**: Quantified risk assessment and mitigation
- **Date Range Picker**: Intuitive date selection with flexible range handling

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^18.3.1 |
| Language | TypeScript | ^5.5.3 |
| Build Tool | Vite | ^5.4.0 |
| Styling | Tailwind CSS | ^3.4.4 |
| Date Handling | Date-fns | ^3.6.0 |
| Calendars | React Day Picker | ^8.10.1 |

## Application Structure

The frontend is organized into well-defined layers:

```
src/
├── components/          # Reusable React components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and API client
├── mocks/              # Mock data for testing
├── types/              # TypeScript type definitions
├── assets/             # Images, fonts, and static content
├── App.tsx             # Root application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Core Concepts

### Component Architecture
- **Smart Components**: Container components handling state and API calls
- **Presentational Components**: Pure components focused on UI rendering
- **Composition**: Small, focused components combined for complex UIs

### State Management
- React Hooks (useState, useContext, useCallback)
- Props drilling for component communication
- Custom hooks for shared logic

### API Communication
- Centralized API client ([lib/api.ts](./api))
- Type-safe request/response handling
- Automatic error management

## Development Workflow

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Performance Optimizations

- **Code Splitting**: Vite handles automatic chunk splitting
- **Tree Shaking**: Unused code removal during build
- **Lazy Loading**: Dynamic imports for route-based code splitting
- **CSS Optimization**: Tailwind CSS purging unused styles

## Connected Services

The frontend communicates with the **FastAPI backend** via RESTful APIs:
- Project management endpoints
- Task CRUD operations
- Milestone and scenario APIs
- Monte Carlo simulation endpoints
- Task update tracking

See [API Integration Guide](./api) for detailed endpoint documentation.

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Next Steps

- [Architecture Deep Dive](./architecture) - Explore folder structure and module organization
- [Component Library](./components) - Detailed component documentation
- [API Integration](./api) - Backend API integration guide
- [Setup Guide](./setup) - Installation and development setup
