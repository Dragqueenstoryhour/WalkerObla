# Supabase Authentication Implementation

This document outlines the changes made to replace Replit Auth with Supabase Auth for user authentication.

## Changes Made

### Backend

1. **Supabase Client**:
   - Created `server/supabaseClient.ts` to handle Supabase API interactions
   - Used environment variables for Supabase URL and anon key

2. **Authentication Middleware**:
   - Created `server/supabaseAuth.ts` for auth-related functionality
   - Implemented session management with Express sessions
   - Added middleware for protected routes
   - Created endpoints for signup, login, logout, and user info

3. **API Endpoints**:
   - `/api/auth/signup` - User registration
   - `/api/auth/login` - User login
   - `/api/auth/logout` - User logout
   - `/api/auth/user` - Get current user data
   - `/api/auth/config` - Get Supabase client configuration

4. **Route Updates**:
   - Updated all protected routes to use the new auth middleware
   - Changed user ID references from `req.user.claims.sub` to `req.session.user.id`

### Frontend

1. **Supabase Client**:
   - Created `client/src/lib/supabaseClient.ts` for frontend Supabase interactions

2. **Authentication Context**:
   - Created `client/src/contexts/AuthContext.tsx` for app-wide auth state
   - Implemented hooks for login, signup, logout, and checking auth status

3. **Auth Components**:
   - Updated `client/src/components/AuthButtons.tsx` with login/signup forms
   - Improved error handling and loading states

4. **Pages and Components**:
   - Updated components to use the new auth context
   - Migrated from `useAuth` hook to `useAuthContext` hook
   - Added appropriate protected route handling

## How It Works

1. **User Registration**:
   - User provides email, password, and profile information
   - Data is sent to the Supabase Auth API
   - On success, a session is created
   - User data is stored in our database

2. **User Login**:
   - User provides email and password
   - Credentials are verified against Supabase Auth
   - On success, a session is created with user data

3. **Protected Routes**:
   - Middleware checks for valid session
   - Routes return 401 if no valid session exists
   - Authenticated requests include user data

4. **Session Management**:
   - Sessions are stored in the PostgreSQL database
   - Cookies are used to identify sessions
   - Sessions expire after a configurable time period

## Testing

You can test the authentication system using the provided test script:
```javascript
// test-supabase-auth.js
node test-supabase-auth.js
```

## Configuration

The Supabase Auth implementation requires the following environment variables:
- `DATABASE_URL` - The URL to your Supabase database
- `SESSION_SECRET` - A secret for securing session cookies

For development purposes, placeholder values are used if these are not available.

## Security Considerations

1. All passwords are hashed by Supabase Auth
2. Sessions are stored securely
3. Authentication state is properly managed
4. CSRF protection is implemented
5. Secure cookies are used in production