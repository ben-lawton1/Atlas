# Atlas (app)

Front end for Ben's AI operating system Atlas. The brain itself lives in `C:\Users\lawto\aios`; this repo only reads it. Decisions: `docs/decisions.md`. Plan and status: `docs/plan.md`.

## Stack and layout

- `backend/` FastAPI (Python 3.14): `app/guard.py` (D7), `app/brain.py` (tree, file, recent), `app/library.py` (Chalk proxy), `app/main.py` (routes, SPA fallback). Tests in `backend/tests/`, fixture brain in `backend/tests/fixtures/aios/`.
- `frontend/` React 19 + TypeScript + Vite, hand-written History API router (`src/router.ts`), `markdown-it` with `html: false`.
- `stub/chalk-stub/` fake Chalk for tests. `e2e/` Playwright (runs in Docker).
- Mirrors Chalk (`C:\Users\lawto\code\Chalk`) for Docker, compose and theme. Never edit Chalk from here.

## Rules

- **Docker only.** No node, python, npm or pip on the host. Run everything with `docker compose` / `docker run`. Lock files are generated with `npm install --package-lock-only` inside a `node:24.22.1-trixie-slim` container.
- **Compose projects:** `atlas` (prod, :8090), `atlas-dev` (api :8001, web :5174), `atlas-test`. Never touch the `chalk` project, `chalk-app-1`, `chalk-data` or Ben's Chalk library.
- **Tests never use the real brain.** Fixture brain and stub Chalk only.
- **MUST NOT BREAK: the D7 guard** (`backend/app/guard.py`). Every brain path goes through `Guard.resolve`. Allowed only under the six sections; rejects dotfiles/dot dirs, `..`, absolute/drive/backslash paths, `intake/raw/**`, `*.sqlite*`, `*.db`, `.env*`, and anything whose realpath leaves the root or lands on a forbidden path (symlinks). Rejections are 404, indistinguishable from missing. Excluded items must be absent from tree and recent. Any change to the guard needs matching tests in `backend/tests/test_guard.py` and `test_api.py`.
- **Read-only brain (D6).** Never write to `/aios`.
- **Embed contract (D13)** is shared with Chalk; change both sides together.
- Ports/URLs are config, not hard-coded (D10, D14).

## Commits

Work on a feature branch, not `main`. Add files by explicit path (`git add -- <paths>`). Commit when tests pass. Never commit `.env`, `node_modules`, build output or `e2e/artifacts`. Push only when Ben asks. Commit messages end with the Co-Authored-By line from the session.
