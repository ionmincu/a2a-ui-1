# A2A UI - Agent-to-Agent Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

Modern, production-ready UI for Google A2A (Agent-to-Agent) platform built with Next.js, TypeScript, and shadcn/ui. Features real-time chat, Phoenix tracing integration, and comprehensive agent management.

<img width="1624" alt="A2A UI Dashboard" src="https://github.com/user-attachments/assets/73572201-e0e5-46ab-8d6e-56ce543a6688" />

## ✨ Features

### 🤖 Agent Management
- Complete CRUD operations for AI agents
- Agent configuration and settings
- Real-time agent status monitoring
- Integration with various AI providers

### 💬 Chat Interface
- Telegram-style chat interface with auto-scrolling
- Streaming message support
- Message history and persistence
- Context-aware conversations
- File and media support

### 📊 Phoenix Tracing
- Real-time trace visualization
- Jaeger-style timeline view
- Graph-based trace relationships
- Project-based filtering
- Session-specific trace filtering

### 🎨 User Experience
- **Dark/Light theme** with system preference detection
- **Responsive design** optimized for all devices
- **Modern component architecture** with clear separation of concerns
- **Error boundaries** for graceful error handling
- **Loading states** and smooth animations

### 🔧 Developer Experience
- **TypeScript** with strict type checking
- **ESLint** configuration for code quality
- **Production-ready** build pipeline
- **Centralized logging** system
- **Environment validation**


## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/a2a-ui.git
   cd a2a-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# App Configuration
NEXT_PUBLIC_APP_NAME=A2A UI
NEXT_PUBLIC_APP_VERSION=1.0.0

# Phoenix Configuration (optional)
NEXT_PUBLIC_ARIZE_PHOENIX_URL=http://localhost:6006
```

### Agent Server Configuration

Configure your A2A agent server with CORS policies:

```python
from starlette.middleware.cors import CORSMiddleware

server = A2AServer(
    agent_card=agent_card,
    task_manager=AgentTaskManager(agent=QAAgent()),
    host=host,
    port=port,
)

# Add CORS middleware for development
server.app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your UI URL
    allow_methods=["*"],
    allow_headers=["*"],
)

server.start()
```

## 🎨 Theme System

The application features a comprehensive theme system:

- **Light Theme**: Clean, modern light interface
- **Dark Theme**: Eye-friendly dark interface
- **System Theme**: Automatically follows OS preference

### Theme Switching

Access the theme menu via the toggle button in the header:
- ☀️ Light mode
- 🌙 Dark mode  
- 🖥️ System preference

Preferences are automatically saved and persist across sessions.

## 📊 Phoenix Integration

### Setup Phoenix Tracing

1. **Install Phoenix** (if not already running)
   ```bash
   pip install arize-phoenix
   phoenix serve
   ```

2. **Configure in UI**
   - Navigate to Settings
   - Enable "Arize Phoenix Integration"
   - Set Phoenix URL (default: http://localhost:6006)

3. **View Traces**
   - Start a conversation with an agent
   - Open the Phoenix sidebar to view real-time traces
   - Switch between Jaeger timeline and graph views

## 🏗️ Architecture

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── chat/           # Chat-related components
│   ├── layout/         # Layout components
│   └── common/         # Shared components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
├── contexts/           # React contexts
└── a2a/                # A2A-specific logic
    ├── client.ts       # A2A API client
    ├── schema.ts       # Data schemas
    └── state/          # State management
```

### Key Technologies

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context + localStorage
- **Icons**: Lucide React
- **Validation**: Custom validation utilities

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript check
npm run clean        # Clean build artifacts
```

### Code Quality

- **ESLint**: Configured with Next.js recommended rules
- **TypeScript**: Strict mode enabled for better type safety
- **Error Boundaries**: Comprehensive error handling
- **Logging**: Environment-aware logging system

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with zero configuration

### Docker

```bash
# Build the image
docker build -t a2a-ui .

# Run the container
docker run -p 3000:3000 a2a-ui
```

### Docker Compose

```bash
docker-compose up
```
