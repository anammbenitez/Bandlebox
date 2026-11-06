# Tasks

## 1. Single header component

- [x] 1.1 Create `src/components/SiteHeader.astro` containing the header (brand, nav links with current-page mark, `header-sprig` spans) moved verbatim from `Base.astro`, with no props and no `bough-hang` span; verify `npm run build` succeeds.
- [x] 1.2 Replace the inline header in `Base.astro` with `<SiteHeader />` and remove the sprig imports/`getImage` code there; verify `Base.astro` no longer references `sprig` or `bough` and the build passes.

## 2. Remove the cross branch

- [x] 2.1 Delete the `.bough-hang` rules and the `.is-wide .bough-hang` / media-query overrides from `src/styles/global.css`; verify `grep -rn bough-hang src` returns nothing.
- [x] 2.2 Delete `src/assets/wood/sprig_vertical_left.png`; verify no file references it and the build passes.

## 3. Verify

- [x] 3.1 Run `npm run build`, then view `/`, a card page, `/decks` and `/decks/build` at desktop and phone width and confirm the headers look identical with no crossing branch.
- [x] 3.2 Run `impeccable detect` on `src/components/SiteHeader.astro` and `src/layouts/Base.astro` and confirm no new findings.
