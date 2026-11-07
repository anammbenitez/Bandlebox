# Design system — BandleBox

A local-first card catalog and deck builder. The interface is an **Operate**
surface inside the Bandlewood: a desk at dusk, a warm lamp, cards fanned out,
a branch along the header, and each panel held in a warm bark frame. Card art carries the
colour; the interface stays quiet; the deck's state is always legible at a
glance.

The world is Bandle City's woodland — bark-brown shadow, lantern gold, living
green — with a painted branch on the header and a simple bark frame around the
working panels. Inside the frame the interface stays a plain tool:
it never sits between the reader and a card's text.

## Palette

Defined once in `src/styles/global.css` (`@theme`). Tailwind's `slate` scale is
retuned to bark ink and `amber` to lantern light, so every `slate-*` /
`amber-*` class in the codebase lands in this world. Components reference the
token, never a raw hex.

| Token | Value | Use |
| --- | --- | --- |
| `slate-950` | `#0c0906` | page ink, tiles, frame foot |
| `slate-900` | `#15100b` | panels, tiles |
| `slate-800` | `#241b12` | hairlines, dividers |
| `slate-700` | `#3b2d1d` | control borders, scrollbar thumb |
| `slate-500` | `#9a8c76` | secondary meta |
| `slate-400` | `#b6a98f` | supporting text |
| `slate-100` | `#f6efe0` | primary text |
| `amber-400` | `#e9c479` | focus, current selection, primary action |
| `amber-300` | `#f7e0ad` | links, active labels, lantern light |
| `emerald-*` | — | legal / pass |
| `red-*` | — | illegal / fail / destructive |
| `bark-*` | `#22150a` → `#9a6d3d` | the nav rail, the brand, the ink under a button |
| `leaf-*` | `#33502a` → `#b3d394` | foliage, section rules, empty-state edges |
| `bloom` | `#a9cbe8` | the sprig blossom's blue — the only cool colour |

The six Riftbound domains keep their fixed hues (`deck-builder.ts`
`DOMAIN_COLORS`). They appear only as data: a dot in the domain chip and beside
the rune-ratio count. Keyword labels (`src/lib/keyword-styles.ts`) follow the
same rule. Game symbols render as their own artwork. Nothing decorative borrows
a domain or keyword hue, and nothing decorative uses `bloom` except a blossom
inside a sprig.

Where colour does work: green is *place* (foliage, the frame, safe edges), gold
is *light and action* (focus, selection, the primary button, the lit section).
The two never swap roles.

## Type

- **Display**: Bricolage Grotesque, self-hosted
  (`public/fonts/bricolage-grotesque-latin.woff2`, variable 300–800, latin
  subset). Page titles, the deck title, panel and section names, the brand. Its
  slightly odd counters and blunt terminals give the storybook voice without a
  serif's cost on a working screen.
- **Text**: the platform sans (`Segoe UI Variable Text`, `Segoe UI`, system
  fallbacks). Every control, label, count, and body line. UI text stays crisp
  and familiar; the world never makes a form harder to read.
- Scale, ratio ~1.2: page title 28/600 display, deck title 24/600 display,
  section 15/600 display, body 14/400, meta 12/400, micro-label 10–11/600 with
  0.06–0.08em tracking and uppercase.
- Counts, deck totals, dates and prices use `.tnum`.
- Headings balance; body copy wraps pretty; prose is capped at 65–72ch.

## Frames, header branch, background

**Panel frame.** The deck sheet and card browser sit in `.frame` (`Frame.astro`):
a 3px bark rail (`#4f3720`), a thin lantern hairline just inside it, and a warm
dark fill (`lit` for the sheet, `quiet` for the browser). It is a plain box —
no images, no positioned pieces — so it resizes and reflows like any block and
needs no per-breakpoint geometry. Padding is `--frame-pad` (0.875rem, 0.625rem on
phones). Do not add painted pieces, corners or per-panel ornaments to it: a
fuller painted frame (eight positioned pieces) was tried and retired as too
complex to keep correct across sizes.

**Header branch.** The one painted detail is the site header's underside: a
repeating branch strip (`.site-header::after`, `edge_bottom_loop.png`, built
and straightened by `scripts/build-wood-loops.mjs` from the ChatGPT pack) with
two flowering twigs resting on it (`.header-sprig--a/--b`, from
`sprig_horizontal_upper/lower.png`) and the hanging vine on non-wide pages. The
twigs are placed so their own branch sits on the strip's line, away from the nav
links; the first is hidden below 48rem.

**Background.** The page behind the header is a layered dusk gradient on `body`:
a violet glow top-left, a teal glow top-right and a lantern-amber horizon over an
indigo-to-bark fade that reaches plain bark ink by ~560px. Atmosphere only; never
repeated inside panels.

## Layout

- Page column `max-w-6xl`; the deck manager opts out (`wide`), running edge to
  edge with its own 0.5rem head.
- Page header: `.page-head` (title, lede, meta) closed by a hairline that fades
  at both ends — a laid twig, not a ruled border.
- The deck manager is a viewport shell at every width: the site nav, the deck
  bar, the working area and the colophon fill exactly one screen, so the page
  itself never scrolls. `main` is the flex column between nav and footer and
  `#deck-app` takes the remaining height.
- At `lg`: two equal columns — the card browser and the deck viewer — with a
  small gap between their frames. Both columns are branch-framed; each frame
  fills the working height and its content scrolls inside it (filters pin inside the browser, the ledger pins inside the
  sheet). No grip or drag resizes either column.
- Below `lg` the Deck / Back to cards buttons swap the browser and the deck as
  panes, so the deck is never buried behind an endless list. Each pane fills the
  same working height and scrolls inside its own frame; hiding one pane keeps
  the browser's scroll offset.
- The viewer is one deck sheet: a `.sheet-ledger` of five sections pins to the
  top of the frame, the sections follow as hairline-divided rows, and legality
  closes the sheet.
- Spacing scale: 2 / 4 / 6 / 8 / 10 / 12 / 16 px rhythm. Tight inside groups,
  generous between them.

## Components

All in `src/styles/global.css` under `@layer components`.

- **Frame** — `.frame`, `.frame--lit`, `.frame--quiet`, `.frame-body`, `.bd-frame`,
  `.deck-frame` (see above). Used on the two working columns only, not on cards or
  dialogs.
- **Buttons** — `.btn` with `data-variant="primary|ghost|danger"` and
  `data-size="sm"`. 7px radius, bark-toned ink border, and a primary that is a
  struck-gold plate with an inner top light rather than a flat accent.
- **Fields** — `.field` for input and select; drawn chevron, gold border and
  soft ring on focus, amber caret.
- **Pills / chips** — `.pill` with `aria-pressed` carrying the selected state;
  `.dot` inside a pill is the domain colour.
- **Panels / sections** — `.panel` + `.panel-head`; section names in the
  display face.
- **Deck sheet** — `.sheet` frames the viewer. `.sheet-ledger` holds five
  `.ledger-cell` columns; the focused one is a lit run of sap (warm wash, gold
  underline, gold label) and stays pinned while the sheet scrolls under it.
- **Card tiles** — `.card-tile` (catalog) and `.face` (art-only browser and deck
  rows) with `.face-bar` stepper controls and `.count-chip` copy counts.
- **Card peek** — `.card-peek`, one `role="tooltip"` element (`#card-peek`) that
  `src/scripts/card-peek.ts` fills and places beside a card face once the pointer
  has rested on it. Read-only: no backdrop, no focus capture, `pointer-events:
  none`, so a click or drag always reaches the card. A `.dialog`-toned surface
  (slate over bark, bark hairline), the display face for the name, the micro-label
  voice for the type line and stat names, the existing `.kw` / glyph rules for
  card text. Domain dots are data (`--dot` from `DOMAIN_COLORS`); the "in this
  deck" lines use the legality language — emerald dot for fits, red for a rule
  problem, quiet slate for information. It appears only when the user is still
  (no click, drag, scroll or key; see the `card-peek` spec) and never over the
  face it describes.
- **Legality** — `.verdict` (`data-legal`) and `.check-item[data-status]` with
  drawn check / cross / pending icons.
- **Empty states** — `.empty-state` is a leaf-green dashed tray and always names
  the recovery action.

## States

Every control has default, hover, focus-visible, active, disabled and, where
relevant, error. Focus is one language: 2px gold outline, 2px offset. Hover
motion is 140–180ms; the only entrance/emphasis motion is a 3px tile lift and a
gold rim, plus the card peek's 140ms fade with the same 3px lift.
`prefers-reduced-motion` collapses all of it.

Browser surfaces are themed: selection is a gold wash, scrollbars are thin
ink-on-ink, carets are gold, numerals are tabular, and the skip link is the
first focus stop.

## Copy

Controls name their action ("Copy deck link", "Keep", "Clear filters"). Empty
and error states name the problem and the recovery, not just the absence of
content.
