# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, please report it privately by emailing **hey@meimakes.com**. Do not open a public issue.

I'll acknowledge receipt within 48 hours and provide a timeline for a fix.

## Scope

This server spawns coding agents (Claude Code, Codex) that have **full shell access** on the host machine. The MCP server's own filesystem tools are sandboxed, but spawned agents are not — a manipulated prompt could access files outside the session directory.

See the [Known limitation](README.md#known-limitation-session-process-isolation) section in the README for details and recommended mitigations.

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
