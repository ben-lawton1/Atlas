# Atlas (app)

Front end for Ben's AI operating system Atlas. The brain itself lives in `/home/ben/Atlas/aios`; this repo only reads it. Decisions: `docs/decisions.md`. Plan and status: `docs/plan.md`.

## Stack and layout

- `backend/` FastAPI (Python 3.14): `app/guard.py` (D7), `app/brain.py` (tree, file, recent), `app/library.py` (calls to Chalk), `app/notes_write.py` (notes write proxy + D22 guard), `app/main.py` (routes, SPA fallback). Tests in `backend/tests/`, fixture brain in `backend/tests/fixtures/aios/`.
- `frontend/` React 19 + TypeScript + Vite, hand-written History API router (`src/router.ts`), `markdown-it` with `html: false`. `src/ui/Sidebar.tsx` is the Chalk-style tree (pure logic in `src/tree.ts`, notes operations in `src/notesActions.ts`); `src/ui/terminal/` is the global terminal dock (state in `terminalStore.ts`, xterm lazy-loaded). `src/ui/Rail.tsx` is the left nav, `src/ui/CommandBox.tsx` the Ctrl+K jump box (matching in `src/commands.ts`). `src/ui/dashboards/` holds the calendar, portfolio and briefing panels and views; their data logic is in `src/calendar.ts`, `src/portfolio.ts`, `src/briefing.ts`.
- `backend/app/dashboards.py` serves `/api/calendar`, `/api/portfolio`, `/api/briefing` (D37). Connectors plug in as sources (`CalendarSource`, `PortfolioSource`, `BriefingSource`) via `create_app(dashboard_sources=...)`; the response shapes are a contract with the frontend types, so change both together.
- `bridge/` Go terminal bridge `atlas-terminal` (runs on Windows, never in Docker for real use). Built and tested only via `compose.tools.yaml` (project `atlas-tools`); output in `bridge/dist/` (git-ignored).
- `stub/chalk-stub/` fake Chalk for tests (in-memory library with the write endpoints). `e2e/` Playwright (runs in Docker).
- Mirrors Chalk (`/home/ben/Atlas/code/Chalk`) for Docker, compose, theme and the sidebar/terminal code. Never edit Chalk from here.

## Rules

- **Docker only.** No node, python, go, npm or pip on the host. Run everything with `docker compose` / `docker run`. Lock files are generated with `npm install --package-lock-only` inside a `node:24.22.1-trixie-slim` container.
- **Compose projects:** `atlas` (prod, :8090), `atlas-dev` (api :8001, web :5174), `atlas-test`, `atlas-tools` (bridge build/test). Never touch the `chalk` project, `chalk-app-1`, `chalk-data` or Ben's Chalk library. Tests never write to Ben's Chalk; they use the stub.
- **Tests never use the real brain.** Fixture brain and stub Chalk only.
- **MUST NOT BREAK: the D7 guard** (`backend/app/guard.py`). Every brain path goes through `Guard.resolve`. Allowed only under the six sections; rejects dotfiles/dot dirs, `..`, absolute/drive/backslash paths, `intake/raw/**`, `*.sqlite*`, `*.db`, `.env*`, and anything whose realpath leaves the root or lands on a forbidden path (symlinks). Rejections are 404, indistinguishable from missing. Excluded items must be absent from tree and recent. Any change to the guard needs matching tests in `backend/tests/test_guard.py` and `test_api.py`.
- **MUST NOT BREAK: the D22 write guard** (`make_write_guard` in `backend/app/notes_write.py`). It is a dependency on every mutating route: `Origin` must be in `ATLAS_ORIGINS` (403), and POST/PUT must be `application/json` (415). No CORS middleware, ever. New mutating routes must go through `build_router` so they inherit the guard; changes need tests in `backend/tests/test_notes_write.py`. The notes proxy forwards only the endpoints and fields listed in D21 (never `scene`, never `baseVersion`).
- **Terminal bridge security** (D25) must stay as is: loopback-only listen, Origin and Host allowlists, profile ids only (commands come from config, never from a request), 16-session cap.
- **Read-only brain (D6).** Never write to `/aios`.
- **Embed contract (D13)** is shared with Chalk; change both sides together.
- Ports/URLs are config, not hard-coded (D10, D14, D28).

## Commits

Work on a feature branch, not `main`. Add files by explicit path (`git add -- <paths>`). Commit when tests pass. Never commit `.env`, `node_modules`, `bridge/dist`, build output or `e2e/artifacts`. Push only when Ben asks. Commit messages end with the Co-Authored-By line from the session.
