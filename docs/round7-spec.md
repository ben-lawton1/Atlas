# Build spec: round 7 (2026-11-08) — hover rail, transitions, connectors card, stray caret

Ben's feedback on the glass shell (`feat/glass-home`, last commit `ada2c93`). Read `CLAUDE.md`, `docs/design.md` (D42, D43) and `docs/glass-spec.md` first. Two builders work in parallel on the same branch and working tree, so **each touches only the files listed for it** and commits only its own paths.

---

## Slice A — hover rail, connectors card, transitions (builder A)

Files A owns: `frontend/src/ui/Nav.tsx`, `frontend/src/ui/App.tsx`, `frontend/src/ui/Sidebar.tsx`, `frontend/src/ui/TopBar.tsx`, `frontend/src/ui/CommandBox.tsx`, `frontend/src/components/ui/command.tsx`, `frontend/src/ui/styles.css`, `e2e/tests/atlas.spec.ts`, any new `frontend/src/ui/useRail*.ts` with its test, plus `docs/design.md`, `docs/decisions.md` and `docs/plan.md`. A must not touch `frontend/src/ui/tailwind.css`.

### A1. Connectors card: label and status on separate lines

Cause: `Nav.tsx` puts "Connectors" and "N of 3 connected" in one `flex justify-between` row with no gap. At 13px the two don't fit in the 204px inner width, so the status wraps under the label and spills out of the card.

Fix: stack them. Line 1 "Connectors" (semibold, `--label`), line 2 the status (`--label-secondary`, `data-testid="connectors-count"` unchanged), then the meter. Use `flex-col gap-1` for the text and keep `gap-2.5` before the meter. Nothing may overflow at 232px, including at 200% text size (it wraps inside the card, never outside).

### A2. Collapsed rail that expands on hover (amends D43; record as D45)

Behavior:
- **At rest** the nav is a skinny glass rail, `--rail-w: 76px`. It shows the brand tile (38px), each item's icon centered in a 44×44 target, and the **current item highlighted** exactly as now (active fill, border, accent icon). Group eyebrows are replaced by a short hairline. Item labels stay in the DOM (opacity 0, `aria-hidden` not set) so every link keeps its accessible name; also add `aria-label={label}` to each link.
- **Expands to 232px** (`--nav-w`) when the pointer enters the rail, or when focus moves into it (`:focus-within` / focusin, for keyboard users). It collapses when the pointer leaves and focus is outside.
- **Hover intent:** open after 90ms of hover, close 220ms after leave. A cursor that only grazes the rail on its way somewhere doesn't open it, and briefly overshooting the edge doesn't close it. Put the timer logic in a small hook (`useRailExpand`) with unit tests using fake timers.
- **Overlay, not push:** the expanded rail floats over the main content. The layout always reserves `--rail-w`; the glass panel is absolutely positioned inside that slot and grows to the right with a higher z-index. The top bar and main panel don't move or reflow (no chart re-layout on every hover). This is glass's job: the functional layer floats over content (`liquid-glass.md › The two layers`).
- **Connectors card collapsed:** a 44×44 tile with a `Plug` icon and a tiny 3-segment meter under it. Expanded: the A1 card. The link to `/settings` works in both states.
- **Touch and pen without hover** (`@media (hover: none)`, the Yoga's touch screen): tapping the brand tile toggles the rail open or closed instead of going Home (Home is the first item). Tapping outside the rail closes it, and tapping an item navigates and closes it. Use `matchMedia('(hover: none)')` and don't break mouse hover on the same device. Windows pen hover does fire pointer hover in Chromium, so it gets the hover path.
- **Under 760px** the current drawer behavior stays as is (no rail).
- Escape collapses an expanded rail.

Motion (D43 motion line, amended):
- Width 76→232 with `transform`/`clip-path`-friendly technique, or `width` on the absolutely positioned panel only (it's out of flow, so no layout cost for main). Open 200ms `cubic-bezier(.2,.8,.2,1)`, close 180ms ease-in.
- Labels and eyebrow text fade in with an 80ms delay (opacity 0→1 over 120ms) so text never squashes during the width change; they fade out at once on close.
- Expanded rail gets the stronger glass shadow so it reads as floating.
- Under `prefers-reduced-motion: reduce` there are no width or opacity transitions; it snaps.

### A3. Smooth transitions elsewhere

- **Brain tree panel** (Ctrl+\, `nav-toggle`, `Sidebar.tsx` `.sidebar-col`): stop using `display:none`. Animate width `0 ↔ var(--sb-w)` (220ms) with the content fading, and set `inert` plus `visibility:hidden` after the close transition. `data-open` keeps its meaning for the tests. On phone width keep the overlay but slide it in (`translateX`, 200ms) like the drawer.
- **Command dialog** (`CommandBox.tsx` / `components/ui/command.tsx`, Radix Dialog): overlay fades (150ms). The panel fades and scales from .98 to 1 and moves 4px down to 0 (160ms) on open, and reverses on close. Use Radix `data-state="open|closed"` with CSS keyframes in `styles.css` (Radix waits for the exit animation).
- **Search trigger** in the top bar: hover and focus brighten the fill and border (120ms). On focus-visible, show the accent ring.
- **Top-bar icon buttons and identity chip:** 120ms background and border transitions.
- **Route change:** keep the current 180ms fade and 4px rise.
- **Terminal dock:** don't animate (xterm fit). Note it in design.md.
- Every transition must be off under `prefers-reduced-motion: reduce`. Hover and press stay at 120ms or less. Layout transitions (rail, brain panel, dialog) are 150–220ms.

### A4. Tests and checks

- Unit tests: `useRailExpand` (opens after 90ms, not before; closes 220ms after leave; re-entering cancels the close; Escape closes; focus keeps it open).
- e2e (`atlas.spec.ts`):
  - The rail is collapsed at rest (its panel bounding width ≤ 80).
  - It expands on `hover()` after the delay (width ≥ 230, label visible) and collapses after `mouse.move` away.
  - Hovering doesn't change the main panel's x position or width.
  - The current item stays highlighted while collapsed (`aria-current`).
  - Keyboard: Tab into the rail expands it.
  - The connectors card has its status on its own line: the `connectors-count` box top is greater than the "Connectors" label box bottom, and the card contains both boxes.
  - The Ctrl+\ panel still toggles `data-open`.
  - The command dialog still opens and closes.
  - Existing `rail-*` tests still pass: clicks must work on collapsed icons.
  - Regenerate the screenshots and add `rail-expanded-dark.png`.
- Run the web unit tests, build and e2e as in `docs/glass-spec.md` §7, using compose project **`-p atlas-test-a`** with `ATLAS_TEST_TAG=a`, so you don't collide with builder B.
- Docs: in design.md, the shell section gets the rail at rest and expanded, and the motion rules get the new durations. Add D45 (hover rail, overlay, intent timings, touch behavior) to decisions.md and round 7 to plan.md.

---

## Slice B — no text caret on non-editable text (builder B)

Files B owns: `frontend/src/ui/tailwind.css` (its `@layer base` section only), a new `e2e/tests/caret.spec.ts`, and if needed `e2e/playwright.config.ts`. B must not touch the files A owns.

Investigation so far (Opus): the app has no `contenteditable`, `user-modify` or editable wrapper, and the search field is a button that opens a dialog. A blinking caret wherever you click on plain text is Chromium/Edge **caret browsing** (toggled with F7; Edge asks once). That is a browser setting, but Ben wants the app not to show it.

Fix: in the base layer, `html { caret-color: transparent; }` and `input, textarea, select, [contenteditable]:not([contenteditable="false"]), .xterm, .xterm * { caret-color: auto; }`. Check that the xterm helper textarea and the cmdk input still show their caret. If xterm draws its own cursor, leave it alone.

Verify, and don't assume:
1. In a Playwright project or test that launches Chromium with `--enable-caret-browsing`, click a paragraph on Home. Read `getComputedStyle(el).caretColor` and take a cropped screenshot before and after the fix. If Chromium's caret-browsing caret ignores `caret-color`, say so and find what does work. Options: `user-select: none` on chrome-only text (nav, eyebrows, buttons) while content text stays selectable; or detecting caret browsing isn't possible, so report back with evidence rather than ship a guess.
2. The cmdk input shows a caret when focused (computed `caretColor` isn't `transparent`).
3. Text stays selectable by drag (copying from the file preview must still work).

Run e2e with **`-p atlas-test-b`** and `ATLAS_TEST_TAG=b`. Run the web unit tests too. Commit only your paths. In your report, tell Ben the likely trigger (F7 / caret browsing in Edge `edge://settings` › Accessibility › "Navigate pages with a text cursor") so he can also just turn it off.

---

## Both

- Docker only. Never touch `.env`, the `chalk` project, or anything outside this repo. Don't push.
- Commit by explicit path (`git add -- <paths>` then `git commit`). Messages end with the session's Co-Authored-By and Claude-Session lines:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_017XxAi8sWE1gqSCdvpNqpYo
  ```
- `git commit` is shared. If a commit fails because the other builder holds the index lock, wait a few seconds and retry. Never `git add -A`, never stash, never reset.
- Report: commits, test counts, deviations, screenshot paths, and anything left unverified.
