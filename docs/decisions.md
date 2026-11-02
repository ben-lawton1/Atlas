# Decisions

Agreed 2026-11-01. Each entry: the decision, then why. When a decision changes, edit its entry; don't add a contradicting one.

- **D1. The OS is called Atlas.** The app repo is `C:\Users\lawto\code\Atlas` (private, `github.com/ben-lawton1/Atlas`; capitalized like `Chalk`). The brain keeps its `aios` folder and repo, because moving paths orphans Claude Code's memory and settings.
- **D2. Atlas is its own app, separate from Chalk.** Custom dashboards will be added over time, and they don't belong in a whiteboard app.
- **D3. Chalk is integrated as the note-taking feature, through an iframe.** Chalk keeps its own repo, releases and tests, and Atlas never imports Chalk code. If Chalk is down, only the notes area breaks.
- **D4. In Atlas, Chalk's notebook sidebar starts hidden but can be opened.** Chalk gets an embed mode (`?embed=1`) that starts with `sidebarOpen = false`. Atlas has a "Notebooks" button that opens and closes it through `postMessage` (origin-checked). Chalk's own open button keeps working. Atlas's left panel is the main way to navigate, but Chalk's full notebook tools (create, rename, move) stay one click away. Standalone Chalk at `:8080` is unchanged.
- **D5. The left panel has two trees: Notes (Chalk notebooks > sections > pages) and Atlas (the brain).** The brain tree shows `entities`, `connectors`, `modules`, `pipelines`, `state` and `intake`. Intake is included so it's visible what still needs sorting.
- **D6. Atlas is read-only toward the brain; only Claude writes to it.** The brain is mounted read-only. Changes go through Claude, so they stay consistent with the brain's rules and land in git.
- **D7. Never serve secrets or raw data.** No dotfiles, `.env`, `intake/raw/` or `*.sqlite`, and every path is checked to stay inside the brain. Atlas will become reachable beyond this machine (D10), so it must be safe to expose from the start.
- **D8. Same stack as Chalk:** React + TypeScript + Vite, FastAPI, one Docker image, separate compose files for prod, dev and test. One stack to know, and Chalk's theme, tests and Docker patterns carry over.
- **D9. The home page starts minimal and grows by iteration.** v0 has today's date, recently changed brain files, recently updated Chalk pages, and an empty Dashboards area.
- **D10. Phone access is planned but not designed yet.** The decision factors it in now:
  - Every URL and host is config (`CHALK_URL`, bind address), never hard-coded to `localhost`.
  - The app's own API calls go through the Atlas backend, so a single origin can be exposed later.
  - The port binds to `127.0.0.1` until remote access, and authentication with it, is designed.
  - Chalk calls its API at absolute `/api` paths. Serving it under Atlas's origin later (for example at `/chalk/`) needs a base-path change in Chalk; until then the iframe points at Chalk's own port.
  - Chalk's terminal bridge (a shell on the host) is never exposed remotely.
- **D11. Look: Chalk's dark theme and green accent,** so the two feel like one product.
- **D12. Real URLs** (`/`, `/atlas/<path>`, `/notes/<board id>`) so back, forward, refresh and links work.
- **D13. The embed contract between Atlas and Chalk.** Both repos code to this; changing it means changing both.
  - **URL:** `<chalk>/?board=<id>&embed=1`. The `board` parameter also works in standalone Chalk. An unknown id falls back to the normal start page and shows a toast. `embed=1` starts with the notebook sidebar closed; everything else stays as it is.
  - **Messages from Atlas to Chalk:** `{source:'atlas', type:'chalk:set-sidebar', open:boolean}`, `{source:'atlas', type:'chalk:toggle-sidebar'}`, `{source:'atlas', type:'chalk:open-board', id}`.
  - **Messages from Chalk to Atlas** (to `window.parent`, only when embedded): `{source:'chalk', type:'chalk:ready'}`, `{source:'chalk', type:'chalk:sidebar', open}` on every change, and `{source:'chalk', type:'chalk:board', id, name}` whenever the open board changes, so Atlas's URL and tree follow.
  - **Origins:** each side checks `event.origin`. Chalk accepts messages only from `CHALK_EMBED_ORIGINS` (env, comma-separated, default `http://localhost:8090,http://127.0.0.1:8090`), exposed through Chalk's `/api/config`. Chalk sends `Content-Security-Policy: frame-ancestors 'self' <those origins>`, so no other site can frame it; it has a terminal. Atlas accepts messages only from the origin of `CHALK_PUBLIC_URL`.
- **D14. Addresses and ports.**
  - Atlas prod: `${ATLAS_BIND:-127.0.0.1}:8090`. Atlas dev: API `127.0.0.1:8001`, web `127.0.0.1:5174`, so they don't collide with Chalk dev on 8000/5173.
  - `CHALK_API_URL` is what the Atlas backend calls (default `http://host.docker.internal:8080`). `CHALK_PUBLIC_URL` is what the browser loads in the iframe (default `http://localhost:8080`), and Atlas exposes it through `/api/config`.
  - The brain is mounted from `${AIOS_DIR:-C:/Users/lawto/aios}` to `/aios:ro`.
  - Atlas's tests use a fixture brain and a stub Chalk, never the real brain or Ben's Chalk library.

## Proposed by implementer (2026-11-01, for review)

- **D15. The guard matches section names exactly (case-sensitive) and rejects names that look like databases or env files at any depth.** Besides `*.sqlite`, `*.sqlite-*` and `*.db`, it also refuses `*.db-*` and any segment starting with `.env` (already covered by the dotfile rule). Stricter than required; costs nothing.
- **D16. The tree and recent walks skip `node_modules` and `__pycache__` directories.** They are noise, not secrets; a module with dependencies would otherwise flood the tree.
- **D17. Unsupported file types (images, binaries) are listed in the tree but previews return no content.** The 1 MB cap applies only to files whose content is returned.
- **D18. `/api/atlas/tree` returns `{ sections: [...] }`; each node is `{name, path, type: 'dir'|'file', children?, kind?}`.** `/api/config` also reflects `ATLAS_BRAIN_LABEL` (set from `AIOS_DIR` by compose) as `brainLabel`.
- **D19. The iframe `src` is fixed for the lifetime of a Notes view; page changes go through `chalk:open-board`.** Atlas also ignores messages whose `event.source` is not the iframe window, on top of the origin check.
- **D20. The Chalk library is re-fetched when the browser window regains focus,** so new pages appear without a reload.
