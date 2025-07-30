# TrampoAqui - Sistema Web para Contratação de Serviços Gerais

## Overview

TrampoAqui is a community-focused web platform that connects service providers with clients seeking general services. The application facilitates transparent, secure, and efficient hiring of local professionals like electricians, plumbers, cleaners, painters, gardeners, handymen, and construction workers. Built as a full-stack TypeScript application, it features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 30, 2025)

### Unified Account System Implementation
- **Database Schema**: Migrated from `userType` enum to `isProviderEnabled` boolean field
- **Registration Flow**: Removed provider/client choice during signup - all users start as clients
- **Provider Enablement**: Added ability to enable provider capabilities from unified dashboard
- **Authentication**: Updated JWT tokens to include `isProviderEnabled` instead of `userType`
- **New Dashboard**: Created `/dashboard` route with tabs for client requests and provider enablement
- **API Endpoints**: Added `/api/auth/enable-provider` endpoint for upgrading accounts

### Architecture Changes
- All users now start with `isProviderEnabled: false`
- Users can enable provider capabilities through dashboard interface
- Single account can be both client and provider
- Provider dashboard accessible only after enabling provider capabilities

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components based on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful APIs with JWT authentication
- **Middleware**: Custom logging, error handling, and authentication middleware

## Key Components

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Connection pooling with @neondatabase/serverless

### Authentication System
- **Strategy**: JWT-based authentication with bcrypt password hashing
- **User Types**: Client and service provider roles
- **Session Management**: Token-based with localStorage persistence
- **Authorization**: Route-level protection with middleware

### UI Component System
- **Design System**: shadcn/ui with "new-york" style variant
- **Icons**: Lucide React icons with FontAwesome fallbacks
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Theming**: CSS custom properties with light/dark mode support

## Data Flow

### User Registration/Authentication Flow
1. User selects account type (client or provider)
2. Form validation with Zod schemas
3. Password hashing with bcrypt
4. JWT token generation and storage
5. Automatic redirection to appropriate dashboard

### Service Discovery Flow
1. Clients browse service categories or search
2. Filter providers by location, rating, and availability
3. View provider profiles with ratings and reviews
4. Submit service requests with project details
5. Real-time status updates and messaging

### Service Provider Workflow
1. Complete profile setup with category selection
2. Manage service requests through dashboard
3. Update availability and hourly rates
4. Track earnings and review statistics
5. Respond to client messages and requests

## External Dependencies

### Core Framework Dependencies
- React ecosystem (React, React DOM, React Query)
- Express.js with TypeScript support
- Drizzle ORM with PostgreSQL driver

### UI and Styling
- Radix UI primitives for accessible components
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography

### Development Tools
- Vite with React plugin for fast development
- TypeScript for type safety
- ESBuild for production bundling
- Replit development plugins for cloud IDE integration

### Database and Authentication
- Neon PostgreSQL serverless database
- JWT for stateless authentication
- bcrypt for secure password hashing
- connect-pg-simple for session management

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Express server with nodemon-like functionality via tsx
- Database migrations with Drizzle Kit
- Environment variable management for database connections

### Production Build Process
1. Frontend build with Vite (outputs to dist/public)
2. Backend bundling with ESBuild (outputs to dist/index.js)
3. Static file serving through Express
4. Database schema deployment with Drizzle migrations

### Environment Configuration
- **Development**: NODE_ENV=development with Vite dev server
- **Production**: NODE_ENV=production with pre-built assets
- **Database**: DATABASE_URL environment variable required
- **Security**: JWT_SECRET for token signing

The application is designed for deployment on platforms like Replit, with specific configurations for cloud IDE development and production hosting. The architecture supports both monorepo development and separate deployment of frontend/backend components.