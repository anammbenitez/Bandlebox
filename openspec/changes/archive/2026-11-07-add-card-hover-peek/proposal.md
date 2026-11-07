# Proposal

## Why

The deck manager shows cards as art-only faces, and the art is small: browser tiles are about 9rem wide and deck-section thumbnails about 6.5rem, so the printed cost, rules text and keywords are unreadable at the size you build with. Judging a card means opening its detail page, which leaves the deck. Deck building needs a quick, readable answer to "what does this cost, what does it do, and does it fit my deck?" without losing your place.

A card face is also a click target: a plain click on a browser card adds it to the deck. A hover popup therefore has to stay out of the way of the pointer's real work. It should appear only when the user has stopped (a still pointer, no clicking, no scrolling) and never while they are acting.

## What Changes

- Add a **card peek**: a small, readable, non-modal card that appears beside a card face after the pointer has rested on it for a short dwell. It works on every card face in the deck manager, in both the browser and the deck viewer (Legend, Champion, battlefields, main, rune and side faces).
- The peek shows what matters when building: name, type line and domains; the cost row (Energy, Power, Might, with the same symbols as card text); keywords and rules text; and a **deck-fit** block computed from the open deck: colors against the Legend, champion tag against the Legend, copies held against the copy limit, and a banned warning.
- Apply a **stillness rule**, the heart of this change. The peek opens only if the pointer is at rest and the user has not clicked or pressed on the card, started a drag, or scrolled. Pointer movement restarts the dwell. A press, click or drag closes the peek and blocks it until the pointer leaves that card. Scrolling and typing close it and block it until the pointer moves again.
- Give keyboard focus on a card face the same peek after the same dwell, so the feature does not become pointer-only. Touch input does not open it, since there is no hover.
- Remove the native `title` tooltip from card faces so two tooltips never stack. The copy-control chips keep their own.
- Serve each card's deck-independent facts as a small server-rendered fragment, built with the existing card-text renderer, and cache the fragment in the browser after the first peek.
- Extract the domain-identity check and the stat-symbol derivation out of `validate()` and the detail page so the peek, the checklist and the detail page cannot disagree.

Out of scope: pinning the peek into a true modal; touch long-press; showing card art in the peek (the face is already visible); peeks on the catalog grid or the decks library.

## Capabilities

### New Capabilities
- `card-peek`: the hover peek on deck-manager card faces: when it opens and closes (dwell and stillness rules), what it shows (card facts and deck fit), and how it is placed without getting in the way.

### Modified Capabilities
- `card-text-rendering`: add a requirement that card text shown in the peek uses the same keyword labels, glyphs and italics as the detail page, rendered by the same renderer.

## Impact

- `src/scripts/deck-builder.ts`: remove face `title`s, start the peek, supply the deck-fit data, close the peek on deck mutations.
- `src/pages/decks/build.astro`: the peek element and its styles.
- `src/styles/global.css`: peek styles, using existing tokens, with reduced-motion handling.
- New `src/lib/hover-intent.ts` (the dwell and stillness state machine) and `src/lib/deck-fit.ts` (the deck-fit facts): both pure and Node-verifiable.
- New `src/scripts/card-peek.ts`: DOM glue, positioning, fragment cache.
- New static endpoint under `src/pages/` that emits one facts fragment per card at build time (about 1,100 small files).
- `src/lib/deck-rules.ts`, a new `src/lib/card-stats.ts`, and `src/pages/cards/[slug].astro`: shared helpers extracted, no behavior change.
- New `scripts/verify-card-peek.mjs` (state machine and deck fit), listed in `CLAUDE.md`; assertions added to `scripts/verify-deck-core.mjs` for the extracted domain-fit helper.
- No new dependencies, no change to stored decks, share links, or the catalog snapshot.
