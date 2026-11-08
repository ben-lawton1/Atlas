# Build spec: Liquid glass shell, Home and tab frames (round 6)

Written by Opus 2026-11-08 from Ben's mockup `Liquid_Glass_Dashboard.html` (decoded copy of its markup: `/tmp/claude-1000/-home-ben-Atlas/be83548d-3e1d-43e5-a1c1-342ca5ab2f24/scratchpad/mock/template.html`, lines 271–507 are the live template; read them for exact values). Branch `feat/glass-home` (already created off `feat/apple-design-home`). Read `CLAUDE.md`, `docs/design.md` and `docs/decisions.md` first; every rule there still applies unless this spec overrides it.

## 0. What Ben asked

Move Home to the mockup's look. Stack: React + Vite (have) + Tailwind CSS + shadcn/ui-style components, Recharts (sparkline), react-day-picker via a shadcn-style `Calendar` (mini month), `cmdk` via a shadcn-style `Command` (Ctrl+K), lucide-react icons, Framer Motion (`motion` package) for hover lifts and route transitions. Data stays blank: connectors aren't built. Build the **frame for every tab to come**, wired to the existing not-connected endpoints where they exist.

## 1. Design decisions taken from the mockup (record as D43 in decisions.md, rewrite design.md to match)

Mockup values → Atlas decision:

| Area | Mockup | Atlas decision |
|---|---|---|
| Background | 4 radial blobs (teal 10%/15%, violet 90%/10%, rose 78%/95%, green 22%/92%) over `linear-gradient(135deg,#0b1020,#121029 50%,#160f1c)` | Same, as a fixed `.atlas-backdrop` layer behind everything (dark). Light: same positions, pastel blobs (e.g. `rgba(80,170,200,.35)`, `rgba(150,120,230,.32)`, `rgba(235,140,160,.28)`, `rgba(90,190,150,.28)`) over `linear-gradient(135deg,#eef2f8,#f1eef8 50%,#f7eff2)`. Glass needs color behind it. |
| Layout | flex: nav 232px + content column (header panel, main panel), gap 20, page padding 20, max 1480 centered | Same. Nav width 232px (`--nav-w`). Under 760px: nav becomes an overlay drawer (☰ in the top bar), header and main full width, padding 12. |
| Glass (functional layer) | nav + header: `rgba(20,24,40,.45)`, border `rgba(255,255,255,.1)`, `blur(28px) saturate(160%)`, shadow `0 20px 50px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)`, radius 28 / 24 | Glass only on nav, top bar and overlays (command dialog, drawer) — HIG `liquid-glass.md › Where the material belongs`. Fill raised to `.62` dark / `rgba(255,255,255,.62)` light (HIG regular variant: 60–80% fill, text-heavy sidebars). Blur 28px, saturate 160%, hairline border, inset top highlight, that shadow. Radius: nav 28, top bar 24. |
| Main panel | `rgba(18,22,38,.38)` + blur, radius 30, padding 28, shadow `0 30px 70px rgba(0,0,0,.4)` | Content layer = a **standard material**, not glass: blur 28px, fill `.55` dark / `rgba(255,255,255,.55)` light, no inset highlight, radius 30, padding 28 (16 compact). This is the third and last blurred surface. |
| Cards | `rgba(255,255,255,.07)`, border `.12`, radius 22–24, padding 18–22, shadow `0 10px 26px rgba(0,0,0,.25)` | Same, **no blur** (perf + one material level). Light: `rgba(255,255,255,.55)`, border `rgba(255,255,255,.7)`, shadow `0 10px 26px rgba(30,40,80,.08)`. Radius 22 (stat tiles) / 24 (sections). Rows inside cards: fill `.07` / `rgba(255,255,255,.6)`, radius 14, padding 10×12. No cards inside rows. |
| Controls | pills 44px tall radius 22; icon buttons 44 circle; segmented 28px, active white `rgba(255,255,255,.9)` with dark text; nav item 44px radius 14, active fill `.12` + border `.14` + accent icon | Same sizes (≥44px everywhere now; meets D42 touch rule on all pointers). Segmented control keeps 28px visual height but a 44px hit area on `pointer: coarse` via padding. |
| Accent | `#6ea8ff` | Keep D42 accent tokens (`#78a9ff` dark, `#1f5fc4` light). Accent only on: active nav icon, selected segment ring/focus, today in calendar is **white fill / dark text** (as mockup) — not accent, chart line uses positive/negative (D42). |
| Type | Inter; h1 32/700 −0.02em; card h2 16/700; stat 28/700; body 14; meta 12–13; eyebrow 11 uppercase .08em | Keep system font (D42, one family, no network fonts). Map to rem: h1 `2rem/2.5rem 700 -0.02em`; stat value `1.75rem 700 tabular-nums`; portfolio total `1.875rem 700`; card title `1rem 700`; body `0.875rem`; meta `0.8125rem`; caption `0.75rem`. Eyebrows `0.75rem 600 uppercase .08em` (12px floor, not 11). |
| Text colors | `#eef1f7` / `#ffffff` headings / secondary `#a3acc0` / `#b3bccd` / eyebrow `#8f99b0` / nav idle `#c6cdda` | Dark tokens: `--label #eef1f7`, `--label-strong #ffffff`, `--label-secondary #b3bccd`, `--label-tertiary #a3acc0`. Light: `--label #141826`, `--label-secondary #3f4656`, `--label-tertiary #545b6b`. **Compute contrast** (script below) for every text token against the worst composite: card fill over main-panel fill over the brightest blob pixel. Every text ≥ 4.5:1; adjust values until they pass; write the numbers into design.md. |
| Signals | gain `#5fd49a`, loss `#ff8a7a` | Keep D42 `--positive`/`--negative`; gains still carry ▲ and sign (nothing by color alone). |
| Motion | (Ben's note) hover lifts, panel transitions | `motion` package. Cards: `whileHover={{ y: -2 }}` 150ms + slightly stronger shadow. Route change: main panel content fades in + rises 4px, 180ms. Wrap the app in `<MotionConfig reducedMotion="user">`. Nothing else animates. |
| Accessibility states | — | `@media (prefers-reduced-transparency: reduce)` and `(prefers-contrast: more)`: opaque fills (`#151a2b` / `#f4f6fa` for glass and main, `#1d2336` / `#ffffff` for cards), borders to `.28`, no backdrop-filter. Keep focus rings (2px accent). |
| Removed from mockup (D38 / D42) | bell, theme toggle, Customize, New item, Notes "New" button, storage meter, avatar "Pro plan", badges with fake counts | No controls that do nothing; appearance follows the OS. Badges only from real data (none today). Storage card → **Connectors card**: "Connectors · 0 of 3 connected" with a meter, computed from the `connected` flag of `/api/calendar`, `/api/portfolio`, `/api/briefing`; links to `/settings`. Identity chip "Ben Lawton" + brain label (static text, not a button) with initials avatar `BL` on the mockup's gradient `#3f8fb8 → #7a5ad6`. |

## 2. Stack setup (all in Docker)

- Add (exact versions, each published ≥ 14 days ago; check with `npm view <pkg> time --json` in `node:24.22.1-trixie-slim`): `tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `cmdk`, `recharts`, `motion`, `react-day-picker`, `@radix-ui/react-dialog` (for the Command dialog), `clsx`, `tailwind-merge`, `class-variance-authority`. Confirm each supports React 19.
- Regenerate `package-lock.json` with `npm install --package-lock-only` inside that container (repo rule). Rebuild images (`atlas-web-dev:local`).
- Tailwind v4 via the Vite plugin. **No preflight** (existing CSS relies on its own reset): in `src/ui/tailwind.css` use `@import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/utilities.css" layer(utilities);` and map tokens with `@theme inline { --color-label: var(--label); ... --radius-card: 24px; ... }`. Tailwind classes must use the token names, never raw hex.
- shadcn-style: `src/lib/utils.ts` (`cn`), `src/components/ui/{button,command,calendar,glass}.tsx` written by hand in shadcn's shape (or via `npx shadcn` in Docker if it works offline-safe; hand-written is fine). Add the `@/*` → `src/*` alias to `tsconfig.json` and `vite.config.ts` (and vitest config).
- `glass.tsx` exports `GlassPanel` (variant `nav|bar|overlay` = glass, `main` = material) and `Card` (plain translucent, motion hover lift). All blur comes from here — nowhere else may use `backdrop-filter`.

## 3. Shell

```
┌ backdrop (fixed blobs) ───────────────────────────────────────────────┐
│ ┌ nav (glass) ┐ ┌ top bar (glass) ─────────────────────────────────┐ │
│ │ [A] Atlas   │ │ ☰  [⌕ Search brain, views…     Ctrl K]  >_  (BL)│ │
│ │ Personal OS │ └──────────────────────────────────────────────────┘ │
│ │ TODAY       │ ┌ main (material) ─────────────────────────────────┐ │
│ │ ▣ Home      │ │ view content                                      │ │
│ │ ▢ Calendar  │ │                                                   │ │
│ │ ✓ Tasks     │ │                                                   │ │
│ │ ✎ Notes     │ │                                                   │ │
│ │ ↗ Portfolio │ │                                                   │ │
│ │ WORKSPACE   │ │                                                   │ │
│ │ ▤ Projects  │ │                                                   │ │
│ │ ✉ Messages  │ │                                                   │ │
│ │ ☺ People    │ │                                                   │ │
│ │ ◉ Brain     │ │                                                   │ │
│ │ ⚙ Settings  │ │                                                   │ │
│ │ ┌Connectors┐│ │                                                   │ │
│ │ │0 of 3 ▭▭ ││ └───────────────────────────────────────────────────┘ │
│ └─────────────┘   terminal dock (unchanged, dark)                      │
└───────────────────────────────────────────────────────────────────────┘
```

- Replace `Rail.tsx` with `Nav.tsx` (glass panel). Brand: 38px rounded-12 accent tile with a lucide icon, "Atlas" 15/700, "Personal OS" 12 secondary. Groups with eyebrows "Today" and "Workspace". Each item is an `<a>` with `aria-current="page"`, `data-testid="rail-<id>"` (keep the old testid prefix so e2e keeps working), lucide icons (`LayoutGrid, CalendarDays, CheckSquare, NotebookPen, TrendingUp, FolderKanban, MessageSquare, Users, Brain, Settings`), 18px, stroke 1.8.
- Brain tree `Sidebar.tsx`: keep its behavior (D36: ☰ / Ctrl+\, remembered, overlay on phone). Render it **inside the main panel** as a left column (280px, hairline separator), not a fourth blurred panel. Restyle its tokens to the glass palette; keep its classes and keyboard behavior.
- Top bar: ☰ toggle (`data-testid="nav-toggle"`), the search field is the **trigger** for the Command dialog (looks like the mockup field; shows "Ctrl K"; click or Ctrl+K opens). Keep `data-testid="view-title"` as a visually hidden `h1`-less label? No: views own their `h1`; put `data-testid="view-title"` on each view's `h1` instead and remove the top-bar title. Terminal button restyled as a 44px glass circle (keep its testid/behavior). Identity chip on the right.
- `CommandBox.tsx` → rebuild on `cmdk` inside a Radix Dialog (shadcn `CommandDialog`), glass overlay variant. Keep the matching logic in `commands.ts` (feed `filterCommands` results; set `shouldFilter={false}`). Add the new views to `VIEWS`. Keep existing testids used by e2e (check `e2e/tests/*.spec.ts`).

## 4. Routes (D44)

Add to `router.ts` (with tests in `router.test.ts`): `/tasks`, `/notes`, `/projects`, `/messages`, `/people`, `/settings`. `/notes` currently falls back to Home (D41) — it becomes the Notes frame. Unknown paths still go Home.

## 5. Home (`Home.tsx`)

Order (mockup): header → stat tiles → three cards.

1. Header: `h1` "Good morning/afternoon/evening, Ben" (by local hour: <12, <18, else), `data-testid="view-title"`. Under it `data-testid="home-date"`: "Sunday, November 8" + " · " + briefing summary when connected, else the sentence "No briefing yet." Keep `data-testid="briefing-panel"` on the header block and keep its connected rendering (the e2e mock checks the briefing text and "Standup with HyperSense") — briefing items list goes under the header as compact rows when connected. Read `BriefingPanel.tsx` and reuse its data logic.
2. Stat tiles (grid `repeat(auto-fit,minmax(190px,1fr))`, gap 16), each a `Card` with 36px icon tile, value, label, sub:
   - Events today — count from `/api/calendar` today; not connected → value "—", sub "Calendar not connected".
   - Tasks due today — "—", "Tasks not connected" (no endpoint yet; D38).
   - Brain changes this week — real: count of `/api/atlas/recent` files modified in the last 7 days (request a generous limit, e.g. 50); sub "Files edited in your brain".
   - Portfolio today — day change % with ▲/▼ when connected; else "—", "Portfolio not connected".
   - Use "—" only inside stat tiles (the e2e asserts the portfolio *panel* has no "—").
3. Cards grid (`repeat(auto-fit,minmax(300px,1fr))`, gap 16):
   - **Calendar** (`data-testid="week-calendar"` stays on it? No — the week grid lives on /calendar. Give this card `data-testid="month-calendar"` and keep `calendar-status` for the empty sentence "No calendar connected yet."). shadcn `Calendar` (react-day-picker) styled as the mockup: 7 columns, 34px day cells radius 11, today = white fill dark text + "Today" for screen readers (`aria-current="date"`), event dot (accent 4px) on days with events. Prev/next month buttons work and refetch `/api/calendar?start=<first visible day>&days=42`. Below a hairline: "Today" list of events (color bar = category token, title, where, time) or the empty sentence.
   - **Recently changed** (`data-testid="card-recent-atlas"`, heading "Recently changed"): mockup's Notes card style — rows with folder as tag (tertiary dot), file name as title, relative time trailing; link to the file. Up to 5. Keep loading skeleton + `role="status"` and the error state.
   - **Portfolio** (`data-testid="portfolio-panel"`, keep `portfolio-status` "Not connected" sentence): title + segmented range control (1D 1W 1M 1Y — buttons with `aria-pressed`, they refetch `/api/portfolio?range=`), total, change line, Recharts `AreaChart` sparkline 96px (gradient fill, stroke positive/negative by direction, no axes, `role="img"` + aria-label describing direction), holdings rows (symbol tile, name, allocation %, value, change). Not connected: title, segmented control hidden, one sentence.
4. Remove `home.css` rules that no longer apply; new layout in Tailwind classes.

## 6. Tab frames

One shared component `ViewFrame` (`h1` title with `data-testid="view-title"`, one-line description, then a grid of `FrameSection` cards). A `FrameSection` = Card with title, a short "what goes here" line and an empty-state sentence naming the source. No buttons that do nothing. Frames:

| Route | Title | Sections (title — empty sentence) |
|---|---|---|
| `/calendar` | Calendar | keep the existing week view (`WeekCalendar`, prev/today/next) restyled into a Card; add a side Card "Upcoming" — "Connect Google Calendar or Microsoft 365 to see upcoming events." Keep `calendar-view` testid. |
| `/tasks` | Tasks | Today · Upcoming · Done — "Tasks aren't connected yet. Where they live is still being decided." |
| `/notes` | Notes | Pinned · Recent · Notebooks — "Notes are being redesigned. They'll show up here." |
| `/portfolio` | Portfolio | keep existing `PortfolioView` restyled (Cards; Recharts for the history chart); keep `portfolio-view` testid. |
| `/projects` | Projects | Active · Recently updated — "Projects from your brain will appear here." |
| `/messages` | Messages | Inbox · Slack — "Connect Gmail and Slack to see messages here." |
| `/people` | People | Recent contacts · Follow-ups — "People from your brain and contacts will appear here." |
| `/atlas` | Brain | existing file preview + tree; restyle the preview area into the main panel. |
| `/settings` | Settings | **Connectors** list (real status): Calendar, Portfolio, Briefing rows showing "Connected"/"Not connected" from the three endpoints (+ source names when connected); Mail, Tasks, Slack rows "Not available yet". Read-only, no buttons. Appearance row: "Follows your system setting." Terminal row: bridge URL from `/api/config`. |

Each frame gets `data-testid="<route>-view"` (e.g. `tasks-view`).

## 7. Tests and checks (all in Docker, see CLAUDE.md compose projects)

- Unit: `docker compose -p atlas-test -f compose.test.yaml --profile unit run --rm web-unit` (rebuild the image after the dependency change). Add tests for: router new routes, greeting by hour, stat derivations (brain changes this week, events today), connectors count. Keep all existing tests passing (update ones made obsolete by the redesign, don't delete coverage silently).
- Backend untouched: still run `api-unit` once to confirm.
- e2e: `docker compose -p atlas-test -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from e2e e2e` (check README for the exact command). Update `atlas.spec.ts` for the new structure (home week calendar → month calendar; rail testids kept; view-title now on the view h1; new routes each render their frame; settings shows "0 of 3 connected"). Keep the screenshot tests and regenerate `e2e/artifacts/home-{light,dark,phone-dark,empty-light}.png`; add `settings-dark.png`.
- Contrast script: write `frontend/scripts/contrast.mjs` (run in node container) that composites fills (blob → main → card) and prints the ratio of every text token in both appearances; all must be ≥ 4.5:1. Paste the table into design.md.
- `npm run build` must pass; report bundle size change (Recharts is big: lazy-load the Portfolio chart with `React.lazy` if the main chunk grows > 150 kB gzip).

## 8. Docs

- `docs/design.md`: rewrite the tokens/shell/Home sections for the glass system (keep the principles list; amend "One container level", "Shadows only on overlays" and radius/size lines with D43). Include the decision table above (final values) and the contrast numbers.
- `docs/decisions.md`: add "Round 6 (2026-11-08): liquid glass" with D43 (glass shell, as section 1) and D44 (tab frames + routes, Settings connectors read-only, no fake controls).
- `docs/plan.md`: round 6 table with slices and status, checks with counts.
- `CLAUDE.md`: stack line (Tailwind v4 without preflight, `src/components/ui`, `@/` alias, lucide, cmdk, recharts, motion, react-day-picker) and "all blur lives in `components/ui/glass.tsx`".

## 9. Commits

On `feat/glass-home`, one commit per working slice, files by explicit path (`git commit -- <paths>`), message ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use the session's line). Suggested slices: (1) deps + Tailwind + ui primitives, (2) shell (nav, top bar, command dialog, backdrop), (3) Home, (4) frames + routes, (5) e2e + screenshots, (6) docs. Don't push. Don't touch `.env`, the `chalk` project, or anything outside this repo.
