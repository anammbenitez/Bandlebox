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
`DOMAIN_COLORS`). They appear only as data: a dot beside the rune-ratio count
(the domain filter chips wear OpenRift's emblems instead, which carry their own
colors). Keyword labels (`src/lib/keyword-styles.ts`) follow the
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
repeating branch strip (`.site-header::after`, `edge_bottom_loop.webp`, built
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
  fills the working height and its content scrolls inside it (the browser's bar pins inside it, the ledger pins inside the
  sheet). The bar is two rows, the section pills and the search with its Filters
  button (the other filters are in the dropdown, see Components); it is the frame's own fill, not a darker plate, and
  cards slide under its foot through a short fade that comes in only once the column
  has scrolled (`.browser-chrome`, mirroring the frame's foot fade). No grip or drag
  resizes either column.
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
- **Buttons** — one `.btn`, five roles by `data-variant`, set by what the
  control does and not by how loud it should be. **primary** is the struck-gold
  plate (the one thing a screen is for); the **default** is a deep-walnut plate
  with a 10px corner, lighter than the panel it sits on, with a 3:1 edge, a lit top
  lip, one soft pool of lamp light from above (a radial wash, not a top-to-bottom
  bevel) and a soft layered drop, never a hard 1px line (everything else you can
  press); **ghost** is bare text until hovered (a quiet way
  out or back); **link** is navigation, lantern-amber text with an arrow that leans
  forward on hover, no plate; **danger** is a red-tinted plate. `data-size="sm"`
  is 32px, the default 38px (level with `.field`), and both grow on a coarse
  pointer. States are drawn for every role: hover (brighter fill, gold edge),
  pressed down (sinks a pixel, loses its drop), focus (the one global gold
  outline), and disabled (one flat, unlit plate for every role, so it never reads
  as a quiet default). A toggle (`aria-pressed="true"`) is lit sap: amber wash,
  gold edge, amber label, so its state is seen. Fill, edge and ink are tokens
  (`--btn-fill`, `--btn-edge`, `--btn-ink`), never raw colors, and the fill is a
  flat color so it animates while the plate's light is a fixed overlay. Labels
  are 600 weight, and at least 8:1 against their fill in every role.
- **Fields** — `.field` for input and select; drawn chevron, gold border and
  soft ring on focus, amber caret.
- **Deck title** — on the deck manager the title is a field that looks like a
  title: `.deck-name-input` inside the `<h1>`, same 24/600 display face, no box at
  rest, but a generous click zone (about 46px high, at least 12rem wide and
  reaching 3.5rem past the end of the name, its left edge on the panels' edge and
  the name inset to line up with the panel content;
  the meta line takes the same inset, and the bar keeps its height). Hover gives a 7% wash, a text cursor and `title="Rename deck"`; editing
  gives the one gold focus ring, selects the whole name, and the meta line reads
  "Enter to save · Esc to cancel". Enter or leaving the field saves (Escape
  cancels; blank or unchanged keeps the old name); a save shows "Saved ✓" in the
  meta line for 1.6s, then the counts return. The **Rename** button stays and only
  moves focus into the field. These cues live in the existing meta line, so the
  bar never grows. A shared deck shows the plain `.deck-name-text` and no Rename.
- **Pills / chips** — `.pill` with `aria-pressed` carrying the selected state. A pill
  is the default button's plate cut to a chip (same walnut fill and lamp-lit top,
  quieter at rest); when on it is lit sap, exactly as a pressed toggle button is, with
  no glow halo. **Domain chips** are the domain's emblem alone (`.pill-emblem`, 22px,
  `data-emblem` on the pill, the alt text and `title` naming it): both states keep the
  emblem's own colour, so a player who does not know the emblems by shape yet can
  still tell the domains apart by hue; opacity alone says on or off. Selected is fully
  opaque and a touch more vivid (saturation 1.2), not selected is dimmed hard (40%),
  and hovering a not-selected chip previews it coming on (75%). The row is read at a
  glance and not only by the plate. The dark emblems are brightness-lifted
  (`--emblem-lift`, 1.3; Chaos 1.7) so a selected emblem holds 3:1 or better against
  the on and hover plates; a not-selected one stays readable but quiet (about 1.7:1
  at the lowest, Mind, up to 3:1 for Order). A domain with no emblem cached prints its
  name as a plain text pill. Colorless is not
  a filter: it has no chip, and a Colorless card is never hidden by a chip set (as a
  Neutral card is not).
- **Filter dropdown** — the deck browser keeps in its bar only what every visit uses
  (the section pills and the search); Domains, Type, Rarity and Set live in one
  dropdown under a **Filters** button beside the search (`#bd-filters`, `.filter-pop`).
  The panel is a native popover: top layer, so no frame or scroller clips it; a click
  outside or Escape closes it and focus goes back to the button; it does not close
  when a filter is changed, so several can be set in one visit. It opens under the
  button with its right edge on the button's (placed by `deck-builder.ts`, kept inside
  the window, and held at the window's top edge if the unpinned bar scrolls away
  below `lg`), 22rem wide or the window less 1rem, on the dialog surface (slate over
  bark, bark hairline) and fading in over 140ms (not at all under reduced motion).
  Inside, top to bottom: **Domains** (the emblem chips, so Legend colors are one tap
  away), **Type | Rarity** side by side, **Set** full width, each select under its
  micro-label; then, under one hairline, the card count (it repeats the line the
  panel covers, so it reads while filtering) and **Reset** (small). The button says
  how many filters are set with an amber count badge (`.filter-badge`: type when it is
  not just the section's own preset, rarity, set, and the domains as one; none shows
  no badge), and the count line under the bar shows the emblems of the domains the
  filter is set to (`.active-domains`, hidden on Battlefields and Legend, where
  domains do not filter), so the Legend's colors stay in view with the dropdown
  closed. A chip changes `aria-pressed` in place and is never re-rendered, so the
  keyboard focus on it survives.
- **Panels / sections** — `.panel` + `.panel-head`; section names in the
  display face.
- **Deck sheet** — `.sheet` frames the viewer. `.sheet-ledger` holds five
  `.ledger-cell` columns; the focused one is a lit run of sap (warm wash, gold
  underline, gold label) and stays pinned while the sheet scrolls under it.
- **Card tiles** — `.card-tile` (catalog) and `.face` (art-only browser and deck
  rows) with `.face-bar` stepper controls and `.count-chip` copy counts.
- **One card look** — a card is its art and nothing else: no border, no plate, no
  inner ring and no shadow of its own, because the printed card already has its
  frame, and the same on the catalog grid, a deck tile, the card page, the Legend
  picker and every face in the deck manager. Only three things are shared and may
  touch it (tokens in `global.css`): `--card-ring`, a gold ring outside the edge for
  hover and selection (selection is the same ring at full strength); `--card-halo`,
  a dark text edge that keeps a bare word readable over any art, used for the
  Legend and Champion copy count (`.card-badge`), so it needs no plate; and
  `--card-foot-fade`, a
  dark fade rising from a card's foot behind its - count + row (`.face-bar`) and a
  picker card's name. The only plates left on a card are the deck tile's pills, one
  shape for both: the Legal / Not legal verdict (`.deck-badge`, top-right) and the
  Rename / Delete / Keep actions (`.tile-action`, top-left, on hover; the delete
  confirmation is the red-tinted pill). Whatever else a tile has is text beneath the art
  (name, rarity and type, set code, counts). The New-deck tile is the one thing
  that keeps an edge (dashed), since it is a place for a card, not a card.
- **Card corner** — OpenRift's card images are cut to the printed card, so the art
  carries transparent rounded corners of 4.76% of the card's width (a 3mm corner
  on a 63mm card, measured on the 744px image). Whatever holds card art clips to
  that same curve, or its own corner shows as a dark wedge behind the art's. A
  rem radius only fits one size, so the radius is a percentage of the container,
  which is always the card's shape: `--card-corner` (`4.76% / 3.4%`, portrait) and
  `--card-corner-landscape` (the pair swapped, for a battlefield shown lying down)
  in `global.css`. `.card-tile-art`, `.face`, `.legend-pick` and `.dt-face` use it
  already; anything else that holds card art takes `.card-corner`, plus
  `data-landscape` when the card lies on its side. Never `rounded-*` or a rem
  radius on card art.
- **Card tilt** — the card art on the catalog grid (`.card-tile-art`), a deck tile
  (`.dt-face`) and the card page's own art leans away from the mouse like an upright
  card pressed with a fingertip: the edge nearest the pointer goes back, the far
  edge comes forward, and the card sinks a little. It is marked in the markup with
  `data-tilt` (the stage, which never moves, so the card cannot flicker as it leans
  away from the pointer) around `data-tilt-face` (the art that does). The script
  (`src/scripts/card-tilt.ts`) only publishes the pointer's place as unitless
  `--tilt-x` / `--tilt-y` / `--tilt-p`, smoothed per frame (≈90ms follow, ≈150ms
  release, frame-rate independent); the angle, depth and perspective are tokens
  in `global.css` under "card tilt" (9° / −9px / 720px on a tile, 6° / −14px /
  1300px on the card page's large art, `data-tilt="large"`). The transform exists
  only while a card is moving. The deck manager's own faces, the printing
  thumbnails and the New-deck tile do not tilt.
- **Card peek** — `.card-peek`, one `role="group"` element (`#card-peek`) that
  `src/scripts/card-peek.ts` fills and places beside a card face once the pointer
  has rested on it. Non-modal: no backdrop, no focus capture. It is click-through
  only while closed; once open it takes the pointer, so the pointer can cross onto
  it (an invisible bridge, `::before`, covers the gap to the face, and a 250ms
  grace covers the rest) and it stays while the pointer is on it. It ends with a
  **link**-role `.btn` "See more" that opens the card's page, which links back to the
  deck ("Back to deck"). A `.dialog`-toned surface
  (slate over bark, bark hairline), 24rem wide. It is read at a glance with the
  other hand on the deck, so nothing in it is a micro-label: the name is the
  display face at 18px, the type line is 14px sentence case,
  the cost row sets each symbol at 22px with its word after it (14px), and the
  description is 15px on a 1.5 line, under the one hairline. **One layout for
  every card**, so it is learned by position: name (domain emblems in the
  top-right corner of the same line) / type line (ban marker at its right) /
  Energy, Power, Might in three fixed columns
  / description. All of it is always drawn: a figure the card lacks keeps its
  label and shows a muted dash, so a Legend, a battlefield, a rune and a unit
  put every line in the same place and only the description (last) can be
  absent. The width is set so the longest card name and its corner emblems still hold one line. A domain is its
  emblem alone (28px, OpenRift's own artwork, which carries its own colors),
  named by its alt text; no hue of the interface stands for a domain here (the filter chips
  use the same emblems), so the rune counters' dots are the only domain dots left in the
  deck manager. The description is the printed text only; keywords show as the
  `.kw` labels the text prints, never as a row of their own. A banned card
  carries a small red-outlined "Banned in Constructed" marker beside its type
  line; nothing else about the deck (colors vs the Legend, copies held, limits)
  is repeated in it. It appears only when the user is still (no click, drag,
  scroll or key; see the `card-peek` spec) and never over the face it describes;
  it fades and lifts 3px over 140ms, and not at all under reduced motion.
- **Legality** — `.verdict` (`data-legal`) and `.check-item[data-status]` with
  drawn check / cross / pending icons.
- **Empty states** — `.empty-state` is a leaf-green dashed tray and always names
  the recovery action.

## States

Every control has default, hover, focus-visible, active, disabled and, where
relevant, error. Focus is one language: 2px gold outline, 2px offset. Hover
motion is 140–180ms; the emphasis motion is a gold rim and, on card art, the
tilt toward the pointer (a card is pressed back, never lifted), plus the card
peek's 140ms fade with a 3px lift. Touch never tilts a card, and
`prefers-reduced-motion` collapses all of it (the rim stays).

Browser surfaces are themed: selection is a gold wash, scrollbars are thin
ink-on-ink, carets are gold, numerals are tabular, and the skip link is the
first focus stop.

## Copy

Controls name their action ("Copy deck link", "Keep", "Clear filters"). Empty
and error states name the problem and the recovery, not just the absence of
content.
