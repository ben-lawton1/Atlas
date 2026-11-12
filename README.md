# Atlas

Atlas is the name of Ben's AI operating system. This repo is its front end: a home page, a read-only browser for the brain (`/home/ben/Atlas/aios`), and a terminal dock with a one-click Claude Code session. Home is a dashboard (this week's calendar, portfolio, daily briefing, recent files); `/calendar` and `/portfolio` are full views. They show "not connected" until calendar and brokerage connectors are added behind `/api/calendar`, `/api/portfolio` and `/api/briefing` (D37). A left rail switches views, Ctrl+K jumps to any view or brain file, and Ctrl+\ hides the brain sidebar.

Stack: React + TypeScript + Vite, FastAPI, one Docker image, plus a small Go program (the terminal bridge) that runs on Windows. Same patterns as Chalk.

## Run

Docker only; nothing is installed on the host.

```
docker compose up -d --build        # http://127.0.0.1:8090
```

Atlas mounts the brain read-only. For the terminal, see [Terminal](#terminal).

## Develop

```
docker compose -f compose.dev.yaml up --build   # web http://127.0.0.1:5174, api http://127.0.0.1:8001
```

## Test

```
docker compose -f compose.test.yaml --profile unit run --build --rm api-unit    # pytest (D7 guard, API, dashboards)
docker compose -f compose.test.yaml --profile unit run --build --rm web-unit    # tsc + vitest
docker compose -f compose.tools.yaml run --rm bridge-unit                       # go vet + go test for the terminal bridge
docker compose -f compose.test.yaml run --rm --build e2e                        # Playwright against fixture brain + Linux bridge
docker compose -f compose.test.yaml down -v                                     # clean up
```

Tests use the fixture brain in `backend/tests/fixtures/aios/` and the Linux build of the bridge with a fake `claude` profile, never the real brain or a real shell on the host.

## Terminal

Atlas has a terminal dock under the main pane on every page (Home, calendar, portfolio, brain files). A browser page and a Docker container can't start processes on your PC, so a small helper, the **terminal bridge** (`atlas-terminal`, written in Go, source in `bridge/`), runs on Windows and connects the dock to a pseudo-terminal.

**Using the dock.** Click the terminal button in the top bar, or press `` Ctrl+` `` from anywhere (also from inside the terminal), to show or hide it. Opening it with no session starts the default profile (PowerShell on Windows). Drag its top edge to resize (between 120 px and 70% of the window); size and open state are remembered. Each session is a tab with a × to close it; `+` opens another with the default profile, `▾` lists every profile, and **Claude** starts Claude Code in the brain (see below). The right-hand buttons hide the dock (sessions keep running) and kill all sessions. Sessions survive navigating around Atlas; reloading the browser tab ends them. When a shell exits, its tab says "[process exited with code N]" with a Restart button. Inside the dock every key goes to the shell; `Ctrl+C` copies when text is selected and otherwise interrupts, `Ctrl+V` pastes. If the bridge isn't running, the dock says so with a Retry button and checks again every 3 seconds.

**Build it** (Docker only; the Go toolchain never touches your PC):

```sh
docker compose -f compose.tools.yaml run --rm bridge-build
```

This writes `bridge\dist\atlas-terminal.exe` (Windows) and `bridge/dist/atlas-terminal` (Linux), both git-ignored. `docker compose -f compose.tools.yaml run --rm bridge-unit` runs its tests.

**Run it:** double-click `bridge\dist\atlas-terminal.exe`, or start it from a terminal. It listens on `127.0.0.1:7681` and logs every session start and stop. Flags: `--addr` (default `127.0.0.1:7681`), `--config` (profiles file), `--allow-non-loopback` (test stack only) and `--version`. Atlas tells the browser where the bridge is through `GET /api/config` (`terminalUrl`, from `ATLAS_TERMINAL_URL`, default `http://127.0.0.1:7681`).

**Start it with Windows:** press Win+R, run `shell:startup`, and in that folder create a shortcut to `atlas-terminal.exe`. In the shortcut's properties set "Run" to "Minimized".

**Profiles.** Built in: `powershell` (PowerShell 7 if `pwsh` is installed, otherwise Windows PowerShell), `wsl` (only if `wsl.exe` exists), both starting in your home folder, and `claude`. Add your own in `~/.atlas/terminal.json` (`%USERPROFILE%\.atlas\terminal.json` on Windows) (or `--config`; the path in use is printed at startup, and a missing file is fine):

```json
{
  "defaultProfile": "powershell",
  "profiles": [
    { "id": "homelab", "name": "homelab (ssh)", "command": "ssh", "args": ["me@192.168.1.10"] },
    { "id": "repo", "name": "Atlas repo", "command": "pwsh.exe", "args": ["-NoLogo"], "cwd": "C:\\Users\\you\\code\\Atlas", "env": { "EDITOR": "code" } }
  ],
  "origins": [],
  "hosts": []
}
```

Each profile needs an `id` (1 to 32 letters, digits, `-` or `_`), a `name` and a `command`; `args`, `cwd` (`~` is your home folder) and `env` are optional. A profile with a built-in id replaces the built-in. `TERM=xterm-256color` and `COLORTERM=truecolor` are always set. `origins` and `hosts` extend the allowlists below.

**The Claude button.** It opens a tab with the built-in profile `claude` ("Claude Code"). The command is `claude` if it is on PATH, otherwise the newest `%USERPROFILE%\.vscode\extensions\anthropic.claude-code-*\resources\native-binary\claude.exe` (newest by version in the folder name, falling back to the modification time). The working folder is `~/aios`, the brain, so its `CLAUDE.md` applies. Nothing gets installed. If no binary is found the profile isn't listed and the button is disabled with the hint "Claude Code not found — install the VS Code extension or put claude on PATH". To use another command or folder, define a profile with id `claude` in `terminal.json`; it replaces the built-in.

**Security model.** A terminal is remote code execution, so the bridge is strict. It listens on loopback only (a non-loopback `--addr` is refused unless you also pass `--allow-non-loopback`, which only the test stack does, inside its private Docker network). Every request must carry an `Origin` header on the allowlist (by default Atlas at `http://localhost:8090`, `http://127.0.0.1:8090` and the dev server on port 5174) and a `Host` header that is `127.0.0.1:<port>` or `localhost:<port>` (this blocks DNS rebinding); anything else gets a 403. The browser only ever sends a profile **id**; commands and arguments come from the built-ins and your config file, never from a request. At most 16 sessions run at once, and closing a session's socket kills its process tree. The bridge is never exposed beyond this machine.

**Troubleshooting.**

- *"cannot listen on 127.0.0.1:7681"*: another copy is already running (check the tray and Task Manager; the old `chalk-terminal.exe` uses the same port), or another program uses it. Start with `--addr 127.0.0.1:7682` and set `ATLAS_TERMINAL_URL=http://127.0.0.1:7682`.
- *The WSL profile is missing*: `wsl.exe` was not found on PATH.
- *The Claude button is disabled*: no `claude` on PATH and no `anthropic.claude-code-*` extension under `%USERPROFILE%\.vscode\extensions`. Check the bridge's startup log line `profiles: ...`.
- *A request is refused with 403*: Atlas is being opened from an origin the bridge doesn't know. Add it to `origins` in `terminal.json` and restart the bridge.
- *A profile you added doesn't show up, or the bridge exits at startup*: it prints the exact problem in `terminal.json`.
- Quick check from PowerShell: `Invoke-RestMethod -Headers @{Origin='http://localhost:8090'} http://127.0.0.1:7681/health` returns `ok`, `version` and `platform`.

## Configuration

Copy `.env.example` to `.env` to override. All are optional.

| Variable | Default | Meaning |
|---|---|---|
| `AIOS_DIR` | `/home/ben/Atlas/aios` | brain folder, mounted read-only at `/aios` |
| `ATLAS_BIND` | `127.0.0.1` | address Atlas listens on (port 8090) |
| `ATLAS_TERMINAL_URL` | `http://127.0.0.1:7681` | where the browser reaches the terminal bridge (D28) |

Decisions live in `docs/decisions.md`, the build plan in `docs/plan.md`.
