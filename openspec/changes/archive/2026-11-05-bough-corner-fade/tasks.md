# Tasks

## 1. Corner-only Bough

- [x] 1.1 In `src/components/Bough.astro`, keep only the four corner imports and markup, remove the top/bottom run and left/right rail elements, remove the seeded cutting generator and the hanging side cutting, and collapse the props to `tone: 'bark' | 'lit' | 'quiet'`; verify with `npm run build` and `rg "density|seed|sprig|bough-top|bough-left" src/components/Bough.astro` returning nothing.
- [x] 1.2 In `src/styles/global.css`, replace the run/rail/cutting/canopy and corner-placeholder rules with the four corner positions plus one radial fade mask per corner (top-left `0 0`, top-right `100% 0`, bottom-left `0 100%`, bottom-right `100% 100%`); remove `.bough::after`, the inset 1px shadow, and keep only the soft outer/inset shade; verify with `npm run build` and a 1440 screenshot showing bare top, bottom, and side edge middles.
- [x] 1.3 Tune the mask stops and per-corner scale so the top and bottom corners read as one size of detail and each arm is effectively transparent at the content line; verify against 390, 1024, 1440, and 2560 screenshots with no arm crossing a filter, card, ledger cell, or button.
- [x] 1.4 Update `src/pages/decks/build.astro` so the browser frame uses `tone="quiet"` and the deck sheet uses `tone="lit"`; verify a 1440 screenshot shows the calm browser and the warmer sheet with no `seed`/`density` attributes left.

## 2. Retire the edge assets

- [x] 2.1 Search every edge and sprig asset for references, then delete the four edge runs and the sprigs no longer used; keep `sprig_vertical_left.png` for the nav's hanging vine; verify `npm run build` succeeds and `src/assets/wood/` contains only the four corners and that one sprig.
- [x] 2.2 Verify the nav and footer still render their vector rails and the hanging sprig after the asset removal by checking `/decks/build` at 1440 and confirming no broken background image request in the browser console.

## 3. Visual proof and tuning

- [x] 3.1 Capture the deck manager at 390, 768, 1024, 1440, and 2560 with a populated deck; verify the four corners are the only painted wood, every arm fades before its edge midpoint, no vine repeats down a side, and the page has no horizontal overflow.
- [x] 3.2 Capture a tall panel (a full deck at 1440×900 and a scrolled browser at the same size); verify the middle of both side edges stays bare and the deck sheet's foot fade does not cut a corner arm.
- [x] 3.3 Verify the stacked layout at 390 and 768 keeps the corner-only treatment with no canopy or continuous top run, and that the browser filters, ledger cells, and card controls near the corners remain unobscured and clickable.
- [x] 3.4 Run the project's impeccable detector on the changed page and confirm the frame work adds no new findings; record any pre-existing findings separately instead of fixing them in this change.

## 4. Durable rules

- [x] 4.1 Rewrite the "The bough" section of `DESIGN.md` around the corner-accent rules (corner is the whole frame, arms fade before the midpoint, never run/tile/stretch an edge), explicitly retire the side-vine, seeded-cutting, canopy, compress-along-grain, and inner-line rules, and keep the registration, `cqw`, undistorted-paint, light, inset, and tone-hierarchy rules; verify `rg "repeat|seed|canopy|compress" DESIGN.md` no longer finds the retired claims.
- [x] 4.2 Add a short design-work note to `AGENTS.md` that points UI work at `DESIGN.md` and states the corner-accent rule in one sentence; verify the note names both `DESIGN.md` and the corner-only/fade rule.
- [x] 4.3 Decide from the 2560 screenshot whether the bare edge needs the faint fallback hairline noted in `design.md`; record the decision and, if used, the hairline's rule in `DESIGN.md`.

## 5. Integration checks

- [x] 5.1 Run `openspec validate bough-corner-fade --strict` and confirm the delta is valid.
- [x] 5.2 Run `npm run build` after all code and asset removal and confirm the full page set still builds.
- [x] 5.3 Walk the four scenarios in `specs/deck-manager/spec.md` against the captured screenshots: corner-only at desktop, fade before midpoint, tall panel without a side border, stacked layout, and no painted wood over working content.

## Workflow follow-up

- Archive the change after review and the project's checks pass.
- Verify the archive notes that the full-frame design rules were retired.
