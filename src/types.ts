export type AgentType = "codex" | "claude-code";

export type SessionStatus = "running" | "exited" | "error" | "killed";

export interface Session {
  sessionId: string;
  agent: AgentType;
  cwd: string;
  status: SessionStatus;
  startedAt: string;
  lastActivity: string;
  exitCode?: number | null;
  outputBuffer: RingBuffer;
  process: SessionProcess | null;
}

export interface SessionProcess {
  write(data: string): void;
  kill(signal?: string): void;
  pid: number | undefined;
}

export interface SessionInfo {
  sessionId: string;
  agent: AgentType;
  cwd: string;
  status: SessionStatus;
  startedAt: string;
  lastActivity: string;
  pid?: number;
  exitCode?: number | null;
  completedSuccessfully?: boolean;
  initialOutput?: string;
}

export class RingBuffer {
  private lines: string[] = [];
  private maxLines: number;

  constructor(maxLines: number = 10000) {
    this.maxLines = maxLines;
  }

  push(line: string): void {
    this.lines.push(line);
    if (this.lines.length > this.maxLines) {
      this.lines.splice(0, this.lines.length - this.maxLines);
    }
  }

  pushMultiple(text: string): void {
    const newLines = text.split("\n");
    for (const line of newLines) {
      this.push(line);
    }
  }

  getLines(since?: number): { lines: string[]; offset: number } {
    const start = since ?? 0;
    const clamped = Math.max(0, Math.min(start, this.lines.length));
    return {
      lines: this.lines.slice(clamped),
      offset: this.lines.length,
    };
  }

  get length(): number {
    return this.lines.length;
  }
}
