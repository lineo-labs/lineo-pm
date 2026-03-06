# Lineo PM Documentation

Welcome to the Lineo PM (Project Management System) documentation. This comprehensive guide covers both the **React frontend** and **Python backend** components of the application.

## Quick Start

### Frontend Setup
The frontend is a modern React application built with Vite, featuring Gantt charts, Monte Carlo simulations, and project management interfaces.

[→ Frontend Documentation](./frontend/overview)

### Backend Setup  
The backend is a FastAPI application with PostgreSQL database, Celery task queue, and comprehensive REST APIs.

[→ Backend Documentation](./backend/overview)

## Project Overview

**Lineo PM** is an integrated project management platform that combines:

- **React + TypeScript Frontend**: Interactive UI with Gantt charts, scenario planning, and Monte Carlo analysis
- **Python FastAPI Backend**: Robust REST APIs with async task processing and PostgreSQL persistence
- **Real-time Simulation**: Monte Carlo analysis engine for risk assessment
- **Project Timeline Visualization**: Advanced Gantt chart rendering for cross-project planning

## Architecture Highlights

### Frontend Stack
- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Modular component architecture

### Backend Stack
- FastAPI (async Python web framework)
- PostgreSQL database with SQLAlchemy ORM
- Celery for background tasks
- Redis for caching and task queue
- Pydantic for data validation

## Getting Started

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- PostgreSQL 12+ (for database)
- Docker & Docker Compose (optional, for containerized setup)

### Development Environment

Both frontend and backend include comprehensive setup documentation. Refer to the respective sections for detailed instructions on:
- Installation and configuration
- Running development servers
- Building for production
- Testing and debugging

## Documentation Structure

```
Frontend
├── Overview - Architecture and features
├── Components - Component library documentation
├── Hooks & Utilities - Custom hooks and helper functions
├── API Integration - Backend API client
└── Setup Guide - Installation and development

Backend
├── Overview - API architecture and concepts
├── Database - Models and schema
├── API Endpoints - REST endpoint reference
├── Services - Business logic layer
└── Setup Guide - Installation and deployment
```

## Key Features

✅ Multi-project Gantt chart visualization  
✅ Milestone and task management  
✅ Monte Carlo simulation and risk analysis  
✅ Real-time progress tracking  
✅ RESTful API with comprehensive validation  
✅ Async task processing with Celery  
✅ PostgreSQL data persistence  

---

**Happy coding!** For questions or issues, refer to the detailed documentation sections.
