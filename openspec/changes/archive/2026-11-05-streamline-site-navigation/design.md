# Design

## Context

`Base.astro` renders the nav inside a `max-w-6xl` centered container by default and a full-width one (`nav-wide`) only when a page passes `wide` (the deck manager). `.site-nav` is a flex row, so links already sit after the brand; the `nav-wide` variant only changes width and a small brand margin. The `nav` array currently lists Browse cards, Sets, Decks. Sets pages live in `src/pages/sets/` and are linked only from the nav and from each other. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One nav layout for all pages, matching the deck manager's.
- Centered nav below the `sm` (640px) breakpoint.
- Remove the Sets routes cleanly with no dead links.

**Non-Goals:**
- Changing page body width (`wide` still governs only main content and the deck manager's app shell).
- Removing the set filter, set data, or set labels on cards.
- Redirects from old `/sets` URLs (personal offline site, no external links to preserve).

## Decisions

- **Always use the full-width nav.** Drop the `wide` conditional for the nav container so every page gets `nav-wide max-w-none`; keep `wide` only for `<main>`. Alternative: keep the `max-w-6xl` container and left-align inside it — rejected because the user said to match the deck manager, whose header spans the window.
- **Center on phones with CSS, not markup.** Add `justify-content: center` to `.site-nav` below `sm` (mobile-first: center by default, `sm:justify-start`). Alternative: stack brand and links — rejected, the three-item row fits on 375px wide screens once Sets is gone.
- **Hide nothing to fit.** The brand's "Deck Manager" subtitle is already `hidden sm:inline`, so no extra responsive hiding is needed.
- **Delete, don't hide, the Sets pages.** Remove both page files so the build stops emitting `/sets/*`. Anything that imported from them (nothing outside the pages found) is cleaned up; `setPrimaryRelease` and related helpers in `catalog.ts` stay because the grid and card pages use them.
- **Ledes are plain string edits** in `index.astro` and `decks/index.astro`; the Browse cards "N cards · M sets" meta is kept.
- **Docs follow code:** update the route lists in `CLAUDE.md` and `README.md`; `DESIGN.md` mentions are checked and adjusted if they describe the nav.

## Risks / Trade-offs

- [Wide nav on large monitors puts links far from page content's centered column] → Accepted per request; matches existing deck manager look.
- [Bookmarks to `/sets` break] → Single-user local site; acceptable.
- [Brand + two links on a 320px screen] → Verify at 320 and 375px widths with the browser pane.
