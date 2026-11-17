# CLAUDE.md

All agent instructions for this repo live in **[AGENTS.md](AGENTS.md)**. Read it first; it covers context, commands, conventions, file ownership, how to claim tasks (`docs/TASKS.md`), how to hand off (`docs/HANDOFF.md`) and the definition of done.

Quick reminders:
- `npm run check` before every PR; `npm run sim` must stay green (it enforces the core design rule).
- Keep `engine/` pure and deterministic; contracts are in `engine/types.ts` + `content/schema/`.
- Never show upgrade `family` to players before purchase. Never invent precise statistics.
- Work on a branch, open a PR, never force-push `main`.
