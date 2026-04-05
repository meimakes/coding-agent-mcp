import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, symlinkSync } from "fs";
import { realpath } from "fs/promises";
import { join, resolve } from "path";
import { tmpdir } from "os";

// We test the path sandbox and env whitelisting logic directly.

describe("path sandboxing", () => {
  const WORKSPACE = join(tmpdir(), "mcp-test-workspace-" + process.pid);
  const sessionCwds: string[] = [];

  async function assertPathAllowed(targetPath: string): Promise<string> {
    const resolved = resolve(targetPath);
    let real: string;
    try {
      real = await realpath(resolved);
    } catch {
      real = resolved;
    }

    const allowedRoots = [WORKSPACE, ...sessionCwds];

    for (const root of allowedRoots) {
      const realRoot = await realpath(root).catch(() => root);
      if (real === realRoot || real.startsWith(realRoot + "/")) {
        return real;
      }
    }

    throw new Error(`Access denied: path ${targetPath} is outside allowed directories`);
  }

  before(() => {
    mkdirSync(WORKSPACE, { recursive: true });
    mkdirSync(join(WORKSPACE, "project"), { recursive: true });
    writeFileSync(join(WORKSPACE, "project", "file.txt"), "test content");
  });

  after(() => {
    rmSync(WORKSPACE, { recursive: true, force: true });
  });

  it("allows files inside WORKSPACE_DIR", async () => {
    const result = await assertPathAllowed(join(WORKSPACE, "project", "file.txt"));
    // macOS /tmp -> /private/tmp, so check the real workspace path
    const realWorkspace = await realpath(WORKSPACE);
    assert.ok(result.startsWith(realWorkspace));
  });

  it("allows WORKSPACE_DIR itself", async () => {
    const result = await assertPathAllowed(WORKSPACE);
    assert.ok(result);
  });

  it("denies paths outside WORKSPACE_DIR", async () => {
    await assert.rejects(() => assertPathAllowed("/etc/passwd"), {
      message: /Access denied/,
    });
  });

  it("denies traversal via ../", async () => {
    await assert.rejects(() => assertPathAllowed(join(WORKSPACE, "..", "..", "etc", "passwd")), {
      message: /Access denied/,
    });
  });

  it("denies symlink escapes", async () => {
    const linkPath = join(WORKSPACE, "escape-link");
    try {
      symlinkSync("/etc", linkPath);
      await assert.rejects(() => assertPathAllowed(join(linkPath, "passwd")), {
        message: /Access denied/,
      });
    } finally {
      rmSync(linkPath, { force: true });
    }
  });

  it("allows session cwd paths", async () => {
    const sessionDir = join(tmpdir(), "mcp-test-session-" + process.pid);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, "output.txt"), "data");
    sessionCwds.push(sessionDir);

    try {
      const result = await assertPathAllowed(join(sessionDir, "output.txt"));
      assert.ok(result.includes("output.txt"));
    } finally {
      sessionCwds.pop();
      rmSync(sessionDir, { recursive: true, force: true });
    }
  });
});

describe("env var whitelisting", () => {
  const CHILD_ENV_ALLOWLIST = [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "SHELL",
    "TERM",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "NODE_EXTRA_CA_CERTS",
    "NODE_NO_WARNINGS",
    "SSH_AUTH_SOCK",
    "GIT_AUTHOR_NAME",
    "GIT_AUTHOR_EMAIL",
    "GIT_COMMITTER_NAME",
    "GIT_COMMITTER_EMAIL",
  ];

  function buildChildEnv(env: Record<string, string | undefined>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of CHILD_ENV_ALLOWLIST) {
      if (env[key] != null) {
        result[key] = env[key]!;
      }
    }
    for (const [key, val] of Object.entries(env)) {
      if (key.startsWith("CHILD_ENV_") && val != null) {
        result[key.slice("CHILD_ENV_".length)] = val;
      }
    }
    return result;
  }

  it("passes through allowed vars", () => {
    const env = buildChildEnv({ PATH: "/usr/bin", HOME: "/home/test" });
    assert.equal(env.PATH, "/usr/bin");
    assert.equal(env.HOME, "/home/test");
  });

  it("blocks AUTH_TOKEN", () => {
    const env = buildChildEnv({
      PATH: "/usr/bin",
      AUTH_TOKEN: "secret-token-123",
    });
    assert.equal(env.AUTH_TOKEN, undefined);
  });

  it("blocks arbitrary env vars", () => {
    const env = buildChildEnv({
      PATH: "/usr/bin",
      AWS_SECRET_ACCESS_KEY: "secret",
      DATABASE_URL: "postgres://...",
      INTERNAL_SERVICE_TOKEN: "tok",
    });
    assert.equal(env.AWS_SECRET_ACCESS_KEY, undefined);
    assert.equal(env.DATABASE_URL, undefined);
    assert.equal(env.INTERNAL_SERVICE_TOKEN, undefined);
  });

  it("forwards CHILD_ENV_ prefixed vars with prefix stripped", () => {
    const env = buildChildEnv({
      PATH: "/usr/bin",
      CHILD_ENV_MY_CUSTOM_VAR: "value123",
    });
    assert.equal(env.MY_CUSTOM_VAR, "value123");
    assert.equal(env.CHILD_ENV_MY_CUSTOM_VAR, undefined);
  });

  it("passes API keys needed by agents", () => {
    const env = buildChildEnv({
      ANTHROPIC_API_KEY: "sk-ant-xxx",
      OPENAI_API_KEY: "sk-xxx",
    });
    assert.equal(env.ANTHROPIC_API_KEY, "sk-ant-xxx");
    assert.equal(env.OPENAI_API_KEY, "sk-xxx");
  });
});
