# Changelog

## 1.0.0 (2026-04-06)

Initial release.

- MCP server with SSE transport for spawning and controlling coding agent sessions
- Support for Codex CLI (via node-pty) and Claude Code (via `--print` mode)
- 6 session tools: start, send, output, wait, list, kill
- 2 filesystem tools: read_file, list_directory (sandboxed to workspace)
- Bearer token authentication on all endpoints
- Environment variable whitelisting for child processes
- Per-IP rate limiting and SSE connection caps
- Ring buffer output with offset-based pagination
- Idle session cleanup and graceful shutdown
- macOS LaunchAgent documentation for persistent deployment
