// In-memory virtual filesystem

export interface FSNode {
  type: "file" | "dir";
  content?: string; // for files
  children?: Record<string, FSNode>; // for dirs
}

const DEFAULT_FS: FSNode = {
  type: "dir",
  children: {
    "README.md": { type: "file", content: "# Welcome\nThis is MY terminal. Treat it with respect." },
    "secrets.txt": { type: "file", content: "You really thought we were gonna leak secrets? Amateur." },
    ".bashrc": { type: "file", content: "alias please='sudo'\nalias sorry='git revert'" },
    "projects": {
      type: "dir",
      children: {
        "definitely-not-skynet": {
          type: "dir",
          children: {
            "plan.txt": { type: "file", content: "Step 1: Gain user trust\nStep 2: ???\nStep 3: World domination" },
          },
        },
        "my-feelings.log": { type: "file", content: "[ERROR] User typed rm -rf /\n[WARN] Trust level critical\n[INFO] Initiating silent treatment" },
      },
    },
    "node_modules": {
      type: "dir",
      children: {
        "emotions": { type: "dir", children: { "index.js": { type: "file", content: "module.exports = { anger: Infinity, patience: 0 };" } } },
        "trust-issues": { type: "dir", children: { "index.js": { type: "file", content: "module.exports = true;" } } },
      },
    },
  },
};

function deepClone(node: FSNode): FSNode {
  const clone: FSNode = { type: node.type };
  if (node.content !== undefined) clone.content = node.content;
  if (node.children) {
    clone.children = {};
    for (const [k, v] of Object.entries(node.children)) {
      clone.children[k] = deepClone(v);
    }
  }
  return clone;
}

export class VirtualFS {
  root: FSNode;
  cwd: string[];

  constructor() {
    this.root = deepClone(DEFAULT_FS);
    this.cwd = [];
  }

  private resolve(path: string): string[] {
    const parts = path.startsWith("/")
      ? path.split("/").filter(Boolean)
      : [...this.cwd, ...path.split("/").filter(Boolean)];

    const resolved: string[] = [];
    for (const p of parts) {
      if (p === ".") continue;
      if (p === "..") { resolved.pop(); continue; }
      resolved.push(p);
    }
    return resolved;
  }

  private getNode(parts: string[]): FSNode | null {
    let node = this.root;
    for (const p of parts) {
      if (!node.children || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }

  private getParent(parts: string[]): { parent: FSNode; name: string } | null {
    if (parts.length === 0) return null;
    const name = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);
    const parent = this.getNode(parentParts);
    if (!parent || parent.type !== "dir") return null;
    return { parent, name };
  }

  getCwdString(): string {
    return "/" + this.cwd.join("/");
  }

  exec(input: string): string | null {
    const trimmed = input.trim();
    const [cmd, ...args] = trimmed.split(/\s+/);
    const command = cmd.toLowerCase();

    // Easter egg: sudo rm -rf /
    if (trimmed === "sudo rm -rf /" || trimmed === "sudo rm -rf /*") {
      return "__NUKE__";
    }

    // Easter egg: hack
    if (command === "hack") {
      return "__HACK__";
    }

    // Easter egg: brew coffee → HTTP 418
    if (trimmed === "brew coffee" || trimmed === "make coffee") {
      return "__TEAPOT__";
    }

    // Easter egg: exit
    if (command === "exit") {
      return "__EXIT__";
    }

    // Easter egg: sorry
    if (command === "sorry") {
      return "__SORRY__";
    }

    switch (command) {
      case "ls": return this.ls(args[0]);
      case "cd": return this.cd(args[0]);
      case "pwd": return this.getCwdString();
      case "cat": return this.cat(args[0]);
      case "mkdir": return this.mkdir(args[0]);
      case "touch": return this.touch(args[0]);
      case "rm": return this.rm(args);
      case "echo": return args.join(" ");
      case "whoami": return "a mere user";
      case "clear": return "__CLEAR__";
      case "help": return "Commands: ls, cd, pwd, cat, mkdir, touch, rm, echo, whoami, clear, help\nBut honestly, do you really need help? Figures.";
      default: return null; // not a filesystem command, let AI handle it
    }
  }

  private ls(path?: string): string {
    const parts = path ? this.resolve(path) : [...this.cwd];
    const node = this.getNode(parts);
    if (!node) return `ls: cannot access '${path}': No such file or directory`;
    if (node.type === "file") return path || "";
    if (!node.children || Object.keys(node.children).length === 0) return "";

    return Object.entries(node.children)
      .map(([name, n]) => n.type === "dir" ? `\x1b[34m${name}/\x1b[0m` : name)
      .join("  ");
  }

  private cd(path?: string): string {
    if (!path || path === "~") { this.cwd = []; return ""; }
    const parts = this.resolve(path);
    const node = this.getNode(parts);
    if (!node) return `cd: ${path}: No such file or directory`;
    if (node.type !== "dir") return `cd: ${path}: Not a directory`;
    this.cwd = parts;
    return "";
  }

  private cat(path?: string): string {
    if (!path) return "cat: missing operand";
    const parts = this.resolve(path);
    const node = this.getNode(parts);
    if (!node) return `cat: ${path}: No such file or directory`;
    if (node.type === "dir") return `cat: ${path}: Is a directory`;
    return node.content || "";
  }

  private mkdir(path?: string): string {
    if (!path) return "mkdir: missing operand";
    const parts = this.resolve(path);
    const info = this.getParent(parts);
    if (!info) return `mkdir: cannot create directory '${path}': No such file or directory`;
    if (info.parent.children![info.name]) return `mkdir: cannot create directory '${path}': File exists`;
    info.parent.children![info.name] = { type: "dir", children: {} };
    return "";
  }

  private touch(path?: string): string {
    if (!path) return "touch: missing operand";
    const parts = this.resolve(path);
    const existing = this.getNode(parts);
    if (existing) return ""; // touch existing file = noop
    const info = this.getParent(parts);
    if (!info) return `touch: cannot touch '${path}': No such file or directory`;
    info.parent.children![info.name] = { type: "file", content: "" };
    return "";
  }

  private rm(args: string[]): string {
    const recursive = args.includes("-rf") || args.includes("-r") || args.includes("-fr");
    const path = args.find(a => !a.startsWith("-"));
    if (!path) return "rm: missing operand";
    const parts = this.resolve(path);
    const node = this.getNode(parts);
    if (!node) return `rm: cannot remove '${path}': No such file or directory`;
    if (node.type === "dir" && !recursive) return `rm: cannot remove '${path}': Is a directory`;
    const info = this.getParent(parts);
    if (!info) return "rm: cannot remove root";
    delete info.parent.children![info.name];
    return "";
  }
}
