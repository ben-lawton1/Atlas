# Build plan

Opus plans and reviews, Sonnet codes. Each slice is one or more commits on `feat/atlas-v0` (Atlas) or `feat/embed` (Chalk), with tests passing. Nothing is pushed until Ben asks.

| # | Slice | Status |
|---|---|---|
| 1 | Skeleton: repo, `.gitignore`, `.env.example`, Dockerfile, compose files, FastAPI `/api/health`, frontend shell with the D12 router | done |
| 2 | Brain tree and preview: `/api/atlas/tree`, `/api/atlas/file`, `/api/atlas/recent`, D7 tests, left-panel tree, markdown/text preview | done |
| 3 | Chalk embed (in the Chalk repo, `feat/embed`): `?board=`, `?embed=1`, postMessage listener | other agent, not part of this repo |
| 4 | Notes tree and Chalk iframe: `/api/notes/library` proxy, `/notes/<id>`, Notebooks button | done (verified against a stub Chalk; real Chalk needs slice 3) |
| 5 | Home v0 per D9 | done |
| 6 | End-to-end tests, README, CLAUDE.md, docs | done |

## Not yet done / next

- Verify the iframe against the real embed-mode Chalk once slice 3 lands.
- Dashboards, remote access and authentication (D10).
