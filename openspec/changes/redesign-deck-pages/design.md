# Design

## Context

Deck pages shipped in `add-deck-builder` (complete, un-archived): `/decks` renders a text list from `deck-store`, `/decks/build` runs the embed-payload browser with add buttons and per-row qty controls, and `deck-rules.ts` exposes `validate(deck, indexes)` as a pure function. Both pages already carry snapshot-derived rule indexes (`buildDeckRuleIndexes`) and the card payload from `grid-payload.ts`. Image serving follows the catalog: representative printing per card, `imgUrl(imageId, '240w')`, rotated battlefield art class.

## Goals / Non-Goals

**Goals:**
- Reshape both pages' presentation without changing deck persistence, share encoding, or the checker's contract.
- Keep keyboard/click accessibility as a peer to drag-and-drop (drag is an addition, not a replacement for add buttons).
- Stay dependency-free: native HTML5 drag events; no DnD library.

**Non-Goals:**
- No re-theming of the catalog/sets pages; no drag-and-drop on the Decks grid tiles.
- No changes to deck schema, storage layout, share URL format (design.md of `add-deck-builder` D1–D5 stand).
- No touch-fallback implementation specifics beyond what HTML5 drag gives on the target browsers (mobile drag parity deferred).

## Decisions

### D1. Tile grid computed client-side; badges reuse `validate`
`/decks` renders the tile grid from `deck-store` (client-rendered as today), and each tile badge runs `validate(deck, ruleIndexes)` on visit — so the badge and manager checklist are one implementation. Rule indexes must be embedded on the Decks page payload (they currently exist only on build.astro): same `buildDeckRuleIndexes` call, escaped by `escapedJson`. Tile cover art = representative printing of the legend slug; art known by slug lookup over a slimmed index map (slug → legend artId), not the full grid payload (keeps the page light: covers for ~60 legends max are enough; missing mapping → placeholder face).

*Alternatives:* full grid payload on the deck page (~1.2 MB) — rejected, no browsing needed there; server-side computation — impossible, decks live in the browser.

### D2. Creation modal is a dialog in deck-list flow, legend picker scoped to legend-typed cards
Legend picker inside the modal browses only `SECTION_CARD_TYPES.legend` entries. Accept calls a new `deck-store` helper `addDeck(name, legendSlug)` seeding the Legend zone; the deck-creation path used everywhere else routes through it so shared-import and modal produce the same shape. Cancel = close without write; ESC/backdrop both cancel (assumption: cancel reverts, consistent with the brief).

### D3. Browser rows become art-only cards; drag = addition, not replacement
The deck browser keeps windowed rendering/pooling but swaps `entryHtml` for card impression markup (art tile + copy chip overlay; name/meta text removed except as tooltip/aria-label). The existing add button stays beneath the card as a click fallback (screen readers, right-click users) — the brief adds drag, nothing says it removes click-adds. Drag uses native `dragstart` (payload: slug) and drop targets on the five section containers `dragover` (preventDefault when `canAdd(section, slug).ok`) / `drop` (reuse `addToSection`). Illegal targets refuse during `dragover` (no highlight, drop no-op) and generate the same flash feedback as the Add button when the drop is rejected at drop-time (copy-limit already reached, second legend). Shared-deck (view-only) mode hides drags entirely — view state has no deck identity to mutate.

### D4. Copy chip as the on-art control
One overlay chip on the art: `qty per section` concise form ("M2 · S1", dots for sections with copies, "—" for none), click = cycle +1 on the focused section's preferred section? no — keep it dumb: two small buttons (− / +) on the chip bound to the *active section* (the pill/focused section) so intent stays explicit, mirroring the section-row controls. The chip re-renders from `breakdownFor` + qtyOf on every mutate (reuse `refreshBadges`).

*Alternatives:* chip opens a per-section popover — richer but heavier; deferral noted.

### D5. Rune ratio = numeric inputs per Legend color
The rune section header gains two number inputs (one per legend domain, default 0). Writing ratio R adjusts the rune deck: for each color, current copies of that color's rune cards move toward R (increase = add copies of the domain's rune card; decrease = remove from the top). Section qty controls and chips stay mutually consistent because every path goes through `setQty` + `validate`. Out-of-range writes (target ≠ 12 total) are NOT clamped — the exact-12 rule stays the single source of truth (checklist shows 12/12 state like today). Battlefields/legend/main/side get no inputs.

*Assumption recorded:* "write how many runes of each color" means target counts per color filled via that color's rune card (data has exactly one rune card per color today, so cards-vs-colors coincide).

### D6. Pill row = focus-section affordance, domain filter = chip multiset
Pills (All | Legend | Main deck | Battlefields | Runes) wrap the existing `focusSection` behavior; "All" clears type presets (equivalent to main/side legal types view). The domain filter chips come from the snapshot's domain enum; when a Legend exists, its two domains start chip-on; on the Battlefields pill the domain filter is ignored (bypass documented in the filter logic). Filtering composes as: type pill ∩ domain chips ∩ search ∩ rarity ∩ set.

*Alternatives:* filter option 'auto' toggles — deferred; preselect always-on while a legend persists is simpler to explain.

## Risks / Trade-offs

- [D3 native drag ignores keyboard users] → add buttons and section-editing remain complete peer paths; drag is progressive enhancement.
- [Mobile touch has no HTML5 drag] → chips + add buttons cover mobile; native `draggable` won't fire reliably on touch — accepted, noted as follow-up if mobile parity matters.
- [D5 ratio writes can create mid-edit illegal totals] → identical to any manual rune edit today; checklist covers it, no extra clamps.
- [D1 badge computation per tile on visit] → 10ish decks × cheap pure function; below noise.
- [Archival order] → these MODIFIED deltas need `add-deck-builder` archived first (proposal records this); until then `openspec validate` reports the same INFO note older changes already carry.

## Open Questions

- Whether the copy chip should open a full per-section popover later (files: chip is now −/+ against the active section).
- Touch-drag fallback (e.g., long-press drag) — deferred unless mobile parity is requested.
