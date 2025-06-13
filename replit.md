# Overview

This is a voice-based language learning application called "Obla" that helps users improve their English pronunciation and reading skills. The application combines web technologies with AI-powered speech assessment, text-to-speech synthesis, and facial animation capabilities. It's built as a full-stack web application with a React frontend and Express.js backend, utilizing Azure Speech Services, Supabase for authentication, and PostgreSQL for data storage.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side navigation
- **State Management**: React Context API for global state (Auth, Reading, Game, Settings, Difficulty)
- **UI Components**: Custom component library built on Radix UI and Tailwind CSS
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Audio Processing**: Custom hooks for recording, playback, and cross-browser compatibility
- **Build Tool**: Vite for development and production builds

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 20
- **API Design**: RESTful APIs with structured error handling
- **File Processing**: Multer for file uploads, FFmpeg for audio conversion
- **Session Management**: Express sessions with PostgreSQL storage
- **Middleware**: Custom authentication, CORS, and request logging

## Animation Services
- **Python Flask Server**: Separate animation server running on port 5050
- **Audio2Face Integration**: NVIDIA Audio2Face-3D for facial animation
- **Azure Visemes**: Real-time mouth shape animation based on speech phonemes

# Key Components

## Authentication System
- **Primary Provider**: Supabase Auth with Google OAuth integration
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Authorization**: JWT token verification with session fallback
- **User Management**: Complete signup/login flow with profile management

## Speech Processing Pipeline
- **Azure Speech Services**: Pronunciation assessment and text-to-speech synthesis
- **Audio Format Support**: Cross-browser recording (WebM, MP4, WAV)
- **FFmpeg Integration**: Server-side audio conversion for Azure compatibility
- **Pronunciation Scoring**: Detailed feedback on accuracy, fluency, completeness, and pronunciation

## Content Management
- **Dynamic Content Generation**: OpenAI GPT integration for creating reading materials
- **Difficulty Scaling**: 7-level system from beginner to advanced
- **Practice Types**: Individual words, phrases, and full reading passages
- **Progress Tracking**: User activity logging and performance analytics

## Game Elements
- **Level System**: Progressive difficulty with XP and achievements
- **Avatar Customization**: Character progression with unlockable rewards
- **Medal System**: Performance-based awards (Bronze, Silver, Gold)
- **Practice Groups**: User-created collections of words and phrases

# Data Flow

## User Registration/Authentication
1. User clicks "Continue with Google" → Supabase handles OAuth flow
2. Successful authentication creates/updates user record in PostgreSQL
3. Session established with encrypted cookies
4. Frontend receives user data and auth state

## Speech Assessment Flow
1. User records audio through browser MediaRecorder API
2. Audio blob sent to `/api/pronunciation/assess` endpoint
3. Server converts audio format using FFmpeg if needed
4. Azure Speech Service processes audio and reference text
5. Detailed pronunciation results returned to client
6. Results stored in database and displayed to user

## Content Generation
1. User selects difficulty level and content type
2. Backend calls OpenAI API with structured prompts
3. Generated content validated and stored in database
4. Content served to frontend with pronunciation guides

## Animation Pipeline
1. Text input processed through Azure Speech Service
2. Viseme events extracted during TTS synthesis
3. Animation data sent to Flask server for processing
4. NVIDIA Audio2Face generates facial animation
5. Combined audio and animation returned to client

# External Dependencies

## Cloud Services
- **Supabase**: Authentication, user management, and real-time features
- **Azure Speech Services**: TTS synthesis and pronunciation assessment
- **OpenAI GPT**: Content generation and language processing
- **Stripe**: Payment processing for premium subscriptions

## Media Processing
- **FFmpeg**: Audio format conversion and processing
- **NVIDIA Audio2Face**: 3D facial animation generation
- **MediaRecorder API**: Browser-based audio recording

## Database and Storage
- **PostgreSQL**: Primary database via Supabase
- **Drizzle ORM**: Type-safe database operations
- **Session Storage**: PostgreSQL-backed session management

# Deployment Strategy

## Development Environment
- **Replit**: Primary development platform with integrated database
- **Hot Reload**: Vite development server with HMR
- **Multi-Service**: Concurrent Express and Flask servers

## Production Configuration
- **Docker**: Containerized deployment with multi-stage builds
- **Port Configuration**: Express (5000), Animation Server (5050)
- **Environment Variables**: Secure credential management
- **Health Checks**: Readiness and liveness endpoints

## Scaling Considerations
- **Stateless Design**: Session data in database, not memory
- **Media Processing**: Offloaded to separate animation service
- **CDN Ready**: Static assets served efficiently
- **Database Connection Pooling**: Optimized PostgreSQL connections

# Changelog
- June 13, 2025. Initial setup

# User Preferences

Preferred communication style: Simple, everyday language.