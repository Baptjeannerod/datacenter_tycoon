# Contributing

Thanks for helping! This is a one-day project, so the process is light but strict about a few things. Agents and humans follow the same rules; the full version is in [AGENTS.md](AGENTS.md).

## 1. Pick a task

Open [docs/TASKS.md](docs/TASKS.md) or the GitHub issues. Choose one with Owner `_unclaimed_`, set yourself as Owner and Status `doing` (or comment "taking this" on the issue).

## 2. Branch

```bash
git checkout main && git pull
git checkout -b <role>/<task-id>-<topic>     # e.g. content/RES-2-quiz
```

## 3. Make the change

| You are… | You edit… | You run… |
|---|---|---|
| Game designer / researcher | `content/*.json` | `npm run validate:content`, `npm run sim -- --runs 200`, `npm run docs:catalog` |
| Front-end dev | `ui/`, `dashboard/` | `npm run dev`, `npm run build`, test at 375 px |
| Engine dev | `engine/` (+ tests) | `npm test`, `npm run sim` |
| Artist / UX | `ui/tokens.css`, `assets/` | `npm run dev` |

Not a coder? You can edit JSON directly on GitHub (pencil icon → "Create a new branch and start a pull request"). CI will tell you if something is wrong, with the file and item id.

## 4. Open a pull request

- Title starts with the task id: `DEV-2: decision cards`.
- Fill in the PR template checklist.
- CI must pass. Ask one teammate to review.
- After merge, set the task to `done` and append to [docs/HANDOFF.md](docs/HANDOFF.md).

## Rules that matter

- Never force-push `main`. Never rewrite shared history.
- Every player-facing number needs a `source` and a `confidence`. When unsure: `illustrative`.
- Don't reveal whether an upgrade is "good" or a "trap" before the player buys it.
- No personal data in analytics. No secrets in the repo.
- Keep it light: ask before adding a dependency.
