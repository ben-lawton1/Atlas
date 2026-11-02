# Build plan

Opus plans and reviews, Sonnet codes. Each slice is one or more commits on `feat/atlas-v0` (Atlas) or `feat/embed` (Chalk), with tests passing. Nothing is pushed until Ben asks.

| # | Slice | Status |
|---|---|---|
| 1 | Skeleton: repo, `.gitignore`, `.env.example`, Dockerfile, compose files, FastAPI `/api/health`, frontend shell with the D12 router | done |
| 2 | Brain tree and preview: `/api/atlas/tree`, `/api/atlas/file`, `/api/atlas/recent`, D7 tests, left-panel tree, markdown/text preview | done |
| 3 | Chalk embed (in the Chalk repo, `feat/embed`): `?board=`, `?embed=1`, postMessage listener | done (Chalk commits 08d7719, 97d6324) |
| 4 | Notes tree and Chalk iframe: `/api/notes/library` proxy, `/notes/<id>`, Notebooks button | done; verified live against real Chalk 2026-11-02 (sidebar starts hidden, Notebooks toggles it, refresh keeps the page) |
| 5 | Home v0 per D9 | done |
| 6 | End-to-end tests, README, CLAUDE.md, docs | done |

## Round 2 (2026-11-02): branch `feat/atlas-v1` (Atlas) and `feat/atlas-sync` (Chalk)

| # | Slice | Status |
|---|---|---|
| 7 | Notes write proxy (D21) with the Origin/JSON guard (D22) and tests | done |
| 8 | Sidebar ported from Chalk (D23): look, add buttons, More menu, inline rename, two-step delete, keyboard; brain tree restyled | done |
| 9 | Sync with embedded Chalk (D24): library-changed both ways, open new page, go Home when the open page is deleted | done |
| 10 | Bridge moved into Atlas as `atlas-terminal` (D25), with the `claude` built-in profile (D27) and Atlas origins | done (binary built; the switch from `chalk-terminal.exe` is Ben's to do) |
| 11 | Global terminal dock (D26, D28) with the Claude button | done |
| 12 | Chalk: terminal removed, D24 messages added (Chalk repo) | done (Chalk `feat/atlas-sync`: 69a20d6, 162ac6e) |
| 13 | e2e for all of the above; README, CLAUDE.md, plan status | done |

Live check 2026-11-02 against real Chalk (from `feat/atlas-sync`) and `atlas-terminal.exe`:
- **Passed:**
  - Chalk-style sidebar.
  - New notebook from Atlas lands in the real library. The rename box survives the real iframe loading.
  - Embedded Chalk's sidebar shows the new notebook.
  - Two-step delete from the More menu.
  - PowerShell runs in the dock.
  - The Claude button starts the VS Code extension's `claude.exe`, which shows first-run onboarding (theme picker).
- **Not checked live:** Ctrl+` from inside real Chalk and dock persistence on a real note page. My script looked for "Test Board" after Ben had renamed it. Both are covered by the e2e suites.

## Round 3 (2026-11-02): branch `feat/dashboards` (off `feat/atlas-v1`)

Decisions D35–D40. Four Sonnet agents in parallel, each owning its own files; Opus integrates.

| # | Slice | Status |
|---|---|---|
| 14 | Backend: `/api/calendar`, `/api/portfolio`, `/api/briefing` (D37), not connected, with tests | done |
| 15 | Frontend data: `calendar.ts`, `portfolio.ts`, `briefing.ts`, api calls, unit tests | done |
| 16 | Dashboard UI: week calendar, portfolio panel, briefing panel, `/calendar` and `/portfolio` views | done |
| 17 | Shell: rail, top bar with command box (Ctrl+K), Ctrl+\ sidebar toggle, routes, new Home, e2e | done |

Checks 2026-11-02 (all in Docker): backend 141 passed, frontend 81 unit tests passed, e2e 31/31. Not yet looked at by Ben in the running app.

Next for round 3:
- **Connectors.** Calendar sources first: Google Calendar (personal) and Microsoft 365 (Hyper, not authorized yet). Then a brokerage API for the portfolio. Decide whether sources call the APIs live or read rows that a sync (a Claude MCP run or a module) writes into `state/` (the guard already keeps `*.sqlite` from being served).
- **Tasks.** Where they live and how they're edited (D38), then Add task and subtasks.
- **Briefing.** Generated each morning once calendar and mail are connected.
- **Deferred design items:** Spaces, notifications, Auto-plan, "Ask Atlas" in the command box.

## Not yet done / next

- **Bridge switch:** Ben closes `chalk-terminal.exe` and starts `atlas-terminal.exe` on the default `127.0.0.1:7681`; then recreate the Atlas container without the temporary `ATLAS_TERMINAL_URL=http://127.0.0.1:7682` override.
- **Running bridge locks its build:** `bridge/dist/atlas-terminal.exe` is locked while it runs, so `bridge-build` fails then. Consider running a copy from a stable folder.
- **Merge:** after Ben's hands-on check, merge `feat/atlas-v1` and Chalk's `feat/atlas-sync` to `main` and push.
- Dashboards, remote access and authentication (D10).
