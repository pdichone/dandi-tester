# Authentication & RBAC Audit Report

## Current State Analysis

### Authentication System
- **Library**: NextAuth v4.24.7 with Google OAuth provider
- **Session Management**: Server-side sessions via `getServerSession()`
- **User Storage**: Supabase `users` table (id, email, name, image, created_at)

### Current Auth Flow

#### 1. Authentication Entry Points
- **NextAuth Route**: `/api/auth/[...nextauth]/route.ts`
  - Handles Google OAuth sign-in
  - Auto-creates users in Supabase on first sign-in
  - No role assignment on user creation

#### 2. Middleware
- **Location**: `src/middleware.ts`
- **Status**: **DISABLED** - Currently just returns `NextResponse.next()`
- **Matcher**: `/dashboards` (but doesn't actually protect anything)
- **Issue**: No route protection at middleware level

#### 3. Auth Utilities
- **Location**: `src/app/lib/auth.ts`
- **Function**: `getSessionUser()`
  - Checks NextAuth session
  - Queries Supabase for user by email
  - **Dev Fallback**: Creates/uses dev user if `ALLOW_ANON_API_KEYS=true` or `NODE_ENV=development`
  - Returns: `{ id: string } | null` (no role information)

#### 4. API Routes Authorization

**Protected Routes** (require authentication):
- `/api/api-keys` (GET, POST)
- `/api/api-keys/[id]` (GET, PUT, DELETE)
- `/api/usage-insights` (GET)

**Public Routes** (no auth required):
- `/api/validate-key` (POST) - validates API key only
- `/api/github-summarizer` (POST) - accepts API key or uses OPENAI_API_KEY

**Authorization Pattern**:
```typescript
const user = await getSessionUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// Then filter by user_id in queries
.eq('user_id', user.id)
```

### Current RBAC Implementation
**Status**: **NONE**
- No role system in database schema
- No role checks in code
- No permission system
- Users can only access their own resources (enforced by `user_id` filtering)

### Security Issues Identified

1. **Middleware Disabled**: Routes are not protected at middleware level
2. **No Role System**: Cannot implement role-based access control
3. **Dev User Fallback**: Security risk if misconfigured in production
4. **Inconsistent Auth**: Some routes check auth, some don't
5. **No Type Safety**: User objects don't include role information
6. **No Centralized Auth**: Each route implements auth checks independently
7. **Missing Authorization Utilities**: No reusable `requireAuth`, `requireRole`, etc.
8. **RLS Policies Too Permissive**: Supabase RLS allows all operations for all users

### Database Schema Analysis

**Current `users` table**:
```sql
create table public.users (
  id uuid primary key,
  email text not null unique,
  name text,
  image text,
  created_at timestamptz default now()
  -- NO role field
);
```

**Current RLS Policies**:
- Allows ALL operations for ALL users (too permissive)
- No role-based restrictions

## Proposed Refactor

### 1. Add Role System to Database
- Add `role` column to `users` table (enum: 'user', 'admin')
- Default role: 'user'
- Update RLS policies to be more restrictive

### 2. Create Centralized Auth Utilities
- `getSessionUser()` - returns user with role
- `requireAuth()` - throws if not authenticated
- `requireRole(role)` - throws if user doesn't have required role
- `hasRole(user, role)` - checks if user has role
- Type-safe user interfaces

### 3. Implement Proper Middleware
- Protect routes at middleware level
- Redirect unauthenticated users to sign-in
- Allow public routes (API routes that use API keys)

### 4. Update NextAuth Configuration
- Include role in session
- Update session callback to fetch role from database

### 5. Refactor API Routes
- Use centralized auth utilities
- Consistent error handling
- Add role checks where needed (e.g., admin-only endpoints)

### 6. Improve Security
- Remove or secure dev user fallback
- Implement proper RLS policies
- Add rate limiting considerations
- Ensure all protected routes are properly secured

### 7. Add Tests
- Test auth utilities
- Test middleware
- Test role-based access
- Test API route authorization
