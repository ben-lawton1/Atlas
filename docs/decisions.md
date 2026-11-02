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
  - The terminal bridge (a shell on the host, D25) is never exposed remotely.
- **D11. Look: Chalk's dark theme and green accent,** so the two feel like one product.
- **D12. Real URLs** (`/`, `/atlas/<path>`, `/notes/<board id>`) so back, forward, refresh and links work.
- **D13. The embed contract between Atlas and Chalk.** Both repos code to this; changing it means changing both.
  - **URL:** `<chalk>/?board=<id>&embed=1`. The `board` parameter also works in standalone Chalk. An unknown id falls back to the normal start page and shows a toast. `embed=1` starts with the notebook sidebar closed; everything else stays as it is.
  - **Messages from Atlas to Chalk:** `{source:'atlas', type:'chalk:set-sidebar', open:boolean}`, `{source:'atlas', type:'chalk:toggle-sidebar'}`, `{source:'atlas', type:'chalk:open-board', id}`, and (added 2026-11-02, D24) `{source:'atlas', type:'chalk:library-changed'}` after Atlas creates, renames or deletes anything, so Chalk reloads its tree.
  - **Messages from Chalk to Atlas** (to `window.parent`, only when embedded): `{source:'chalk', type:'chalk:ready'}`, `{source:'chalk', type:'chalk:sidebar', open}` on every change, and `{source:'chalk', type:'chalk:board', id, name}` whenever the open board changes, so Atlas's URL and tree follow. Added 2026-11-02 (D24): `{source:'chalk', type:'chalk:library-changed'}` after Chalk's own sidebar changes the library, and `{source:'chalk', type:'chalk:toggle-terminal'}` when Ctrl+` is pressed inside embedded Chalk.
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

## Round 2 (2026-11-02): notes management, sidebar look, terminal

- **D21. Notes are managed from Atlas through Chalk's API.** The Atlas sidebar can create, rename and delete notebooks, sections and pages: the same set Chalk's sidebar offers (hover "+" to add, "More" menu with Rename and a two-step Delete). The Atlas backend proxies only a fixed list of Chalk endpoints: `POST /api/notebooks`, `PUT|DELETE /api/notebooks/{nb}`, `POST /api/notebooks/{nb}/sections`, `PUT|DELETE /api/notebooks/{nb}/sections/{sec}`, `POST /api/boards` (only `name`, `notebook`, `section`, never `scene`), `PUT /api/boards/{id}` (only `name`) and `DELETE /api/boards/{id}`. Why: Chalk stays the only code that writes the library, and Atlas can't touch page contents. D6 (the brain is read-only) is unchanged.
- **D22. Write requests are protected against cross-site use.** Every mutating Atlas endpoint requires a JSON body and an `Origin` header from `ATLAS_ORIGINS` (default `http://localhost:8090,http://127.0.0.1:8090,http://localhost:5174,http://127.0.0.1:5174`); anything else gets 403. Atlas sends no CORS headers. Why: another website open in the same browser must not be able to make Atlas delete notes, and this is required anyway before remote access (D10).
- **D23. The Atlas sidebar looks and behaves like Chalk's.** It uses Chalk's sidebar tokens and classes (`--sb-*`, `.sb-*`), icons, hover add and more buttons, inline rename, two-step delete, keyboard tree navigation and current-page highlight. The brain tree uses the same styling, read-only (no add or more buttons). The code is copied from Chalk; Atlas still never imports Chalk code (D3).
- **D24. Atlas and embedded Chalk stay in sync.** D13 gained `chalk:library-changed` in both directions and `chalk:toggle-terminal` from Chalk. If the open page is deleted from Atlas, Atlas goes Home. A page created from Atlas opens right away.
- **D25. The terminal belongs to Atlas, not Chalk.**
  - The Go bridge moves from Chalk's `bridge/` to Atlas's `bridge/` and is renamed `atlas-terminal`. The code is the same, and so is the security model: loopback only, `Origin` and `Host` allowlists, profile ids only, at most 16 sessions.
  - Defaults: `127.0.0.1:7681`; allowed origins are Atlas prod and dev; config in `%USERPROFILE%\.atlas\terminal.json`.
  - Chalk's terminal panel, bridge and their tests are removed from Chalk.
  - The accepted host exception (a program running on Windows) moves with it.
  - Why: the terminal is a platform tool, useful from any view, not a whiteboard feature.
- **D26. The terminal dock is global.** It's a bottom dock under the main pane on every route, toggled from a top-bar button and Ctrl+` (also forwarded from embedded Chalk, D24). Sessions survive navigation. The rest works as in Chalk's panel: tabs, +, profile picker, hide, kill all, drag to resize, restart after exit, and remembered size and open state.
- **D27. A "Claude" button starts Claude Code in the brain.**
  - It opens a session with the built-in profile `claude`. The command is `claude` from PATH if present, otherwise the newest bundled `claude.exe` from the VS Code extension (`%USERPROFILE%\.vscode\extensions\anthropic.claude-code-*\resources\native-binary\claude.exe`). Nothing gets installed.
  - The working folder is the brain (default `~/aios`). A `claude` profile in `terminal.json` overrides it.
  - The profile is listed only when a binary is found; otherwise the button is disabled and explains why.
  - Why: orchestration starts in the brain (its `CLAUDE.md`).
- **D28. The terminal address is config and stays local.** `ATLAS_TERMINAL_URL` (default `http://127.0.0.1:7681`) reaches the browser through `/api/config`. Once Atlas is reachable from other devices (D10), the dock is disabled for non-loopback clients, and the bridge never listens beyond loopback.

## Proposed by implementer (round 2)

- **D29. The notes write routes live under `/api/notes/`.** Notebooks `POST /api/notes/notebooks`, `PUT|DELETE /api/notes/notebooks/{nb}`, sections under `/api/notes/notebooks/{nb}/sections[/{sec}]`, pages `POST /api/notes/boards`, `PUT|DELETE /api/notes/boards/{id}`. Create-page responses have `scene` stripped. Why: one prefix beside the existing `GET /api/notes/library`, mirroring Chalk's paths.
- **D30. An unset or empty `ATLAS_ORIGINS` falls back to the D22 default list.** Why: compose passes the variable through, and an empty string must not lock every write out.
- **D31. Atlas remembers its sidebar state in `localStorage['atlas:sidebar']` and the dock state in `atlas:terminal`.** The first ever visit opens every notebook and section; after that the user's state wins, and opening a page or file reveals its ancestors. Why: matches Chalk, and the notes tree must show pages without clicks on first use.
- **D32. Renaming a notebook keeps its sections expanded** (Chalk loses that state because section keys embed the notebook name). A new notebook creates a first section "Quick Notes" and a first page, like Chalk.
- **D33. The Claude button is only in the dock header and stays enabled while the bridge is unknown or offline;** it is disabled only when a running bridge doesn't list a `claude` profile. Clicking it with the bridge offline opens the dock, which explains how to start it.
- **D34. The test stack's fake `claude` profile is `sh /etc/atlas-test/fake-claude.sh`,** which prints `CLAUDE-STUB`; the e2e checks the button end to end without Claude Code.
