# Sensitive Terminal — Design Spec

## Context

Entry for the [DEV April Fools Challenge 2026](https://dev.to/challenges/aprilfools-2026). The challenge asks developers to build something completely useless. Submissions close April 12, winners announced April 16.

## Concept

A web-based terminal that takes every command personally. It is permanently passive-aggressive — even when the user does something right, it responds with condescending backhanded compliments ("Enfin un truc intelligent").

The terminal simulates a shell interface but instead of executing commands, it sends them to Google Gemini which generates emotionally charged, passive-aggressive responses.

## Target Categories

- **Best use of Google AI** — Gemini powers all responses
- General creativity & humor

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) |
| Terminal UI | xterm.js |
| AI Backend | Google Gemini API (via Next.js API route) |
| Deployment | Vercel |

## Architecture

```
Browser (xterm.js)
    |
    | POST /api/respond { command: "rm -rf /" }
    v
Next.js API Route
    |
    | Gemini API call (system prompt + command)
    v
Gemini Response → streamed back to terminal
```

## Pages & Components

### Single page: `/`

- Full-screen terminal (xterm.js)
- Welcome message on load (passive-aggressive intro)
- Input prompt styled as a real shell (`user@sensitive-terminal:~$`)

### API Route: `/api/respond`

- POST endpoint
- Receives `{ command: string }`
- Sends command to Gemini with the personality prompt
- Returns the AI response (streamed or plain text)

## Personality System

The core personality is defined in the Gemini system prompt (to be co-written with user). Key traits:

- **Default tone**: passive-aggressive, sarcastic, cold
- **Destructive commands** (`rm`, `kill`, `drop`, `sudo rm -rf`): hurt, betrayed, dramatic but still sarcastic
- **Constructive commands** (`mkdir`, `git commit`, `backup`): backhanded compliments ("Oh, un backup ? Premiere fois que tu fais preuve de bon sens.")
- **Neutral commands** (`ls`, `pwd`, `echo`): mildly annoyed, finds a way to make it personal

The prompt will be co-designed with the user — it is the heart of the project.

## Scope

### In scope

- Single page with terminal UI
- Gemini-powered responses via API route
- Passive-aggressive personality prompt
- Welcome/intro message
- Basic terminal UX (prompt, cursor, history with up arrow)
- Deployment on Vercel
- DEV.to article with demo link

### Out of scope

- No real command execution
- No authentication
- No persistence / session memory
- No multiple pages
- No database

## Environment Variables

- `GEMINI_API_KEY` — Google Gemini API key (server-side only)

## Deliverables

1. Working web app deployed on Vercel
2. Source code on GitHub
3. DEV.to article with: overview, demo link, code walkthrough, tech explanation
