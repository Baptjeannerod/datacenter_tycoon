# /dashboard (DEV-7)

Second Vite entry: `dashboard/index.html` + `main.tsx` → served at `/dashboard/`. Reads `GET /api/stats` (see `api/README.md`) and refreshes every 30 s.

- Shows unique visitors, sessions, runs, knowledge (% of quiz answers right), rating distribution and mean, most-missed questions, average Sustainability / Responsibility / impact / legacy, archetypes, most-built buildings, most-bought upgrades split by family (good / trap / trade-off), most-chosen client and event answers, valleys played.
- Ids are turned into names with the `/content` JSON (question text, upgrade names, client names).
- Same look as the game: imports `ui/styles.css` (tokens, panels, top bar) plus `dashboard.css`. Single column on a phone, bigger type on screens ≥ 1280 px (projector).
- If `/api/stats` is unreachable before any live data arrived, it shows `demo.ts` under a large **Demo data** banner. If a later refresh fails, it keeps the last live numbers and says so.
- Local: `npm run dev`, then open http://localhost:5173/dashboard/ (the dev server serves `/api` with an in-memory store).
