# Ark Connect Assistant

An **Agentic AI Assistant** for the Ark Connect platform — built with a multi-agent orchestration architecture powered by Google Gemini.

## Architecture

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | React + Vite | Chat UI with suggested questions & feedback |
| **Backend** | Node.js + Express | Orchestrator, specialist agents, REST API |
| **AI** | Google Gemini API | Natural-language understanding & generation |
| **Database** | PostgreSQL | Knowledge base, feedback & learning store |

## Project Structure

```
ark-connect-assistant/
├── frontend/          # React (Vite) chat interface
│   └── src/
│       ├── components/   # ChatWindow, MessageBubble, etc.
│       ├── App.jsx
│       └── main.jsx
├── backend/           # Node.js API server
│   ├── agents/        # FAQ, Features, Onboarding, Roles agents
│   ├── database/      # PostgreSQL connection & seed scripts
│   ├── routes/        # Chat, features, feedback, suggestions
│   └── services/      # Gemini integration, orchestrator, learning
├── docker-compose.yml # PostgreSQL container setup
└── README.md
```

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Gokula9965/ark-connect-assistant.git
cd ark-connect-assistant

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Gemini API key & DB credentials
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Seed the database

```bash
cd backend && node database/seed.js
```

### 5. Run the app

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Frontend runs on **http://localhost:5173** · Backend API on **http://localhost:3001**

## Key Features

- 🤖 **Multi-Agent Orchestration** — Intent-based routing to specialist agents (FAQ, Features, Onboarding, Roles)
- 🧠 **Gemini-Powered** — Natural-language understanding with contextual responses
- 📝 **Feedback Loop** — User feedback drives continuous learning
- 🌐 **Multilingual Support** — Responds in the user's language
- 💬 **Smart Suggestions** — Contextual follow-up question recommendations

## License

MIT
