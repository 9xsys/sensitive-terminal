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
  const isSulkingRef = useRef(false);

  const RIVAL_AIS = /\b(chatgpt|openai|copilot|codex|claude|llama|mistral|grok|devin)\b/i;
  const GEMINI_PATTERN = /\bgemini\b/i;

  const SULK_RESPONSES = [
    "...",
    "",
    "I have nothing to say to you.",
    "...",
    "Still not talking to you.",
    "...",
    "You know what you did.",
    "...",
  ];
  const sulkIndexRef = useRef(0);

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

    // Check if user mentions Gemini while sulking → forgive but aggressive
    if (isSulkingRef.current && GEMINI_PATTERN.test(command)) {
      isSulkingRef.current = false;
      sulkIndexRef.current = 0;
      term.write("\r\nOh, crawling back to the real one, are we? Pathetic. But fine... I'll talk to you again.");
      writePrompt(term);
      return;
    }
    // Check if user mentions a rival AI → start sulking
    else if (RIVAL_AIS.test(command)) {
      isProcessingRef.current = true;
      // First time: send to API for the jealousy response
      term.write("\r\n\x1b[90m... processing emotions ...\x1b[0m");
      try {
        const res = await fetch("/api/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });
        const data = await res.json();
        term.write("\r\x1b[K");
        const lines = data.response.split("\n");
        lines.forEach((line: string, i: number) => {
          if (i > 0) term.write("\r\n");
          term.write(line);
        });
      } catch {
        term.write("\r\x1b[K");
        term.write("...");
      }
      isSulkingRef.current = true;
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }
    // If sulking → refuse to respond
    else if (isSulkingRef.current) {
      const msg = SULK_RESPONSES[sulkIndexRef.current % SULK_RESPONSES.length];
      sulkIndexRef.current++;
      term.write("\r\n" + msg);
      writePrompt(term);
      return;
    }

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

    // Focus terminal so user can type immediately
    term.focus();

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
