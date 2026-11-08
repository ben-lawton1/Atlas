# Atlas design baseline

Atlas's UI follows Apple's Human Interface Guidelines as design principles (the `/apple-design` skill, `~/.claude/skills/apple-design-skill/`), and since round 6 the look of Ben's "Liquid Glass Dashboard" mockup. Atlas is a web app used on a Windows laptop with a pointer, touch and a stylus. Decisions: D42 (baseline), D43 (glass), D44 (tab frames).

Each rule cites the HIG page it comes from (`file.md › Heading`), or says it is our own call.

## Principles in one line each

- **Glass only on the functional layer** (`liquid-glass.md › Where the material belongs`): nav, top bar and overlays (command dialog, phone drawer) are glass. The main panel is one standard material. Cards are plain translucent fills with no blur. That is three blurred surfaces; all blur lives in `src/components/ui/glass.tsx`.
- **One container level.** Glass behind, main panel, cards on it, rows inside cards. No cards inside rows (`layout.md › Visual hierarchy`).
- **One color, one meaning** (`color.md › Best practices`). Accent = interactive or selected. Green = gain. Red = loss or error. Category colors are data only. Today in a calendar is a white (dark) or ink (light) fill, not accent.
- **Both appearances**, following the OS, no in-app switch (`dark-mode.md`). The terminal dock stays dark in both.
- **Text scales**: sizes in `rem`, layouts reflow instead of clipping (`accessibility.md › Vision`).
- **Nothing by color alone**: today says "Today" to screen readers (`aria-current="date"`), gains carry ▲ or ▼ and a sign, done tasks are struck through and say "(done)".
- **No controls that do nothing** (D38). No bell, theme toggle, Customize, New item, fake badges. Read-only calendar days are not buttons.
- **Reduced transparency and increased contrast** (`accessibility.md`): opaque fills, borders at .28, no blur (see below). Focus rings stay (2px accent).
- **Reduced motion**: `MotionConfig reducedMotion="user"`; CSS transitions are off under `prefers-reduced-motion`.

## Stack

Tailwind v4 through the Vite plugin, **without preflight** (`src/ui/tailwind.css`; layers `base, theme, utilities`, our reset in `styles.css` sits in `@layer base` so utilities win on `a` and `button`). Tokens are CSS custom properties in `src/ui/styles.css`, mapped to Tailwind names in `@theme inline` (`text-label`, `bg-card`, `rounded-card`, ...); never raw hex in classes. shadcn-shaped primitives in `src/components/ui/` (`glass`, `button`, `command`, `calendar`), `@/` alias to `src/`. Icons lucide-react, command box cmdk in a Radix Dialog, mini month react-day-picker, sparkline Recharts (lazy chunk), motion for hover lifts (cards `y: -2`, 150ms) and the route fade (180ms, 4px).

## Backdrop and materials (D43)

Fixed `.atlas-backdrop` behind everything: four radial blobs (teal 10%/15%, violet 90%/10%, rose 78%/95%, green 22%/92%) over a 135deg gradient. Glass needs color behind it.

| Area | Dark | Light |
|---|---|---|
| Base gradient | `#0b1020 → #121029 → #160f1c` | `#eef2f8 → #f1eef8 → #f7eff2` |
| Blobs | `rgba(38,120,150,.55)`, `(96,64,170,.55)`, `(150,70,90,.45)`, `(30,110,90,.45)` | `rgba(80,170,200,.35)`, `(150,120,230,.32)`, `(235,140,160,.28)`, `(90,190,150,.28)` |
| Glass (nav, bar, overlays) | fill `rgba(20,24,40,.62)`, border `rgba(255,255,255,.10)` | fill `rgba(255,255,255,.62)`, border `rgba(255,255,255,.70)` |
| Glass recipe | `blur(28px) saturate(160%)`, shadow `0 20px 50px rgba(0,0,0,.35)` + inset top highlight; radius nav 28, bar 24 | shadow tinted `rgba(30,40,80,.14)` |
| Main panel (standard material) | fill `rgba(18,22,38,.55)`, blur 28, no inset highlight, radius 30, padding 28 (16 compact) | `rgba(255,255,255,.55)` |
| Card (no blur) | fill `rgba(255,255,255,.07)`, border `.12`, shadow `0 10px 26px rgba(0,0,0,.25)`, radius 24 (sections) / 22 (stat tiles), padding 22 / 18 | fill `.55`, border `rgba(255,255,255,.7)`, shadow `rgba(30,40,80,.08)` |
| Row inside a card | `rgba(255,255,255,.07)`, radius 14, padding 10×12 | `rgba(255,255,255,.6)` |
| Reduced transparency / more contrast | glass and main `#151a2b`, cards `#1d2336`, rows `#262d45` | `#f4f6fa`, `#ffffff`, `#eef1f7`; borders `.28`; no `backdrop-filter` |

### Text and signal colors

| Token | Light | Dark |
|---|---|---|
| `--label` | `#141826` | `#eef1f7` |
| `--label-strong` | `#0b0f1c` | `#ffffff` |
| `--label-secondary` | `#3f4656` | `#c4cbd9` |
| `--label-tertiary` | `#545b6b` | `#b2bacb` |
| `--accent` / `--on-accent` | `#1f5fc4` / `#ffffff` | `#8cb8ff` / `#0b1830` |
| `--positive` | `#0f7036` | `#6fdba8` |
| `--negative` | `#ad2a20` | `#ff9d8f` |
| `--warning` | `#7f4a00` | `#f0b04a` |
| today fill / text | `#141826` / `#ffffff` | `#f2f4f8` / `#0b0f1c` |

The mockup's secondary text (`#b3bccd`, `#a3acc0`) and the D42 dark accent (`#78a9ff`) failed 4.5:1 on the brightest blob under card and row fills, so the dark values above are lighter. `frontend/scripts/contrast.mjs` computes every text token against the worst composite (each gradient stop, with each blob at full strength, then main, card, row; nav and bar use glass and the active item). Run: `docker run --rm -v "$PWD/frontend:/web" -w /web node:24.22.1-trixie-slim node scripts/contrast.mjs`. Result (all must be ≥ 4.5:1):

```
theme  token                      value                    ratio  worst surface                
dark   --label                    #eef1f7                  8.15   row in card              ok  
dark   --label-strong             #ffffff                  9.23   row in card              ok  
dark   --label-secondary          #c4cbd9                  5.66   row in card              ok  
dark   --label-tertiary           #b2bacb                  4.74   row in card              ok  
dark   --accent                   #8cb8ff                  4.58   row in card              ok  
dark   --positive                 #6fdba8                  5.44   row in card              ok  
dark   --negative                 #ff9d8f                  4.60   row in card              ok  
dark   --warning                  #f0b04a                  4.84   row in card              ok  
dark   today / selected segment   #0b0f1c on #f2f4f8       17.35  solid fill               ok  
dark   on-accent                  #0b1830 on #8cb8ff       8.77   solid fill               ok  
light  --label                    #141826                  14.54  main panel               ok  
light  --label-strong             #0b0f1c                  15.72  main panel               ok  
light  --label-secondary          #3f4656                  7.78   main panel               ok  
light  --label-tertiary           #545b6b                  5.60   main panel               ok  
light  --accent                   #1f5fc4                  4.95   main panel               ok  
light  --positive                 #0f7036                  5.10   main panel               ok  
light  --negative                 #ad2a20                  5.52   main panel               ok  
light  --warning                  #7f4a00                  6.00   main panel               ok  
light  today / selected segment   #ffffff on #141826       17.67  solid fill               ok  
light  on-accent                  #ffffff on #1f5fc4       6.01   solid fill               ok  
dark   --label                    #eef1f7                  13.79  opaque card              ok  
dark   --label-strong             #ffffff                  15.60  opaque card              ok  
dark   --label-secondary          #c4cbd9                  9.58   opaque card              ok  
dark   --label-tertiary           #b2bacb                  8.01   opaque card              ok  
dark   --accent                   #8cb8ff                  7.74   opaque card              ok  
dark   --positive                 #6fdba8                  9.19   opaque card              ok  
dark   --negative                 #ff9d8f                  7.78   opaque card              ok  
dark   --warning                  #f0b04a                  8.18   opaque card              ok  
light  --label                    #141826                  16.33  opaque panel             ok  
light  --label-strong             #0b0f1c                  17.66  opaque panel             ok  
light  --label-secondary          #3f4656                  8.74   opaque panel             ok  
light  --label-tertiary           #545b6b                  6.29   opaque panel             ok  
light  --accent                   #1f5fc4                  5.56   opaque panel             ok  
light  --positive                 #0f7036                  5.72   opaque panel             ok  
light  --negative                 #ad2a20                  6.20   opaque panel             ok  
light  --warning                  #7f4a00                  6.73   opaque panel             ok  

All text pairs >= 4.5:1
```

`--label-tertiary` is text-safe on every surface; there is no lower-contrast text color. Disabled controls use `--label-tertiary` plus `opacity: .6` (exempt from the minimum).

### Category colors (data only: calendar tags, allocation, symbol tile underline)

Non-text marks beside a text label. `--cat-1..6` are unchanged from D42 (teal, orange, purple, pink, olive, gray; light and dark variants in `styles.css`).

### Type

One family: `--font-ui` system stack (no network fonts). Numbers use `tabular-nums`. Nothing below 12px, no weights below 400.

| Use | Size / line | Weight |
|---|---|---|
| h1 (view title) | 2rem / 2.5rem, tracking -0.02em (1.625rem on phone) | 700 |
| Stat value | 1.75rem | 700 |
| Portfolio total | 1.875rem | 700 |
| Card title | 1rem | 700 |
| Body | 0.875rem | 400 |
| Meta, rows | 0.8125rem | 400 to 600 |
| Caption | 0.75rem | 500 to 600 |
| Eyebrow | 0.75rem, uppercase, .08em | 600 |

### Controls, space and motion

- Every control and list row is at least 44px tall (pills 44, icon buttons 44 circles, nav items 44 radius 14). The portfolio segmented control is 28px visually, 44px hit area on `pointer: coarse`.
- Active nav item: fill (`rgba(255,255,255,.12)` dark, `.7` light), hairline border, accent icon. Active segment: today fill with its text color.
- Space scale 4, 8, 12, 16, 24, 32. Page padding 20 (12 under 760px), gap 20, max width 1480 centered, nav rail 76px at rest (`--rail-w`), 232px expanded (`--nav-w`, D45).
- Shadows: glass and cards as in the table; overlays also carry `--shadow-overlay`.
- Motion: card hover lift, route fade (180ms, 4px rise), hover and press transitions ≤ 120ms. Layout transitions are 150-220ms: rail width 200ms open (`cubic-bezier(.2,.8,.2,1)`) and 180ms ease-in close, with labels fading in over 120ms after an 80ms delay and out at once; brain panel width 220ms with the content fading and `inert` plus `visibility:hidden` once closed (phone: 200ms slide); command dialog overlay 150ms, panel 160ms fade, scale .98 to 1 and 4px settle (Radix `data-state` keyframes). Search field and top-bar buttons ease fill and border in 120ms, with the accent ring on focus-visible. The terminal dock does not animate (xterm fit). Every transition and animation is off under `prefers-reduced-motion: reduce`.

## Shell

```
┌ backdrop (fixed blobs) ───────────────────────────────────────────────┐
│ ┌ nav (glass) ┐ ┌ top bar (glass) ─────────────────────────────────┐ │
│ │ [◎] Atlas   │ │ ▢  [⌕ Search brain, views…     Ctrl K]  >_  (BL) │ │
│ │ TODAY       │ └──────────────────────────────────────────────────┘ │
│ │ Home Calendar│ ┌ main (material) ────────────────────────────────┐ │
│ │ Tasks Notes │ │ brain tree │ view content (scrolls)              │ │
│ │ Portfolio   │ │ (280px)    │                                     │ │
│ │ WORKSPACE   │ ├────────────┴─────────────────────────────────────┤ │
│ │ Projects …  │ │ terminal dock (dark, inside the main panel)      │ │
│ │ [Connectors]│ └──────────────────────────────────────────────────┘ │
│ └─────────────┘                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

Under 760px the nav is a drawer (menu button in the top bar, scrim, Escape closes) and the brain tree is an overlay inside the main panel. The top bar has the sidebar toggle (Ctrl+\), the search field (opens the command dialog, Ctrl+K), the terminal button and the identity chip (initials `BL` on a darkened `#2f7399 → #6a49c4` gradient so white text passes, "Ben Lawton", brain label). On desktop the nav is a 76px glass rail at rest (D45): brand tile, each item as a 44px icon target, the current item highlighted, a hairline in place of each group eyebrow, and the connectors card as a 44px plug tile with a 3-segment meter. It floats open to 232px over the content (the layout always reserves 76px, so nothing reflows) after 90ms of hover or on keyboard focus, and closes 220ms after the pointer leaves; Escape collapses it. On touch without hover, tapping the brand tile toggles it, a tap outside or on an item closes it. Expanded, the connectors card stacks "Connectors" over "n of 3 connected" (both from the three feeds), then the meter, and links to Settings.

## Home

Order: header, stat tiles, three cards.

- Header: `h1` "Good morning/afternoon/evening, Ben" (local hour), then the date and the briefing sentence ("No briefing yet." when not connected). Connected briefings add compact Up next and Suggestions rows.
- Stat tiles: Events today, Tasks due today (always "—", tasks aren't connected), Brain changes this week (real, from recent files), Portfolio today (▲/▼ and sign). "—" appears only in tiles.
- Cards: Calendar (read-only mini month, Monday first, event dots, Today list, month arrows refetch the 42-day grid), Recently changed (folder tag, file name, relative time), Portfolio (range segments 1D 1W 1M 1Y, total, change, sparkline, holdings rows). Empty states are one sentence.
- Loading shows the final layout with static placeholders plus a visually hidden `role="status"` message.

## Tab frames (D44)

Calendar (week view plus an Upcoming card), Tasks, Notes, Portfolio, Projects, Messages, People, Brain, Settings. Each has an `h1` with `data-testid="view-title"` and a `data-testid="<route>-view"` wrapper. Empty frames are cards with a title, a "what goes here" line and one sentence naming the missing source; no buttons. Settings is read-only: connector status, appearance ("Follows your system setting."), terminal bridge address.
