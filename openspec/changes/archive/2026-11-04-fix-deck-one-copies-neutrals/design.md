# Design

## Context

Both defects trace to points where two code paths disagree (found in `src/lib/deck-rules.ts` and `src/scripts/deck-builder.ts`):

- **Single-copy caps**: `canAdd` already refuses second copies on the add/drag/chip paths, but section-row `+/−` calls `mutate` directly and skips that gate. In the checker, the legend rule tests `deck.legend.length` (slot count — 1 slot with qty 2 passes) while the battlefield rule checks distinctness but allows a qty-2 slot inside a 3-slot deck only when 3 slots exist; a 2-slot doubled battlefield (1 distinct) fails overall quota but is readable as "2 of 3" rather than the real fault.
- **Neutral cards**: `Neeko, Blending In` carries `domains: ["neutral"]` (the only neutral card in the current snapshot). `canAdd` and the checker treat every non-legend domain as needing containment in the Legend's colors, and the Domain filter's containment check hides it by default.

## Goals / Non-Goals

**Goals:**
- One gate for quantity caps used by every mutation path; one rule for copies in the checker.
- Neutral (and only a *present* neutral domain) treated as wild-media legality, matching the snapshot enum.
- Neeko searchable in the default view without weakening the filter for colored cards.

**Non-Goals:**
- No change to the exactly-40/12/3 counts, copy-limit (3 per name) rule, or the share/persistence shapes.
- No UI redesign; refusals reuse the existing flash/refusal affordances.
- No broader "extra fuzzy match" on the domains list beyond neutral; colorless/other enum values keep current behavior.

## Decisions

### D1. Gate section-row mutations through the same cap check
Extract the cap logic used by `canAdd` into the mutation gate for all four paths: section-row delta buttons get the same refuse-and-flash treatment (flash the section + show the reason in the count, matching the drop refusal). Cleanest implementation: route every quantity change through one `changeQty(section, slug, delta)` helper that consults `canAdd(section, slug)` for positive deltas (negative deltas stay free — pulling copies is never illegal) — cheap because a separate small window handles both `mutate` and the persistence call once.

*Alternatives:* duplicate the check in the row handler (drift-prone; already bit us).

### D2. Checker counts copies for legend/battlefield caps
Legend rule: `sectionTotal(deck.legend) ≤ 1` AND exactly 1 legend slot total... `sectionTotal > 1` fails. Battlefield rule: keeps "exactly 3 slots, all distinct" and adds per-slot qty cap at 1 (fail with the offending card named). Node verification extends `scripts/verify-deck-core.mjs` with a doubled-legend deck + a doubled-battlefield deck, each expected to fail named rules.

*Alternatives:* fail only on totals → misses which card; keep distinctness + capita per slot → best named failure.

### D3. Neutral admitted on exactly two rules
- Checker domain rule: pass any card whose `domains` includes `neutral`; empty-domain cards still fail (the existing unclassifiable case — distinct from a present neutral).
- Domain filter `matches()`: `neutral` cards bypass the containment requirement (behaviorally: `(info.domains.includes('neutral') || info.domains.every(...))`) so they stay visible under the Legend preselect and any chip set — Neeko remains findable by name/search.
- `canAdd` never needed changing for neutral — a card that the checker admits should also not be *blocked*, but `canAdd`'s type gate is the only place it touches; it never consulted domains. So no extra work beyond the checker/filter.

*Alternatives:* whitelist enum value 'colorless' too — the snapshot has colorless enum entries but no current cards use it for legality purposes; leave it, note as future handling.

### D4. Where the neutral exemption lives: `deck-rules.ts` constants, one place
The domain legality rule and both filter call sites use a shared helper — `isLegalEverywhere(info)` naming the neutral rule in one place so future generic marks (colorless) land in one constant.

## Risks / Trade-offs

- [Routeing rows through the cap gate changes flash destination] → grid + flash behavior matches the drop refusal; the row keeps working for minus/remove.
- [Old decks saved with a doubled battlefield begin to fail a rule] → they already failed distinctness; named-failure wording improves rather than changes legality.
- [Neutral rule on a later rune-heavy snapshot] → only 'neutral' is exempt; future domainless-only runes would be unaffected today.

## Open Questions

- Whether a future snapshot adds a neutral *rune* card — if so, the rune ratio writer's canonical `'<domain>-rune'` path finds no card; leave untouched today (no neutral rune exists in the snapshot).
