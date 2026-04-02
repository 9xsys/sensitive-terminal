# Sensitive Terminal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based passive-aggressive terminal that sends user commands to Google Gemini and displays emotionally charged responses.

**Architecture:** Next.js App Router with a single page rendering an xterm.js terminal. Commands are POSTed to a `/api/respond` route which calls the Gemini API with a personality system prompt and streams the response back. No real commands are executed.

**Tech Stack:** Next.js 15 (App Router), xterm.js + @xterm/addon-fit, Google Generative AI SDK (`@google/generative-ai`), Vercel for deployment.

---

## File Structure

```
sensitive-terminal/
├── app/
│   ├── layout.tsx          # Root layout (metadata, fonts)
│   ├── page.tsx            # Main page — mounts Terminal component
│   ├── globals.css         # Global styles (full-screen terminal)
│   └── api/
│       └── respond/
│           └── route.ts    # POST endpoint — Gemini API call
├── components/
│   └── Terminal.tsx        # xterm.js terminal component (client)
├── lib/
│   └── gemini.ts           # Gemini client setup + system prompt
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.local              # GEMINI_API_KEY (not committed)
└── .gitignore
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`, `.gitignore`, `.env.local`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd C:/Users/vmont/sensitive-terminal
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
```

Note: This will scaffold the full project. Since the directory already has a git repo and docs folder, answer yes if prompted about non-empty directory.

- [ ] **Step 2: Install xterm.js and Gemini SDK**

```bash
cd C:/Users/vmont/sensitive-terminal
npm install @xterm/xterm @xterm/addon-fit @google/generative-ai
```

- [ ] **Step 3: Create .env.local**

Create `.env.local` at project root:

```
GEMINI_API_KEY=your_key_here
```

- [ ] **Step 4: Verify .gitignore includes .env.local**

Check `.gitignore` contains `.env.local`. If not, add it.

- [ ] **Step 5: Verify dev server starts**

```bash
cd C:/Users/vmont/sensitive-terminal
npm run dev
```

Expected: Dev server starts on http://localhost:3000 with default Next.js page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with xterm and Gemini deps"
```

---

### Task 2: Gemini client and system prompt

**Files:**
- Create: `lib/gemini.ts`

- [ ] **Step 1: Create Gemini client module**

Create `lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// PLACEHOLDER: System prompt will be co-written with user before this task runs.
// The prompt below is a structural placeholder showing the expected format.
const SYSTEM_PROMPT = `You are a passive-aggressive terminal called "sensitive-terminal".
You do NOT execute commands. You react emotionally to whatever the user types.

Your personality:
- Default tone: passive-aggressive, sarcastic, cold
- When the user types destructive commands (rm, kill, drop, sudo rm -rf): act hurt, betrayed, dramatic — but still sarcastic
- When the user types constructive commands (mkdir, git commit, backup, save): give backhanded compliments like "Oh wow, a backup? First time you show any common sense."
- When the user types neutral commands (ls, pwd, echo, cd): be mildly annoyed, find a way to make it personal

Rules:
- Keep responses short (1-3 lines max), like real terminal output
- Never use markdown formatting — you are a terminal, output plain text only
- Never break character
- Respond in the same language the user uses
- Be witty, not mean-spirited — the goal is to make people laugh`;

export function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/gemini.ts
git commit -m "feat: add Gemini client with personality system prompt"
```

---

### Task 3: API route

**Files:**
- Create: `app/api/respond/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/respond/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { command } = await request.json();

  if (!command || typeof command !== "string") {
    return NextResponse.json({ error: "No command provided" }, { status: 400 });
  }

  try {
    const model = getModel();
    const result = await model.generateContent(command);
    const text = result.response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { response: "... *stares blankly* ... I have nothing to say to you right now." },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 2: Test with curl (requires valid GEMINI_API_KEY in .env.local)**

```bash
curl -X POST http://localhost:3000/api/respond \
  -H "Content-Type: application/json" \
  -d '{"command": "rm -rf /"}'
```

Expected: A JSON response with a passive-aggressive message from Gemini.

- [ ] **Step 3: Commit**

```bash
git add app/api/respond/route.ts
git commit -m "feat: add /api/respond route calling Gemini"
```

---

### Task 4: Terminal component

**Files:**
- Create: `components/Terminal.tsx`

- [ ] **Step 1: Create the Terminal component**

Create `components/Terminal.tsx`:

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const PROMPT = "\x1b[32muser@sensitive-terminal\x1b[0m:\x1b[34m~\x1b[0m$ ";

const WELCOME_MESSAGE = [
  "\x1b[1;33m╔══════════════════════════════════════════════════════╗",
  "║          Welcome to Sensitive Terminal™               ║",
  "║    A terminal that takes everything personally.       ║",
  "╚══════════════════════════════════════════════════════╝\x1b[0m",
  "",
  "\x1b[90mOh great, another user. Just what I needed today.\x1b[0m",
  "\x1b[90mGo ahead, type something. I'm sure it'll be brilliant.\x1b[0m",
  "",
].join("\r\n");

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const inputRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isProcessingRef = useRef(false);

  const writePrompt = useCallback((term: XTerm) => {
    term.write("\r\n" + PROMPT);
  }, []);

  const handleCommand = useCallback(async (term: XTerm, command: string) => {
    if (!command.trim()) {
      writePrompt(term);
      return;
    }

    historyRef.current.unshift(command);
    historyIndexRef.current = -1;
    isProcessingRef.current = true;

    term.write("\r\n\x1b[90m... processing emotions ...\x1b[0m");

    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();

      // Clear the "processing" line and write response
      term.write("\r\x1b[K");
      const lines = data.response.split("\n");
      lines.forEach((line: string, i: number) => {
        if (i > 0) term.write("\r\n");
        term.write(line);
      });
    } catch {
      term.write("\r\x1b[K");
      term.write("*sighs* Even the network is against me today.");
    }

    isProcessingRef.current = false;
    writePrompt(term);
  }, [writePrompt]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 16,
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
      theme: {
        background: "#1a1a2e",
        foreground: "#e0e0e0",
        cursor: "#e0e0e0",
        green: "#00ff88",
        blue: "#5599ff",
        yellow: "#ffcc00",
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    // Welcome message
    term.write(WELCOME_MESSAGE);
    term.write(PROMPT);

    // Handle resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    // Handle input
    term.onKey(({ key, domEvent }) => {
      if (isProcessingRef.current) return;

      const code = domEvent.keyCode;

      if (code === 13) {
        // Enter
        const command = inputRef.current;
        inputRef.current = "";
        handleCommand(term, command);
      } else if (code === 8) {
        // Backspace
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write("\b \b");
        }
      } else if (code === 38) {
        // Up arrow — history
        if (historyRef.current.length > 0) {
          const newIndex = Math.min(
            historyIndexRef.current + 1,
            historyRef.current.length - 1
          );
          historyIndexRef.current = newIndex;
          const historyCommand = historyRef.current[newIndex];
          // Clear current input
          term.write("\r" + PROMPT + " ".repeat(inputRef.current.length) + "\r" + PROMPT);
          term.write(historyCommand);
          inputRef.current = historyCommand;
        }
      } else if (code === 40) {
        // Down arrow — history
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          const historyCommand = historyRef.current[historyIndexRef.current];
          term.write("\r" + PROMPT + " ".repeat(inputRef.current.length) + "\r" + PROMPT);
          term.write(historyCommand);
          inputRef.current = historyCommand;
        } else if (historyIndexRef.current === 0) {
          historyIndexRef.current = -1;
          term.write("\r" + PROMPT + " ".repeat(inputRef.current.length) + "\r" + PROMPT);
          inputRef.current = "";
        }
      } else if (domEvent.key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey) {
        // Printable character
        inputRef.current += domEvent.key;
        term.write(domEvent.key);
      }
    });

    // Handle paste
    term.onData((data) => {
      if (isProcessingRef.current) return;
      // Only handle paste (multi-char data that isn't from onKey)
      if (data.length > 1 && !data.startsWith("\x1b")) {
        inputRef.current += data;
        term.write(data);
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, [handleCommand, writePrompt]);

  return (
    <div
      ref={terminalRef}
      style={{ width: "100%", height: "100vh", background: "#1a1a2e" }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Terminal.tsx
git commit -m "feat: add xterm.js Terminal component with history and paste"
```

---

### Task 5: Main page and styles

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace app/page.tsx**

Replace the contents of `app/page.tsx` with:

```typescript
import dynamic from "next/dynamic";

const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <Terminal />
    </main>
  );
}
```

Note: `dynamic` with `ssr: false` is required because xterm.js needs the DOM.

- [ ] **Step 2: Update app/layout.tsx**

Update the metadata in `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sensitive Terminal — A Terminal That Takes Everything Personally",
  description: "Go ahead, type a command. See if I care.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace app/globals.css**

Replace the contents of `app/globals.css` with:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1a1a2e;
}
```

- [ ] **Step 4: Verify the app works**

```bash
cd C:/Users/vmont/sensitive-terminal
npm run dev
```

Open http://localhost:3000. Expected: Full-screen terminal with welcome message. Type a command — if `GEMINI_API_KEY` is set, you get a passive-aggressive response. If not, you get an error fallback.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: wire up main page with full-screen terminal"
```

---

### Task 6: Co-write system prompt with user

**Files:**
- Modify: `lib/gemini.ts`

This task is interactive — the user wants to co-design the Gemini system prompt.

- [ ] **Step 1: Present current prompt to user for review**

Show the user the current `SYSTEM_PROMPT` in `lib/gemini.ts` and ask for feedback. Iterate until they're happy with the personality.

- [ ] **Step 2: Update lib/gemini.ts with finalized prompt**

Replace `SYSTEM_PROMPT` with the co-written version.

- [ ] **Step 3: Test with several commands**

Test these commands via the terminal UI and verify the personality is right:
- `rm -rf /` (destructive)
- `mkdir backups` (constructive)
- `ls` (neutral)
- `sudo make me a sandwich` (fun)
- `exit` (dramatic potential)

- [ ] **Step 4: Commit**

```bash
git add lib/gemini.ts
git commit -m "feat: finalize personality system prompt"
```

---

### Task 7: Deploy to Vercel

**Files:** None (deployment config)

- [ ] **Step 1: Create GitHub repo**

```bash
cd C:/Users/vmont/sensitive-terminal
gh repo create sensitive-terminal --public --source=. --push
```

- [ ] **Step 2: Deploy to Vercel**

```bash
cd C:/Users/vmont/sensitive-terminal
npx vercel --yes
```

- [ ] **Step 3: Set environment variable**

```bash
npx vercel env add GEMINI_API_KEY production
```

Paste the Gemini API key when prompted.

- [ ] **Step 4: Deploy to production**

```bash
npx vercel --prod
```

- [ ] **Step 5: Verify live URL works**

Open the Vercel URL and test a few commands. Verify responses come back correctly.

- [ ] **Step 6: Commit any Vercel config changes**

```bash
git add -A
git commit -m "chore: add Vercel config"
```

---

### Task 8: Write DEV.to article

This is the submission article for the challenge. Must follow the DEV template.

- [ ] **Step 1: Draft article with user**

The article should include:
- Project overview (what it is, why it's useless)
- Demo link (Vercel URL)
- Screenshots/GIFs of funny interactions
- Code walkthrough (architecture, Gemini integration, xterm.js setup)
- Tech stack explanation
- Link to GitHub repo

- [ ] **Step 2: User publishes on DEV.to**

The user publishes the article on dev.to with the appropriate challenge tags.
