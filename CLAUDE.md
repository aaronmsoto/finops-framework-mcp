@AGENTS.md

## Claude Code specifics

- Session-start memory injection, gate enforcement in loop mode, and policy-file protection are wired via hooks in `.claude/settings.json` — if a hook blocks you, read its message; do not work around it.
- Use the `reviewer` subagent (`.claude/agents/reviewer.md`) to verify completed work you authored.
