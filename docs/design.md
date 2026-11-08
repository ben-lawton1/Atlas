# Atlas design baseline

Atlas's UI follows Apple's Human Interface Guidelines as design principles (the `/apple-design` skill, `~/.claude/skills/apple-design-skill/`). Atlas is a web app used on a Windows laptop with a pointer, touch and a stylus, so the foundations apply (accessibility, color, type, layout, writing) and macOS conventions guide the desktop shell. Decision: D42.

Each rule cites the HIG page it comes from (`file.md › Heading`), or says it is our own call.

## Principles in one line each

- **One container level.** Group with space and a single grouped surface, not a card inside a card inside a card (`layout.md › Visual hierarchy`: "use negative space, container shapes, or separator lines").
- **One color, one meaning** (`color.md › Best practices`). Accent = interactive or selected. Green = gain or done-positive. Red = loss or error. Amber = warning. Category colors are data only.
- **Accent used sparingly**: primary actions, current selection, focus ring (`branding.md › Best practices`: "Minimize its use on controls").
- **Both appearances**, following the OS setting, with no in-app switch (`dark-mode.md › Best practices`: "Avoid offering an app-specific appearance setting"). The terminal dock stays dark in both: it is a content surface with its own palette (`dark-mode.md`: "In rare cases, consider using only a dark appearance").
- **Text scales**: type sizes are in `rem` so the browser's font-size setting enlarges text, and layouts stack instead of clipping (`accessibility.md › Vision`: "enlarge text by at least 200 percent"; `layout.md › Adaptability`).
- **Nothing by color alone** (`accessibility.md › Vision`): today says "Today", gains carry ▲ and a sign, done tasks are struck through and say "(done)" to screen readers.
- **No controls that do nothing** (D38). Read-only items must not look interactive: no accent on read-only checkboxes.

## Tokens (CSS custom properties, `frontend/src/ui/styles.css`)

Contrast is WCAG, computed from the hex values (script in the PR notes). Text needs 4.5:1, non-text marks 3:1.

### Surfaces

| Token | Light | Dark | Role |
|---|---|---|---|
| `--surface-base` | `#eceef1` | `#141518` | window background; rail and sidebar sit on it |
| `--surface-content` | `#ffffff` | `#1c1d21` | the content pane (top bar + main) |
| `--surface-grouped` | `#f3f4f6` | `#25272c` | grouped containers and inputs inside content |
| `--surface-overlay` | `#ffffff` | `#25272c` | menus, command list (with `--shadow-overlay`) |
| `--surface-hover` | `rgba(0,0,0,.05)` | `rgba(255,255,255,.06)` | hover fill |
| `--surface-selected` | `rgba(31,95,196,.12)` | `rgba(120,169,255,.16)` | current row / nav item |
| `--separator` | `rgba(0,0,0,.10)` | `rgba(255,255,255,.10)` | hairlines |
| `--separator-strong` | `rgba(0,0,0,.18)` | `rgba(255,255,255,.18)` | control borders |

### Content and signal colors

| Token | Light | Contrast | Dark | Contrast |
|---|---|---|---|---|
| `--label` | `#1d1f23` | 16.5:1 on content | `#ecedf0` | 14.4:1 on content |
| `--label-secondary` | `#585e69` | 6.5:1 content, 5.6:1 base | `#a4a9b2` | 7.1:1 content, 6.3:1 grouped |
| `--label-tertiary` | `#646a75` | 5.4:1 content, 4.9:1 grouped | `#8f949e` | 5.5:1 content, 4.9:1 grouped |
| `--accent` | `#1f5fc4` | 6.0:1 content, 5.2:1 base | `#78a9ff` | 7.2:1 content, 6.4:1 grouped |
| `--on-accent` | `#ffffff` | 6.0:1 on accent | `#0b1830` | 7.5:1 on accent |
| `--positive` | `#17803f` | 5.0:1 content, 4.6:1 grouped | `#4fc48a` | 7.7:1 content |
| `--negative` | `#c2362b` | 5.5:1 content | `#ff7b70` | 6.7:1 content |
| `--warning` | `#9a5b00` | 5.4:1 content | `#f0b04a` | 8.8:1 content |

`--label-tertiary` is text-safe on every surface; there is no lower-contrast text color. Disabled controls use `--label-tertiary` plus `opacity: .6` and `cursor: default` (disabled text is exempt from the contrast minimum).

### Category colors (data only: calendar tags, allocation)

Non-text marks, always next to a text label. All are ≥ 3:1 on `--surface-grouped`.

| Token | Light | Dark | Calendar tag |
|---|---|---|---|
| `--cat-1` | `#0f7c86` teal | `#4cc9d4` | School |
| `--cat-2` | `#b35900` orange | `#f2a541` | Work |
| `--cat-3` | `#7a4fc9` purple | `#c3a6f0` | Build |
| `--cat-4` | `#b8407a` pink | `#f08cbf` | Health |
| `--cat-5` | `#7a6800` olive | `#d9c45a` | Money |
| `--cat-6` | `#646a75` gray | `#8f949e` | Life, fallback |

### Increased contrast

`@media (prefers-contrast: more)`: separators to `.28` alpha, `--separator-strong` to `.45`, `--label-secondary` to `#3d424a` / `#c9cdd3`, `--label-tertiary` equal to the normal secondary value (`color.md › Best practices`: "an increased contrast option for each variant").

### Type

One family: `--font-ui: system-ui, "Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif` (Segoe UI Variable on Windows, SF on Mac). `--font-mono` only for code, file contents and the terminal. Numbers use `font-variant-numeric: tabular-nums`, not monospace (`typography.md › Conveying hierarchy`: "Minimize the number of typefaces").

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `--text-large-title` | 1.75rem / 2.25rem | 650 | page lead (rare) |
| `--text-title` | 1.375rem / 1.875rem | 500 | the briefing lead on Home |
| `--text-headline` | 1.0625rem / 1.375rem | 600 | section titles |
| `--text-body` | 0.9375rem / 1.375rem | 400 | default |
| `--text-callout` | 0.8125rem / 1.125rem | 400 | rows, meta, controls |
| `--text-caption` | 0.75rem / 1rem | 500 | eyebrows, times, small labels (minimum size) |

Each token is a `font` shorthand value without the family, e.g. `--text-headline: 600 1.0625rem/1.375rem`; use `font: var(--text-headline) var(--font-ui)`. Nothing below 12px (`typography.md › Ensuring legibility`, macOS minimum 10 pt). No weights below 400 (`typography.md`: "avoid light font weights").

### Space, radius, size

- Space: `--space-1..6` = 4, 8, 12, 16, 24, 32px.
- Radius: `--radius-control: 6px`, `--radius-group: 10px`, `--radius-pane: 12px`.
- Controls: 32px tall by default (desktop default 28 pt, `accessibility.md › Mobility`). Under `@media (pointer: coarse)` every control and list row is at least 44px (the Yoga's touch screen; iOS default 44 pt).
- Shadows only on overlays (`--shadow-overlay`); panes use a hairline, not a shadow.
- Motion: hover and press transitions ≤ 120ms; nothing animates on load; all transitions off under `prefers-reduced-motion: reduce`.

## Shell

```
┌ base ──────────────────────────────────────────────────────────────┐
│ rail      sidebar (hideable)   ┌ content pane ─────────────────────┐ │
│ ● Atlas   entities ▸           │ ☰  Home        [⌕ Jump to…  Ctrl K] >_│
│ ⌂ Home    pipelines ▸          ├───────────────────────────────────┤ │
│ ▦ Cal…                         │ main                               │ │
│ ↗ Port…                        │                                    │ │
│ ◉ Brain                        └───────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

Rail and sidebar sit on `--surface-base` with no box of their own (a source list, `sidebars.md`). The content pane is one `--surface-content` rectangle with `--radius-pane` and a hairline; the top bar is its first row with a hairline under it. Current nav item: `--surface-selected` fill, `--label` text, accent icon.

## Home

Thesis: Home answers "what does today hold, and what changed in my brain?" Its signature is **Atlas speaks first**: the briefing sentence Atlas writes is the largest text on the screen, the lead of the page. Everything else is quiet.

Order follows importance (`layout.md › Visual hierarchy`):

```
Regular (main ≥ 900px)                              Compact (< 760px)
┌──────────────────────────────────────────────┐    ┌────────────────────┐
│ Sunday, November 8               (callout 2°) │    │ Sunday, November 8 │
│ Briefing lead in --text-title, ≤ 60ch         │    │ Briefing lead      │
│ Up next                 Suggestions           │    │ Up next …          │
│ 9:00  Standup  Mon·15m  • …                   │    │ Suggestions …      │
│                                               │    │                    │
│ This week  Nov 2 – 8 · 3 of 7 done  Open cal. │    │ This week          │
│ ┌Mon 2┬Tue 3┬Wed 4┬Thu 5┬Fri 6┬Sat 7┬Today 8┐ │    │ ┌Mon 2  ○ task  ──┐│
│ │○ …  │     │     │     │     │     │       │ │    │ │Tue 3  Nothing    ││
│ └─────┴─────┴─────┴─────┴─────┴─────┴───────┘ │    │ └─────────────────┘│
│ Recently changed        │ Portfolio           │    │ Recently changed   │
│ ┌ about.md      2h ago ┐│ ┌ $12,340.00       ┐│    │ Portfolio          │
│ │ entities/personal    ││ │ ▲ $40 · 0.3% today││    └────────────────────┘
│ └──────────────────────┘│ └ chart · alloc    ┘│
└──────────────────────────────────────────────┘
```

- Content width capped at 1200px, centered, 32px side padding (16px compact).
- Not connected (today's reality): the lead reads "No briefing yet." in `--label-secondary`, with one callout line under it. The calendar shows day heads only (no tall empty columns) and one line of copy; the portfolio shows its title and one line. Empty states are a sentence, not a dashed box.
- Loading shows the final layout with static placeholder blocks plus a visually hidden `role="status"` message (`loading.md › Best practices`: "Show something as soon as possible").
- Recent files: file name as the row title, folder as the subtitle, time trailing (`writing.md`: names people recognize; `lists-and-tables.md`: "Keep item text succinct").
- Portfolio value uses `--text-title` weight 600 so the briefing keeps the one big moment. Chart line is `--positive` or `--negative` by the range's direction; gridlines `--separator`.
- Copy is sentence case everywhere (the Windows convention), applied consistently.
