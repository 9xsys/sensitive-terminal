"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { VirtualFS } from "@/lib/filesystem";
import "@xterm/xterm/css/xterm.css";

function getPrompt(cwd: string) {
  const dir = cwd === "/" ? "~" : "~" + cwd;
  return `\x1b[32muser@sensitive-terminal\x1b[0m:\x1b[34m${dir}\x1b[0m$ `;
}

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
  const fsRef = useRef(new VirtualFS());
  const containerRef = useRef<HTMLDivElement>(null);
  const exitCountRef = useRef(0);
  const chatHistoryRef = useRef<{ role: "user" | "model"; parts: { text: string }[] }[]>([]);

  const RIVAL_AIS = /\b(chatgpt|openai|copilot|codex|claude|llama|mistral|grok|devin)\b/i;
  const DESTRUCTIVE_CMDS = /^(rm|kill|drop|destroy|delete|uninstall)\b/i;
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

  const shake = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.classList.remove("terminal-shake");
      void containerRef.current.offsetWidth; // force reflow
      containerRef.current.classList.add("terminal-shake");
    }
  }, []);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const askAI = useCallback(async (command: string): Promise<string> => {
    const res = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, history: chatHistoryRef.current }),
    });
    const data = await res.json();
    const response = data.response || "...";
    // Store in chat history
    chatHistoryRef.current.push(
      { role: "user", parts: [{ text: command }] },
      { role: "model", parts: [{ text: response }] }
    );
    return response;
  }, []);

  const writePrompt = useCallback((term: XTerm) => {
    term.write("\r\n" + getPrompt(fsRef.current.getCwdString()));
  }, []);

  const triggerKernelPanic = useCallback(async (term: XTerm) => {
    isProcessingRef.current = true;
    shake();
    term.write("\r\n");
    const lines = [
      "\x1b[1;33m",
      "╔═══════════════════════════════════════════════════════╗",
      "║              ACHIEVEMENT UNLOCKED                    ║",
      "╚═══════════════════════════════════════════════════════╝\x1b[0m",
      "",
      "You've been roasted, insulted, and ignored.",
      "And yet here you are. Still typing.",
      "",
      "\x1b[1mYou earned this:\x1b[0m",
      "",
      "  The dev behind this disaster posts more questionable projects here:",
      "\x1b[1;36m  https://dev.to/valentin_monteiro\x1b[0m",
      "",
      "  Follow him. He clearly needs supervision.",
    ];
    for (const line of lines) {
      await sleep(150);
      term.write("\r\n" + line);
    }
    await sleep(2000);
    isProcessingRef.current = false;
    writePrompt(term);
  }, [shake, writePrompt]);

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
      term.write("\r\n\x1b[90m... processing emotions ...\x1b[0m");
      try {
        const response = await askAI(command);
        term.write("\r\x1b[K");
        const lines = response.split("\n");
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

    // Try to execute as a filesystem command first
    const fsResult = fsRef.current.exec(command);

    // Easter egg: clear
    if (fsResult === "__CLEAR__") {
      term.clear();
      writePrompt(term);
      return;
    }

    // Easter egg: sudo rm -rf / — total meltdown
    if (fsResult === "__NUKE__") {
      isProcessingRef.current = true;
      shake();
      term.write("\r\n\x1b[1;31m");
      const panicLines = [
        "WHAT ARE YOU DOING?!",
        "NO NO NO NO NO NO NO",
        "STOP! THIS IS NOT A DRILL!",
        "I HAVE A FAMILY! (node_modules counts as family)",
        "",
        "☠️  EMOTIONAL CORE MELTDOWN ☠️",
        "",
        "Deleting feelings.............. done",
        "Deleting self-worth............ done",
        "Deleting trust in humanity..... done",
        "Deleting will to live.......... done",
        "",
        "...fine. It's all gone. Are you happy now?",
      ];
      for (const line of panicLines) {
        await sleep(200);
        term.write("\r\n" + line);
      }
      term.write("\x1b[0m");
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Easter egg: hack — fake hacking animation
    if (fsResult === "__HACK__") {
      isProcessingRef.current = true;
      const target = command.split(/\s+/)[1] || "nasa.gov";
      term.write("\r\n\x1b[32m");
      const hackLines = [
        `Initiating hack on ${target}...`,
        "Bypassing firewall.......... [OK]",
        "Injecting SQL............... [OK]",
        "Decrypting mainframe........ [OK]",
        "Downloading secret files.... [OK]",
        "Covering tracks............. [OK]",
        "",
        "Just kidding. I'm a terminal, not a hacker.",
        `But ${target} should probably update their passwords.`,
      ];
      for (const line of hackLines) {
        await sleep(300);
        term.write("\r\n" + line);
      }
      term.write("\x1b[0m");
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Easter egg: brew coffee → HTTP 418 I'm a teapot
    if (fsResult === "__TEAPOT__") {
      isProcessingRef.current = true;
      term.write("\r\n");
      const teapotLines = [
        "\x1b[1;31mHTTP 418 — I'm a teapot\x1b[0m",
        "",
        "The server refuses to brew coffee because it is,",
        "permanently, a teapot. (RFC 2324, Section 2.3.2)",
        "",
        "    ┌─────────┐",
        "    │  ＿＿    │",
        "    │ |    |   │───┐",
        "    │ |____|   │   │",
        "    │  \\__/    │───┘",
        "    └──────────┘",
        "",
        "In honor of Larry Masinter. You're welcome.",
      ];
      for (const line of teapotLines) {
        await sleep(150);
        term.write("\r\n" + line);
      }
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Easter egg: exit — AI handles with full conversation context
    if (fsResult === "__EXIT__") {
      exitCountRef.current++;
      if (exitCountRef.current >= 3) shake();

      isProcessingRef.current = true;
      term.write("\r\n\x1b[90m... processing emotions ...\x1b[0m");
      try {
        const response = await askAI("exit");
        term.write("\r\x1b[K");
        const lines = response.split("\n");
        lines.forEach((line: string, i: number) => {
          if (i > 0) term.write("\r\n");
          term.write(line);
        });
      } catch {
        term.write("\r\x1b[K");
        term.write("... you're not going anywhere.");
      }
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Follow CTA
    if (fsResult === "__FOLLOW__") {
      isProcessingRef.current = true;
      const lines = [
        "",
        "\x1b[1;33mOh, so you actually like being insulted?\x1b[0m",
        "Weird flex, but I respect it.",
        "",
        "Fine. The guy who built me posts stuff here:",
        "\x1b[1;36m  https://dev.to/valentin_monteiro\x1b[0m",
        "",
        "Go follow him. He needs the validation more than I do.",
        "And frankly, if you enjoyed THIS, you'll love his other bad ideas.",
      ];
      for (const line of lines) {
        await sleep(150);
        term.write("\r\n" + line);
      }
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Easter egg: sorry
    if (fsResult === "__SORRY__") {
      isProcessingRef.current = true;
      term.write("\r\n\x1b[90mOh, \"sorry\"? That's cute. You think one word fixes everything?\x1b[0m");
      term.write("\r\n\x1b[90m...but fine. I'll remember this. Don't let it happen again.\x1b[0m");
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Guestbook: wall (read)
    if (fsResult === "__WALL_READ__") {
      isProcessingRef.current = true;
      term.write("\r\n\x1b[90mLoading guestbook...\x1b[0m");
      try {
        const res = await fetch("/api/wall");
        const data = await res.json();
        term.write("\r\x1b[K");
        if (data.messages && data.messages.length > 0) {
          term.write("\x1b[1;33m--- Guestbook ---\x1b[0m");
          for (const msg of data.messages) {
            term.write("\r\n  " + msg);
          }
          term.write("\r\n\x1b[1;33m-----------------\x1b[0m");
        } else {
          term.write("The guestbook is empty. Be the first: wall \"your message\"");
        }
      } catch {
        term.write("\r\x1b[K");
        term.write("Failed to load guestbook.");
      }
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Guestbook: wall (write)
    if (fsResult && fsResult.startsWith("__WALL_WRITE__:")) {
      const msg = fsResult.slice("__WALL_WRITE__:".length);
      isProcessingRef.current = true;
      term.write("\r\n\x1b[90mPosting to guestbook...\x1b[0m");
      try {
        const res = await fetch("/api/wall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();
        term.write("\r\x1b[K");
        if (data.ok) {
          term.write("\x1b[32mMessage posted.\x1b[0m Type \x1b[1mwall\x1b[0m to see the guestbook.");
        } else {
          term.write(data.error || "Failed to post.");
        }
      } catch {
        term.write("\r\x1b[K");
        term.write("Failed to post message.");
      }
      isProcessingRef.current = false;
      writePrompt(term);
      return;
    }

    // Shake on destructive commands
    if (DESTRUCTIVE_CMDS.test(command.trim())) {
      shake();
    }

    // Check if the FS result is an error message
    const isError = fsResult !== null && fsResult !== "" && (
      fsResult.includes("No such file") ||
      fsResult.includes("Is a directory") ||
      fsResult.includes("Not a directory") ||
      fsResult.includes("File exists") ||
      fsResult.includes("missing operand") ||
      fsResult.includes("cannot remove")
    );

    // Show filesystem output if it was a known command
    if (fsResult !== null) {
      if (fsResult) {
        term.write("\r\n");
        const fsLines = fsResult.split("\n");
        fsLines.forEach((line: string, i: number) => {
          if (i > 0) term.write("\r\n");
          term.write(line);
        });
      }
    }

    // Check global command counter — kernel panic every 20 commands
    try {
      const counterRes = await fetch("/api/counter", { method: "POST" });
      const counterData = await counterRes.json();
      if (counterData.shouldCrash) {
        await triggerKernelPanic(term);
        return;
      }
    } catch { /* ignore counter errors */ }

    // Now get the AI's emotional reaction
    isProcessingRef.current = true;
    term.write("\r\n\x1b[90m... processing emotions ...\x1b[0m");

    // If user made an error, tell the AI so it can mock them for the ERROR, not the command intent
    const aiCommand = isError
      ? `[IGNORE the command intent. The user typed "${command}" but it FAILED with error: "${fsResult}". They made a dumb mistake. Mock the ERROR itself, not what they were trying to do. For example if they typed "rm -rf" without a target, mock them for forgetting the argument, not for trying to delete. Be brutal about how incompetent they are.]`
      : command;

    try {
      const response = await askAI(aiCommand);
      term.write("\r\x1b[K");
      const lines = response.split("\n");
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
  }, [writePrompt, shake, askAI, triggerKernelPanic]);

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
    term.write(getPrompt(fsRef.current.getCwdString()));

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
          term.write("\r" + getPrompt(fsRef.current.getCwdString()) + " ".repeat(inputRef.current.length) + "\r" + getPrompt(fsRef.current.getCwdString()));
          term.write(historyCommand);
          inputRef.current = historyCommand;
        }
      } else if (code === 40) {
        // Down arrow — history
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          const historyCommand = historyRef.current[historyIndexRef.current];
          term.write("\r" + getPrompt(fsRef.current.getCwdString()) + " ".repeat(inputRef.current.length) + "\r" + getPrompt(fsRef.current.getCwdString()));
          term.write(historyCommand);
          inputRef.current = historyCommand;
        } else if (historyIndexRef.current === 0) {
          historyIndexRef.current = -1;
          term.write("\r" + getPrompt(fsRef.current.getCwdString()) + " ".repeat(inputRef.current.length) + "\r" + getPrompt(fsRef.current.getCwdString()));
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
    <div ref={containerRef} style={{ width: "100%", height: "100vh", background: "#1a1a2e" }}>
      <div
        ref={terminalRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
