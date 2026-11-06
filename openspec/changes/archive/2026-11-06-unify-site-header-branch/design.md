# Design

## Context

See proposal.md. `Base.astro` already renders one header for all pages, so the markup is not duplicated per page. The inconsistency is a decoration: `.bough-hang` (a vertical sprig image) is shown by default and hidden only when `body.is-wide` (deck editor) or below 64rem. The header's own look comes from `.site-header::after` (the repeating bough strip) plus two `.header-sprig` spans.

## Goals / Non-Goals

**Goals:**
- Every page shows the deck editor's header exactly.
- The header has one definition, as a component, with no page-dependent branches.

**Non-Goals:**
- Redesigning the bough, sprigs, brand or nav links.
- Changing nav behavior (sticky, left-aligned, phone centering).
- Changing the `wide` / `appShell` page layout props.

## Decisions

- **Delete the hang rather than hide it everywhere.** Hiding leaves dead markup, an unused asset and a CSS override. Deleting is the smallest result that matches "delete it". Alternative: `display:none` globally, rejected as dead code.
- **Extract `src/components/SiteHeader.astro`.** It takes no props, so a page cannot vary it; `Base.astro` renders it once. It owns the sprig image imports and `getImage` calls, and the nav link list and current-page logic (using `Astro.url.pathname`). Alternative: keep inline in `Base.astro`; rejected because the user asked for a single component and the layout mixes concerns.
- **Keep header CSS in `global.css`** where `.site-header`, `.site-nav` and `.header-sprig` already live, matching the project's current convention; only the `bough-hang` rules are removed.

## Risks / Trade-offs

- [Removing the hang changes the left end of the header on non-deck pages] → That is the request; verify visually at desktop and phone widths.
- [Moving code could change the nav's sticky or stacking behavior] → Keep the `<header>` classes and element order unchanged; check `build` output and view pages.
