# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obla is a speech therapy and pronunciation practice platform that combines AI-powered speech assessment with gamification elements. The application serves both individual users and therapists, offering personalized practice sessions, progress tracking, and therapeutic assignment management.

## General Guidance for Claude

**Your primary directive is to be efficient and effective.**
* **For high-level understanding, context gathering, and broad code analysis (especially involving multiple files or directories), you MUST use the Gemini CLI.** This leverages Gemini's massive context window and cost-effective tokens for the heavy lifting of reading and summarizing large codebases.
* **For detailed logic, planning, and specific code modifications, use your own reasoning capabilities.** Once Gemini provides the necessary context, you can then apply your intelligence to solve the problem, suggest changes, or generate code.
* Always refer to the Gemini CLI instructions below when planning your initial analysis steps.

---

## Development Commands

### Core Development
```bash
npm run dev          # Start development server (client + server)
npm run build        # Build for production (client + server)
npm run start        # Start production server
npm run check        # TypeScript type checking
Database Management
Bash

npm run db:push      # Push schema changes to database
Testing
Bash

npm test             # Run all tests
npm run test:client  # Run client-side tests (React Testing Library)
npm run test:server  # Run server-side tests (Node.js)
Architecture Overview
Monorepo Structure
client/: React frontend with TypeScript, Vite, Tailwind CSS

server/: Express.js backend with TypeScript

shared/: Shared TypeScript schemas and types (Drizzle ORM + Zod)

migrations/: Database migration files

api/: Additional services (NVIDIA Audio2Face animation server)

Key Technologies
Frontend: React 18, Vite, Tailwind CSS, Radix UI, TanStack Query

Backend: Express.js, PostgreSQL, Drizzle ORM

Authentication: Supabase Auth (Google OAuth)

Speech Processing: Azure Cognitive Services, ElevenLabs, OpenAI

Routing: Wouter (lightweight React router)

Backend Architecture
Route Structure
Routes are modular and located in server/routes/:

pronunciationRoutes.ts - Speech assessment, TTS synthesis (/api/pronunciation/*)

authRoutes.ts - Authentication and user management (/api/auth/*)

therapistRoutes.ts - Therapist-specific features (/api/therapist/*)

assignmentRoutes.ts - Assignment management (/api/assignments/*)

contentRoutes.ts - Content library management (/api/content/*)

userRoutes.ts - User data and statistics (/api/user/*)

voiceRoutes.ts - Voice synthesis (/api/voice/*)

visemeRoutes.ts - Facial animation data (/api/visemes/*)

Key Services
server/azure.ts: Azure Cognitive Services integration (speech assessment, TTS)

server/openai.ts: OpenAI API integration (content generation)

server/azureViseme.ts: Azure Speech SDK for viseme generation

server/supabaseAuth.ts: Authentication middleware

server/storage.ts: Activity tracking and database operations

Frontend Architecture
Core Structure
client/src/pages/: Main application routes (Words, Phrases, Reading, TherapistPortal)

client/src/components/: Reusable UI components including shadcn/ui

client/src/contexts/: Global state management (Auth, Settings, Game, Reading, Difficulty)

client/src/hooks/: Custom React hooks (audio recording, authentication, voice processing)

client/src/lib/: Utility functions, API clients, type definitions

Important Path Aliases
@/ → client/src/

@shared/ → shared/

@assets/ → client/src/assets/

Database Schema
Database schema is defined in shared/schema.ts using Drizzle ORM:

Core Tables
users: Authentication, roles (client/therapist/admin), subscription, gamification data

saved_words: User's saved practice words with folders

saved_phrases: User's saved practice phrases with folders

user_activities: Comprehensive activity tracking with detailed metrics

assignments: Therapist-assigned homework with progress tracking

assignment_items: Individual items within assignments

content_library: Therapist-created reusable practice materials

therapist_clients: Therapist-client relationships and invitations

Key Features
Role-based access control (client/therapist/admin)

Comprehensive activity tracking with detailed pronunciation metrics

Flexible content organization with folders and categories

Assignment workflow with progress monitoring

Speech Processing Pipeline
Text-to-Speech (TTS)
The TTS system has multiple fallback providers:

ElevenLabs (primary, if API key available)

Azure Speech Services (fallback)

OpenAI TTS (final fallback)

Important: All TTS endpoints use /api/pronunciation/synthesize, not /api/speech/synthesize

Speech Assessment
Uses Azure Cognitive Services for:

Real-time pronunciation scoring

Multi-dimensional feedback (pronunciation, accuracy, fluency, completeness)

Word-level analysis with phonetic breakdown

Syllabication support

Audio Processing
MediaRecorder API for audio capture

Real-time processing with Azure Speech Services

Viseme generation for facial animation

Speed control for playback

Key Application Features
Gamification System
Level progression with XP rewards

Avatar customization with unlockable cosmetics

Streak tracking and achievement badges

Interactive island map for level navigation

Therapist Portal
Client management with invitation system

Assignment creation and progress monitoring

Content library with AI-powered generation

Analytics dashboard for client performance

Reading Practice
Text-to-speech with pronunciation assessment

Adaptive difficulty based on performance

Progress tracking with detailed statistics

Testing Configuration
Client Testing (Jest + React Testing Library)
Configuration: jest.config.client.cjs

Environment: jsdom

Setup: jest.setup.client.cjs

Server Testing (Jest + Node.js)
Configuration: jest.config.server.cjs

Environment: node

Setup: jest.setup.server.cjs

Environment Variables
Key environment variables needed:

AZURE_SPEECH_KEY - Azure Cognitive Services

AZURE_SPEECH_REGION - Azure region

OPENAI_API_KEY - OpenAI API access

ELEVENLABS_API_KEY - ElevenLabs TTS

SUPABASE_URL - Supabase project URL

SUPABASE_ANON_KEY - Supabase anonymous key

DATABASE_URL - PostgreSQL connection string

STRIPE_SECRET_KEY - Stripe payments

Common Development Patterns
API Client Pattern
Frontend uses consistent fetch patterns with error handling:

TypeScript

const response = await fetch('/api/pronunciation/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ssml: ssmlText })
});
Error Handling
Server uses catchAsync wrapper for consistent error handling:

TypeScript

router.post('/endpoint', catchAsync(async (req, res) => {
  // Implementation
}));
Database Operations
Uses Drizzle ORM with shared schema:

TypeScript

import { db } from './db';
import { users } from '@shared/schema';
State Management
Uses React Context + TanStack Query for server state:

TypeScript

const { data, isLoading } = useQuery({
  queryKey: ['user-data'],
  queryFn: fetchUserData
});
Important Notes
Audio Processing
All audio processing happens through Azure Cognitive Services

MediaRecorder API is used for client-side recording

Audio files are processed as blobs and sent to backend endpoints

Authentication
Uses Supabase Auth with Google OAuth

JWT tokens are validated on backend routes

Role-based access control is implemented via middleware

Content Generation
OpenAI integration for AI-generated practice content

Memoization is used to cache generated content

Therapists can create and manage content libraries

Docker Support
Multi-stage builds with GPU support for NVIDIA services

Docker Compose for development environment

Health checks for readiness and liveness

Performance Considerations
TanStack Query for efficient data fetching and caching

Memoization for expensive operations

Optimized bundle splitting with Vite

Comprehensive error boundaries and fallbacks

Leveraging Gemini CLI for Codebase Analysis (PRIORITY)
Whenever you need to analyze large parts of the codebase, understand architectural patterns, or verify implementations across multiple files/directories, you MUST use the gemini CLI. This is crucial for efficiency and cost-effectiveness due to Gemini's extensive context window and cheaper tokens.

Your general workflow should be:

High-Level Task from User.

Determine if broad code analysis is needed. If so, construct a gemini -p command.

Execute gemini -p (or instruct the user to do so if you can't directly execute).

Analyze Gemini's output.

Formulate a plan or generate targeted code based on the comprehensive context provided by Gemini.

How to Use Gemini CLI:
Use the @ syntax to include files and directories in your Gemini prompts. Paths should be relative to your current working directory. For project-wide analysis, prefer including directories or using --all_files.

Examples of when to use gemini -p:
Initial Project Understanding: gemini -p "@./ Summarize the overall architecture and main dependencies of this Obla project."

Deep Dive into Specific Areas: gemini -p "@client/src/contexts/AuthContext.tsx @client/src/hooks/useAuth.ts @server/routes/authRoutes.ts @client/src/lib/supabaseClient.ts Explain the complete authentication flow, from frontend context to backend route handling, including Supabase integration."

Feature Verification: gemini -p "@client/src/pages/MyWordsNew.tsx @shared/schema.ts How does the 'My Journey' (MyWordsNew.tsx) page interact with user authentication and retrieve saved words from the database? Trace the data flow."

Error Diagnosis Across Layers: gemini -p "@client/src/ @server/ @shared/ Analyze potential reasons for authentication token mismatches or session management gaps given the frontend and backend setup. Focus on how tokens are passed and validated."

Key Directives for Using Gemini:
Prioritize Directory Inclusion: Instead of listing many individual files, include entire relevant directories (e.g., @client/src/, @server/routes/, @shared/) for a more holistic view.

Be Specific in Your Gemini Prompt: While including broad context, make your prompt to Gemini clear about the information you need from it (e.g., "explain the flow," "identify integration points," "trace data").

Interpret Gemini's Output: Remember, Gemini provides the raw, comprehensive analysis. Your role is to synthesize that information into actionable plans or targeted code.

No --yolo for Read-Only Analysis: As noted, gemini -p is for read-only analysis and doesn't require --yolo.