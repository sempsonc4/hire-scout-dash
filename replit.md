# Overview

This is a modern full-stack job search automation platform that combines role discovery with contact enrichment and outreach capabilities. The application features a React frontend with shadcn/ui components, an Express.js backend with PostgreSQL database, and integrates with external APIs for job searching and contact enrichment. The system allows users to search for jobs via Google Jobs API, automatically enrich company contact information through Apollo, and generate personalized outreach messages for recruiting purposes.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/bundling
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system focused on professional recruiting aesthetics
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: React Router for client-side navigation
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based with JWT tokens for frontend communication
- **API Design**: RESTful endpoints with webhook support for external integrations
- **File Structure**: Monorepo approach with shared schema definitions between client and server

## Database Schema
- **Core Tables**: users, companies, runs, jobs, contacts, outreach_messages
- **Enums**: run_status, email_status, message_status, severity for type safety
- **Relationships**: Companies linked to jobs and contacts, runs tracking search operations
- **Search Tracking**: Run-based system with view tokens for secure data access

## Data Flow
- **Job Search**: Webhook-initiated searches create runs with unique IDs and view tokens
- **Contact Enrichment**: Apollo API integration for company contact discovery
- **Message Generation**: AI-powered outreach message creation with template management
- **Real-time Updates**: Status tracking for search runs and message delivery

## External Dependencies

- **Job Search**: Google Jobs API via SerpAPI for role discovery
- **Contact Enrichment**: Apollo API for company contact information
- **AI Services**: OpenAI API for intelligent message generation and data enrichment
- **Database**: PostgreSQL for persistent data storage
- **UI Components**: Radix UI primitives for accessible component foundation
- **Development Tools**: Replit-specific tooling for development environment integration