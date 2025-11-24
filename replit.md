# FreshMart - Online Grocery Shopping Platform

## Overview

FreshMart is a full-stack online grocery shopping application built with React, Express, and PostgreSQL. The application allows users to browse products by category, search for items, manage a shopping cart, and place orders with delivery information. It features authentication via Replit's OpenID Connect, a responsive UI built with shadcn/ui components, and a RESTful API architecture.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server, configured to serve from the `/client` directory
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TailwindCSS v4** for styling with custom design tokens

**State Management**
- **TanStack Query (React Query)** for server state management, data fetching, and caching
- Query client configured with infinite stale time and disabled automatic refetching
- Custom query functions handle 401 responses for authentication flows

**UI Component Library**
- **shadcn/ui** components built on Radix UI primitives
- Custom theme configuration with CSS variables for light/dark mode support
- Component aliases configured in `components.json` pointing to `@/components`

**Key Pages & Features**
- Landing page for unauthenticated users with call-to-action
- Shop page with product browsing, category filtering, and search
- Cart management with quantity updates and item removal
- Checkout flow with delivery address collection and order placement
- User profile management with order history

### Backend Architecture

**Server Framework**
- **Express.js** server with TypeScript
- Dual-mode setup: development (`index-dev.ts`) with Vite middleware, production (`index-prod.ts`) serving static files
- Custom logging middleware for API request tracking
- JSON body parsing with raw body preservation for webhook support

**Database Layer**
- **Drizzle ORM** for type-safe database operations
- **Neon Serverless Postgres** as the database provider with WebSocket support
- Schema definitions in `/shared/schema.ts` for code sharing between client and server
- Migrations stored in `/migrations` directory

**Database Schema**
- `users`: User profiles with delivery information
- `categories`: Product categories with slugs and images
- `products`: Product catalog with pricing, stock, and availability
- `cartItems`: User shopping cart with product references
- `orders`: Order records with delivery details and status
- `orderItems`: Line items for each order
- `sessions`: Session storage for authentication (connect-pg-simple)

**API Design**
- RESTful endpoints organized in `/server/routes.ts`
- Authentication middleware (`isAuthenticated`) protecting sensitive routes
- Storage abstraction layer (`/server/storage.ts`) encapsulating all database operations
- Validation using Zod schemas generated from Drizzle schemas via `drizzle-zod`

### Authentication & Authorization

**Authentication Provider**
- **Replit OpenID Connect (OIDC)** integration via `openid-client`
- Passport.js strategy for OAuth flow management
- Session-based authentication with PostgreSQL session store

**Session Management**
- 7-day session TTL with HTTP-only, secure cookies
- Sessions stored in database `sessions` table
- User claims and tokens stored in session for API access
- Automatic token refresh handling

**Authorization Flow**
- Unauthenticated users see landing page
- Login redirects to `/api/login` (Replit OIDC flow)
- Authenticated routes protected by `isAuthenticated` middleware
- User auto-provisioned in database on first login

### External Dependencies

**Database**
- **Neon Serverless PostgreSQL**: Managed PostgreSQL database with WebSocket connection support
- Environment variable `DATABASE_URL` required for connection
- Connection pooling via `@neondatabase/serverless` package

**Authentication**
- **Replit OIDC**: OAuth 2.0 / OpenID Connect provider
- Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`
- Discovery endpoint at `https://replit.com/oidc`

**Third-Party Libraries**
- **Radix UI**: Headless component primitives for accessible UI
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **Zod**: Schema validation for forms and API payloads
- **React Hook Form**: Form state management with Zod resolver

**Development Tools**
- **@replit/vite-plugin-cartographer**: Development navigation
- **@replit/vite-plugin-dev-banner**: Development environment indicator
- **@replit/vite-plugin-runtime-error-modal**: Runtime error overlay

**Build & Deployment**
- Production build compiles client to `/dist/public` and server to `/dist/index.js`
- esbuild bundles server code with external packages
- Static file serving in production mode via Express