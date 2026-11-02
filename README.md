# Atlas

Atlas is the name of Ben's AI operating system. This repo is its front end: a home page, a read-only browser for the brain (`C:\Users\lawto\aios`), and Chalk embedded as the note-taking feature. Dashboards come later.

Stack: React + TypeScript + Vite, FastAPI, one Docker image. Same patterns as Chalk.

## Run

Docker only; nothing is installed on the host.

```
docker compose up -d --build        # http://127.0.0.1:8090
```

Atlas mounts the brain read-only. Chalk should be running on :8080 for the Notes area (Atlas works without it).

## Develop

```
docker compose -f compose.dev.yaml up --build   # web http://127.0.0.1:5174, api http://127.0.0.1:8001
```

## Test

```
docker compose -f compose.test.yaml --profile unit run --rm api-unit    # pytest (D7 guard, API)
docker compose -f compose.test.yaml --profile unit run --rm web-unit    # tsc + vitest
docker compose -f compose.test.yaml run --rm --build e2e                # Playwright against fixture brain + stub Chalk
docker compose -f compose.test.yaml down                                # clean up
```

Tests use the fixture brain in `backend/tests/fixtures/aios/` and a stub Chalk (`stub/chalk-stub/`), never the real brain or Ben's Chalk.

## Configuration

Copy `.env.example` to `.env` to override. All are optional.

| Variable | Default | Meaning |
|---|---|---|
| `AIOS_DIR` | `C:/Users/lawto/aios` | brain folder, mounted read-only at `/aios` |
| `ATLAS_BIND` | `127.0.0.1` | address Atlas listens on (port 8090) |
| `CHALK_API_URL` | `http://host.docker.internal:8080` | what the Atlas backend calls to read Chalk's library |
| `CHALK_PUBLIC_URL` | `http://localhost:8080` | what the browser loads in the iframe; the only origin Atlas accepts messages from |

Decisions live in `docs/decisions.md`, the build plan in `docs/plan.md`.
