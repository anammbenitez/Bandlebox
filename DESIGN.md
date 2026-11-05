# Design system — Riftbound Deck Manager

A local-first card catalog and deck builder. The interface is an **Operate**
surface inside the Bandlewood: a desk at dusk, a warm lamp, cards fanned out,
and the forest growing in around the edges of the frame. Card art carries the
colour; the interface stays quiet; the deck's state is always legible at a
glance.

The world is Bandle City's woodland — deep green-black shadow, lantern gold,
living green, bark — rendered in vector rather than as a painted game skin, so
it stays sharp, recolours with the theme, and never sits between the reader and
a card's text.

## Palette

Defined once in `src/styles/global.css` (`@theme`). Tailwind's `slate` scale is
retuned to forest ink and `amber` to lantern light, so every `slate-*` /
`amber-*` class in the codebase lands in this world. Components reference the
token, never a raw hex.

| Token | Value | Use |
| --- | --- | --- |
| `slate-950` | `#080b07` | page ink, sticky bars, frame interior |
| `slate-900` | `#0d120c` | panels, fields, tiles |
| `slate-800` | `#1a231b` | hairlines, dividers |
| `slate-700` | `#2b3a2c` | control borders, scrollbar thumb |
| `slate-500` | `#8a9a84` | secondary meta (6.6:1 on ink) |
| `slate-400` | `#a7b5a0` | supporting text |
| `slate-100` | `#eff3e8` | primary text |
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

## The bough — how the corners are made

The frame around the deck sheet and the card browser is painted wood at the four
corners only. The pack ships as one 1536 × 1024 painting; each corner keeps its
crop and the canvas-relative place the painter gave it, measured as a fraction
of the panel's own width. Each elbow's two arms are continued by a thin straight
billet — a cut stem, not a rail — which dissolves toward the middle of its edge
well before the midpoint. No edge is ever framed, tiled, or closed.

### What was considered

1. **Eight inline SVG slices** (the first frame). Sharp at any DPR, themed by
   custom properties, leaves never stretched. But beside the illustrated card
   faces it read as line art, and it could not carry painted foliage. Replaced.
2. **`border-image` over the whole frame.** One file, but a 3:2 painting on a
   520px portrait sheet ovals every leaf and flower. Rejected.
3. **A full painted perimeter** (the pass before this one). It proved the pack,
   but at working size it read as a heavy picture frame, competed with the
   cards, and took about a fifth of each column's width. Retired.
4. **Corner-only with a trail** — chosen. The elbow is the strongest mark in the
   pack; a thin straight billet carries each arm a little further along the
   edge, then dissolves toward the middle. The frame becomes a detail at the
   edge of the work instead of a border around it.
5. **Canvas / WebGL growth.** A growth animation is tempting and wrong here: it
   costs a repaint stream on a screen whose job is reading cards, and it cannot
   be read by assistive technology. Rejected.

### The rules that make it read as a bough, not a brown rectangle

- **The corner is the whole frame.** Only four corners are painted. There is no
  top or bottom bar, no side vine, no tiled rail, no loose-sprig variation, and
  no full machined outline.
- **Fade, don't cut.** A radial mask anchored at each outer corner keeps the
  elbow opaque and dissolves both arms to transparent before the middle of the
  edge. No hard cut end and no join.
- **A billet, not a border.** Where an arm dies out, a thin straight stem takes
  over on the same line and fades toward the middle of the edge. It is thinner
  than the painted arm, starts under it so the join is hidden, and is gone well
  before the midpoint. Two billets on one edge never meet.
- **No tiling or stretching.** If an edge needs weight, the corner and its
  billet are the frame; no painted edge is repeated or stretched to fill a
  panel.
- **Registration over reconstruction.** Each corner keeps its canvas crop and
  its canvas-relative place (`corner_top_left` at 0,27; `corner_top_right` at
  1216,36). The crop is not re-cut to "fit"; the mask does the fitting.
- **Corners hold the scale.** A corner is about 17.8% of the frame's width; the
  wider bottom crops (23.9%) carry longer arms. The mask radius is in `cqw`, not
  a fraction of the crop, so the visible arm is the same fraction of the panel
  at every size and the wider crops do not grow a longer detail. The bottom
  masks fade sooner so the four corners read as one size of sprig.
- **Undistorted paint.** Nothing is stretched, rotated, mirrored, or recoloured.
  One light source, above and to the left, in all four corners; the billets are
  lit on top (horizontal runs) or on the left (vertical runs) to match.
- **Content stays clear.** The body inset is 10.6% of the frame's width. The
  corner pieces paint above the content, so the inset is the guarantee: by the
  time an arm reaches the content box it is effectively transparent. Keep the
  inset when tuning the masks.
- **Tone is a grade, not a redraw.** `lit` lifts the deck sheet, `quiet` steps
  the browser back, `bark` is the default.
- **Botany, not garnish.** Every piece is a cut stem: a tapering branch with
  bark grain, leaves with a midrib and side veins, and a five-petal blossom at
  the fork. The frame is assembled from those, never from a symmetric ornament.
- **The bare edge is the point.** At 2560 the panel's own background grade and
  soft outer shadow hold the edge; no fallback hairline is added.

### Retired in this pass

- Straight runs joined between the elbows (each billet ends before the midpoint
  and never joins another).
- Tiled side vines and the tiled rail.
- The earlier loose-sprig variation (no per-frame arrangement).
- The below-`lg` edge fallback.
- The inner machined line and the full 1px edge.

These are replaced by the corner-only rules above. Do not reintroduce them to
"finish" an edge.

### How it is wired

- `src/assets/wood/` — the four corners plus the nav's hanging sprig. The edge
  runs and unused sprigs are gone; `frame_full` was never shipped.
  `astro:assets` converts the five live pieces to WebP at build.
- `src/components/Bough.astro` — four corner spans painted through
  `background-image` and `getImage`, plus eight `use` references to the vector
  billet. Props: `tone="bark|lit|quiet"` and `class`; there are no geometry
  props.
- Geometry is in `cqw` against the frame's own width, because the component is
  the query container. Each corner carries a `--corner-fade` radial mask
  (a 12.76`cqw` circle at the top elbows, 11`cqw` at the bottom) anchored at
  its outer corner. The mask is sized in `cqw` too, so the visible arm stays
  proportional.
- `.bough-run` is the billet: `#bough-run-h` / `#bough-run-v` in
  `BoughSprite.astro`, placed on the line its arm leaves the crop on, masked
  with a linear gradient that runs toward the middle of the edge. The four
  corner crops are scaled to ~88% of the pack's canvas width so the painted
  branch stays thin beside the stem.
- `.bough-rail` is still the open-ended vector silhouette on the nav's edge;
  `.bough-hang` carries the painted hanging sprig. The nav and footer are page
  chrome, not container borders, and are not corner-only.
- Deck sheet and browser: the frame holds still and the content scrolls inside
  it; the foot fade says so. There is no bottom branch to close the page; the
  lower corners do that.
- The body inset stays 10.6cqw. The corners no longer take a side rail, but
  their vertical arms still occupy the top and bottom corners. The one exception
  is a window shorter than 32rem: the width-based inset would then be taller
  than the working area, so the deck editor drops the painted corners and uses
  a compact inset (see Layout).

## Layout

- Page column `max-w-6xl`; the deck manager opts out (`wide`), running edge to
  edge with its own 0.5rem head.
- Page header: `.page-head` (title, lede, meta) closed by a hairline that fades
  at both ends — a laid twig, not a ruled border.
- The deck manager is a viewport shell at every width: the site nav, the deck
  bar, the working area and the colophon fill exactly one screen, so the page
  itself never scrolls. `main` is the flex column between nav and footer and
  `#deck-app` takes the remaining height.
- At `lg`: browser column, 12px resize grip, viewer column
  (`--deck-viewer-w`, default 520px). Both columns are corner-framed; each frame
  fills the working height and its content scrolls inside it (filters pin inside
  the browser, the ledger pins inside the sheet).
- Below `lg` the Deck / Back to cards buttons swap the browser and the deck as
  panes, so the deck is never buried behind an endless list. Each pane fills the
  same working height and scrolls inside its own frame; hiding one pane keeps
  the browser's scroll offset.
- Below 32rem of height the width-based frame inset cannot fit a usable pane, so
  the deck editor hides the painted corners and tightens the inset rather than
  leaving the pane invisible.
- The viewer is one deck sheet: a `.sheet-ledger` of five sections pins to the
  top of the frame, the sections follow as hairline-divided rows, and legality
  closes the sheet.
- Spacing scale: 2 / 4 / 6 / 8 / 10 / 12 / 16 px rhythm. Tight inside groups,
  generous between them.

## Components

All in `src/styles/global.css` under `@layer components`.

- **Bough** — `.bough`, `.bough--lit`, `.bough--quiet`, `.bough-cutting`,
  `.deck-frame`, `.bough-rail`, `.bough-hang` (see above). Painted frames appear
  on the two working columns; the nav keeps a dissolving vector rail and gains
  the painted hanging vine. They are not scattered over panels, cards or
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
- **Legality** — `.verdict` (`data-legal`) and `.check-item[data-status]` with
  drawn check / cross / pending icons.
- **Empty states** — `.empty-state` is a leaf-green dashed tray and always names
  the recovery action.

## States

Every control has default, hover, focus-visible, active, disabled and, where
relevant, error. Focus is one language: 2px gold outline, 2px offset. Hover
motion is 140–180ms; the only entrance/emphasis motion is a 3px tile lift and a
gold rim. `prefers-reduced-motion` collapses all of it.

Browser surfaces are themed: selection is a gold wash, scrollbars are thin
ink-on-ink, carets are gold, numerals are tabular, and the skip link is the
first focus stop.

## Copy

Controls name their action ("Copy deck link", "Keep", "Clear filters"). Empty
and error states name the problem and the recovery, not just the absence of
content.
