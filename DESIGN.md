# Design system — Riftbound Deck Manager

A local-first card catalog and deck builder. The interface is an **Operate**
surface: the card art carries the colour, the interface stays quiet, and the
deck state is always legible at a glance.

## Palette

Defined once in `src/styles/global.css` (`@theme`) by retuning Tailwind's
`slate` and `amber` scales. Components reference the token, never a raw hex.

| Token | Value | Use |
| --- | --- | --- |
| `slate-950` | `#07090d` | page ink, sticky bars |
| `slate-900` | `#0c1015` | panels, fields, tiles |
| `slate-800` | `#1a222b` | hairlines, dividers |
| `slate-700` | `#28323d` | control borders, scrollbar thumb |
| `slate-500` | `#7d8996` | secondary meta (≥4.5:1 on ink) |
| `slate-400` | `#98a3af` | supporting text |
| `slate-100` | `#edf0f3` | primary text |
| `amber-400` | `#e6c27c` | focus, current selection, primary action |
| `amber-300` | `#f3d9a4` | links, active labels |
| `emerald-*` | — | legal / pass |
| `red-*` | — | illegal / fail / destructive |

The six Riftbound domains keep their fixed hues (`deck-builder.ts`
`DOMAIN_COLORS`). They appear only as data: a dot in the domain chip and beside
the rune-ratio count. They are never decoration.

## Type

- One family: the platform sans (`Segoe UI Variable Text`, `Segoe UI`,
  system fallbacks). Product surfaces do not need a display face.
- Fixed scale, ratio ~1.2: page title 24/600, section 18/600, panel title
  13/600, body 14/400, meta 12/400, micro-label 10–11/600 with 0.06–0.08em
  tracking and uppercase.
- Counts, deck totals, dates and prices use `.tnum` (tabular numerals).
- Headings balance; body copy wraps pretty; prose is capped at 65–72ch.

## Layout

- Page column `max-w-6xl`; the deck manager opts out (`wide`).
- Page header: `.page-head` (title, lede, meta) with a hairline rule.
- Deck manager at `lg`: browser column, 12px resize grip, viewer column
  (`--deck-viewer-w`, default 520px). Both columns are sticky and scroll
  independently. Below `lg` the Deck / Back to cards buttons swap the browser
  and the deck as panes, so the deck is never buried behind an endless list.
- Spacing scale: 2 / 4 / 6 / 8 / 10 / 12 / 16 px rhythm. Tight inside groups,
  generous between them.

## Components

All in `src/styles/global.css` under `@layer components`.

- **Buttons** — `.btn` with `data-variant="primary|ghost|danger"` and
  `data-size="sm"`. One height per context, 6px radius, visible disabled state.
- **Fields** — `.field` for input and select; drawn chevron on selects, gold
  border and soft ring on focus, amber caret.
- **Pills / chips** — `.pill` with `aria-pressed` carrying the selected state;
  `.dot` inside a pill is the domain colour.
- **Panels / sections** — `.panel` + `.panel-head`; `.section-card` with
  `data-active="true"` for the deck section the browser is feeding.
- **Card tiles** — `.card-tile` (catalog) and `.face` (art-only browser and deck
  rows) with `.face-bar` stepper controls and `.count-chip` copy counts.
- **Legality** — `.verdict` (`data-legal`) and `.check-item[data-status]` with
  drawn check / cross / pending icons.
- **Empty states** — `.empty-state` always names the recovery action; the
  catalog empty state ships a working “Clear filters”.

## States

Every control has default, hover, focus-visible, active, disabled and, where
relevant, error. Focus is one language: 2px gold outline, 2px offset. Hover
motion is 140–160ms; the only entrance/emphasis motion is a 2px tile lift.
`prefers-reduced-motion` collapses all of it.

Browser surfaces are themed: selection is a gold wash, scrollbars are thin
ink-on-ink, carets are gold, numerals are tabular, and the skip link is the
first focus stop.

## Copy

Controls name their action (“Copy deck link”, “Keep”, “Clear filters”). Empty
and error states name the problem and the recovery, not just the absence of
content.
