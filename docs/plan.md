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
| 12 | Chalk: terminal removed, D24 messages added (Chalk repo) | planned |
| 13 | e2e for all of the above; README, CLAUDE.md, plan status | done |

## Not yet done / next

- Ben's hands-on check, then merge `feat/atlas-v0` and Chalk's `feat/embed` to `main`.
- Page switching inside the real Chalk is only covered by the stub and Chalk's own e2e (the real library has one page).
- Dashboards, remote access and authentication (D10).
