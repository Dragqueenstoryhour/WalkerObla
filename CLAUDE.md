# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obla is a speech therapy and pronunciation practice platform that combines AI-powered speech assessment with gamification elements. The application serves both individual users and therapists, offering personalized practice sessions, progress tracking, and therapeutic assignment management.

## Core Directives for Claude Code

### 1. Efficiency Strategy (CRITICAL)
**Use Gemini CLI for broad analysis, your intelligence for targeted work:**

- **ALWAYS use `gemini -p` first** for:
  - Initial project understanding
  - Multi-file/directory analysis
  - Architecture comprehension
  - Cross-layer debugging
  - Feature implementation planning

- **Use your reasoning** for:
  - Specific code generation
  - Detailed implementation logic
  - Targeted bug fixes
  - Code optimization

### 2. Common Workflow Pattern
```bash
# Step 1: Broad analysis with Gemini
gemini -p "@client/src/contexts/ @server/routes/ Explain the authentication flow"

# Step 2: Target your work based on Gemini's findings
# Then generate specific code or fixes
```

### 3. File System Navigation
**Current Working Directory Context:**
- Root contains: `client/`, `server/`, `shared/`, `migrations/`, `api/`
- Use relative paths: `@client/src/pages/` not `@./client/src/pages/`
- Prefer directory inclusion over individual files

---

## Quick Reference Commands

### Development
```bash
npm run dev          # Start development server (client + server)
npm run build        # Build for production
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes
npm test             # Run all tests
```

### Gemini CLI Examples
```bash
# Project overview
gemini -p "@./ --all_files Summarize the Obla project architecture"

# Authentication flow
gemini -p "@client/src/contexts/AuthContext.tsx @server/routes/authRoutes.ts @server/supabaseAuth.ts Trace the complete auth flow"

# Speech processing pipeline  
gemini -p "@server/azure.ts @client/src/hooks/useRecording.ts @server/routes/pronunciationRoutes.ts How does speech assessment work end-to-end?"

# Database operations
gemini -p "@shared/schema.ts @server/storage.ts @client/src/lib/ Explain data persistence patterns"
```

---

## Architecture Quick Facts

### Tech Stack
- **Frontend:** React 18 + Vite + Tailwind + Radix UI + TanStack Query
- **Backend:** Express.js + PostgreSQL + Drizzle ORM  
- **Auth:** Supabase (Google OAuth)
- **Speech:** Azure Cognitive Services + ElevenLabs + OpenAI

### Key Path Aliases
```typescript
@/ → client/src/
@shared/ → shared/
@assets/ → client/src/assets/
```

### Route Structure
```
/api/pronunciation/* - Speech assessment, TTS
/api/auth/*         - Authentication  
/api/therapist/*    - Therapist features
/api/assignments/*  - Assignment management
/api/content/*      - Content library
/api/user/*         - User data
/api/voice/*        - Voice synthesis
/api/visemes/*      - Facial animation
```

### Database Schema (shared/schema.ts)
- `users` - Auth, roles, gamification
- `saved_words/phrases` - User practice content
- `user_activities` - Detailed progress tracking
- `assignments` - Therapist homework system
- `content_library` - Reusable practice materials
- `therapist_clients` - Client relationships

---

## Critical Implementation Details

### TTS Pipeline (IMPORTANT)
**Endpoint:** `/api/pronunciation/synthesize` (NOT `/api/speech/synthesize`)
**Fallback order:** ElevenLabs → Azure → OpenAI

### Speech Assessment
- Uses Azure Cognitive Services
- Multi-dimensional scoring (pronunciation, accuracy, fluency, completeness)
- Word-level phonetic analysis
- Real-time processing

### Error Handling Pattern
```typescript
// Server routes use catchAsync wrapper
router.post('/endpoint', catchAsync(async (req, res) => {
  // Implementation
}));

// Frontend uses consistent fetch with error handling
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### State Management
- React Context + TanStack Query
- Server state caching with query keys
- Role-based access control via middleware

---

## Environment Variables Checklist
```bash
AZURE_SPEECH_KEY=         # Azure Cognitive Services
AZURE_SPEECH_REGION=      # Azure region
OPENAI_API_KEY=          # OpenAI access
ELEVENLABS_API_KEY=      # ElevenLabs TTS
SUPABASE_URL=            # Supabase project
SUPABASE_ANON_KEY=       # Supabase anonymous key
DATABASE_URL=            # PostgreSQL connection
STRIPE_SECRET_KEY=       # Payments
```

---

## Testing Configuration

### Client Tests
- Config: `jest.config.client.cjs`
- Environment: jsdom  
- Setup: `jest.setup.client.cjs`
- Command: `npm run test:client`

### Server Tests
- Config: `jest.config.server.cjs`
- Environment: node
- Setup: `jest.setup.server.cjs`
- Command: `npm run test:server`

---

## Gemini Integration Strategy

### When to Use Gemini CLI
✅ **USE GEMINI FOR:**
- Understanding file relationships across directories
- Tracing data flows through multiple layers
- Analyzing architectural patterns
- Debugging cross-component issues
- Planning complex feature implementations

### Effective Gemini Prompts
```bash
# Good: Broad context with specific question
gemini -p "@client/src/ @server/routes/ How does user authentication work from login button to protected route?"

# Better: Include schema for data flow questions  
gemini -p "@client/src/pages/Reading.tsx @shared/schema.ts @server/routes/ Trace how reading progress is saved and retrieved"

# Best: Full context for complex debugging
gemini -p "@client/src/contexts/ @server/ @shared/ Identify why pronunciation scores might not be persisting correctly"
```

### After Gemini Analysis
1. **Synthesize** Gemini's findings into actionable insights
2. **Plan** your specific implementation approach  
3. **Generate** targeted code based on the comprehensive context
4. **Validate** against the architectural patterns Gemini identified

---

## Performance & Best Practices

### Frontend Patterns
- TanStack Query for server state
- Memoization for expensive operations
- Error boundaries for resilience
- Optimized bundle splitting with Vite

### Backend Patterns
- Drizzle ORM with shared schemas
- CatchAsync wrapper for error handling
- Role-based middleware
- Comprehensive activity tracking

### Audio Processing
- MediaRecorder API for capture
- Azure SDK for real-time processing  
- Blob handling for audio data
- Viseme generation for animation

---

## Troubleshooting Common Issues

### Authentication Problems
```bash
gemini -p "@client/src/contexts/AuthContext.tsx @server/supabaseAuth.ts @client/src/lib/supabaseClient.ts Debug authentication token flow"
```

### Speech Processing Issues  
```bash
gemini -p "@server/azure.ts @client/src/hooks/useRecording.ts @server/routes/pronunciationRoutes.ts Analyze speech assessment pipeline for errors"
```

### Database Connection Problems
```bash
gemini -p "@server/db.ts @shared/schema.ts @server/storage.ts Check database configuration and connection patterns"
```

Remember: **Gemini for context, Claude for code!**