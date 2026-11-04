# deck-manager Specification

## Purpose

Owns the deck-building experience: the deck manager page and its deck sections, the embedded card browser, and how cards move from browser into deck.

## Requirements

### Requirement: Deck manager organizes cards into deck sections

The deck manager SHALL present every deck as five clearly separated sections — Legend, Main deck, Rune deck, Battlefields, Side deck — each showing its required size (or limit) and the current card count for that section.

#### Scenario: Fresh deck shows the empty skeleton

- **WHEN** a user opens a newly created deck
- **THEN** all five sections are visible with their target counts (Legend 1, Main 40, Rune 12, Battlefields 3, Side at its limit) showing zero cards

### Requirement: Deck sections accept only cards of the right card type

The system SHALL restrict what each section accepts by card type — Legend sections to legends, Rune deck to rune cards, Battlefields to battlefield cards, and the Main deck and Side deck to main-deck-legal types (units, spells, gear) — and SHALL cap the Legend section at one copy of its card and each battlefield at one copy, enforced on every mutation path (add buttons, copy chips, drags, and the section copy controls alike).

#### Scenario: A rune cannot enter the main deck

- **WHEN** a user adds a rune card while working on the main deck
- **THEN** the rune is placed in (or offered to) the rune deck, not silently added to the main deck

#### Scenario: Copy controls refuse a doubled battlefield

- **WHEN** a battlefield row's "+" control is pressed while that battlefield is already in the deck
- **THEN** no second copy is added and the refusal is visible

#### Scenario: The copy cap survives every path

- **WHEN** any addition path (add button, chip, drag, section row) is used on a legend already placed, or on a battlefield already placed
- **THEN** the section still holds exactly one copy of that card

### Requirement: Embedded card browser for card selection

The deck manager SHALL include a card browser over the full local snapshot with name/text search plus type, rarity, set, and domain filters, presenting cards as art-only card impressions (card image, no text block, as in the catalog's card grid) in a paged or windowed grid so the whole catalog remains answerable without loading every card at once.

#### Scenario: Find and inspect a candidate card

- **WHEN** a user searches by partial card name and scrolls the results
- **THEN** matching cards render progressively as art-only impressions, and a card's detail page remains reachable from it

### Requirement: Browser narrows to the section being filled

The system SHALL scope the browser to the section currently being edited — the pill row and the section focus act together — so the working browser view already matches that section's allowed card types and cannot add a card to a section it does not fit.

#### Scenario: Switching section retargets the browser

- **WHEN** the user focuses or pill-selects the rune deck section
- **THEN** the browser presets show rune cards by default, and a card added from this view enters the rune deck

### Requirement: Adding and removing copies

The system SHALL let users add a card as one or more copies, and adjust or remove copies of any card already in a deck section, with each section's current copy counts always visible inline.

#### Scenario: Counting up and down

- **WHEN** a card is added and then has copies increased and decreased
- **THEN** the section count and per-card copy count update immediately, down to zero, where removal removes the row

### Requirement: Cards already in the deck are visible in the browser

The system SHALL show, on each browsed card, how many copies the current deck already runs, so an out-of-copies card is recognizable before adding.

#### Scenario: Maxed card marked in browser

- **WHEN** three copies of a card are already in the deck
- **THEN** its browser entry shows that count and it cannot silently receive a further copy beyond the enforced copy limit

### Requirement: Deck state is immediately reflected

Any change made in the deck manager SHALL appear in both the deck sections and the legality checklist without a manual refresh or save step.

#### Scenario: One change, whole screen agrees

- **WHEN** a user adds a card to the main deck
- **THEN** the main deck count, the card's inline count, legality status, and the deck's share state all reflect the addition at once

### Requirement: Share deck as link

The deck manager SHALL offer a share action that produces a complete-deck URL and makes it available for copying (for example, to the clipboard).

#### Scenario: Copying a share link for a friend

- **WHEN** a user triggers the share action on a partially built deck
- **THEN** they have a URL that, opened elsewhere, recreates that same partial deck

### Requirement: Decks reachable from world navigation

The site's persistent navigation SHALL expose a Decks entry alongside the existing Cards and Sets destinations, serving as the home for the deck list and deck manager entry points.

#### Scenario: Navigating to the deck system

- **WHEN** a user follows the Decks navigation entry from a card or set page
- **THEN** they reach the list of their saved decks and can create or open a deck from there

### Requirement: Cards can be dragged into deck sections

The deck manager SHALL let users drag browsed cards onto deck sections, placing the dropped card into the target section by one copy, and SHALL refuse (no placement, visible refusal) drop targets whose card-type or placement rules the card does not satisfy.

#### Scenario: Unit drags into the main deck

- **WHEN** a main-deck-legal card is dragged onto the Main deck section
- **THEN** it lands there with one copy and section counts and legality update as for any addition

#### Scenario: Rune drags are refused by the main deck

- **WHEN** a rune card is dragged onto the Main deck section
- **THEN** no copy is placed and the drop is visibly refused

#### Scenario: Second legend drags are refused by the Legend section

- **WHEN** a legend is dragged onto the Legend section that already holds a Legend
- **THEN** no copy is placed and the drop is visibly refused

### Requirement: Copy chip overlays browser cards

Each browsed card SHALL carry a copy-count chip overlaid on its art showing the deck's copy counts for that card (per section, or a marker when the card is unknown or not in the deck), with controls to increase or pull down copies directly from the chip.

#### Scenario: Chip tracks deck state live

- **WHEN** copies of a card change by any means (drag, chip, section controls)
- **THEN** that card's chip in the browser reflects the new counts immediately

#### Scenario: Pulling copies from the chip

- **WHEN** a user decreases the count on a card's chip
- **THEN** copies are removed from the intended section the same way section controls remove them, down to row removal at zero

### Requirement: Section pill filters over the collection

The deck manager browser SHALL offer a pill-style row of generic section filters across the collection — All, Legend, Main deck, Battlefields, Runes — which retarget whose card types are shown and where additions land, alongside the existing detailed filters.

#### Scenario: Pills retarget the browser

- **WHEN** a section pill is chosen (equal to focusing that section)
- **THEN** the working browser presents that section's card types and additions route there, matching focus-section behavior

### Requirement: Domain filter preselects the Legend's colors

The deck manager browser SHALL offer a Domain filter, and when a deck's Legend is chosen the filter SHALL show that Legend's two domains preselected, so the default view only presents cards matching the Legend's Domain identity; a selected Battlefields pill SHALL not be constrained by the domain filter (battlefields are any color).

#### Scenario: Legend colors preselected

- **WHEN** a deck led by Ziggs (fury, chaos) opens its card browser
- **THEN** the domain filter starts with fury and chaos selected and the default browsing shows fury/chaos cards

#### Scenario: Battlefields bypass the domain filter

- **WHEN** the Battlefields pill is active with a domain filter set
- **THEN** battlefields of every color remain browsable

### Requirement: Rune deck accepts written color ratios

The Rune deck section SHALL provide per-color count inputs matching the deck's Legend colors, so the user can declare how many runes of each color to play; the inputs SHALL fill the rune deck with copies of that color's rune cards up to the declared counts and keep the section's total at the required rune-deck size (exceeding or falling short shows in the count as usual). Battlefields and other sections do not provide this per-color writing.

#### Scenario: Writing a ratio fills the rune deck

- **WHEN** a user with a fury/chaos Legend writes 8 fury and 4 chaos
- **THEN** the rune deck holds 8 Fury Rune copies and 4 Chaos Rune copies, modifications via other controls update the inputs, and the legal/unlegal outcome tracks the exact-12 rule as any other rune change

#### Scenario: Ratio edits respect copy behavior

- **WHEN** the user lowers a per-color count below the current copies of that color
- **THEN** surplus copies are pulled from the rune deck accordingly

### Requirement: Neutral-domain cards are always legal and always searchable

The legality checker and the Domain filter SHALL treat a card whose Domain set contains the neutral domain (a generic-domain card, e.g. Neeko) as legal in every deck and visible under any Domain filter selection, so such cards remain present in the default browsing and in search no matter which domains are preselected or chosen; never coloring them a domain-identity failure.

#### Scenario: Neeko is findable by name

- **WHEN** a user searches for "Neeko" in any deck's card browser, whatever the Legend or the Domain chips
- **THEN** Neeko appears in the results

#### Scenario: Neutral card passes domain identity

- **WHEN** a neutral-domain card sits in any section of a deck whose Legend's colors do not include it
- **THEN** the domain rule passes it and never lists it among off-color failures

### Requirement: Deck viewer width is user-adjustable

On the deck manager's two-column layout (large screens), the deck viewer panel's width SHALL be adjustable by dragging a grip between the card browser and the deck viewer. The drag SHALL resize the viewer within defined minimum and maximum bounds, the browser column SHALL absorb the remaining width, and the chosen width SHALL persist across visits in local browser storage until changed or unavailable.

#### Scenario: Dragging the grip resizes the viewer

- **WHEN** a user drags the grip between the card browser and the deck viewer
- **THEN** the viewer's width follows the pointer within the allowed bounds, the browser column takes the remaining width, and the grip stays between the columns

#### Scenario: Dragging clamps at the bounds

- **WHEN** a user drags the grip past the minimum or maximum viewer width
- **THEN** the viewer stops at that bound and does not collapse, overflow the window, or stretch past it

#### Scenario: Chosen width survives a reload

- **WHEN** a user resizes the viewer and later reloads the deck manager on the same large-screen layout
- **THEN** the viewer opens at the width they last chose

#### Scenario: No grip on smaller viewports

- **WHEN** the deck manager is viewed below the large-screen breakpoint, where the card browser and deck viewer stack full-width
- **THEN** no grip is rendered and the stacked layout behaves as before

### Requirement: Two-column layout fits the screen

On the deck manager's two-column layout (large screens), the card browser and the deck viewer SHALL each be confined within the visible screen height rather than extend the page, and each side SHALL scroll its own contents independently: the deck viewer within its panel and the card grid within the browser column. Working one side SHALL not scroll the other side's contents, and the deck sections or browser content that exceed the screen remain reachable through each side's own scrolling.

#### Scenario: Sections beyond the screen scroll inside the viewer

- **WHEN** a deck holds enough cards that the deck viewer's sections exceed the screen height
- **THEN** the viewer stays confined to the visible screen and its contents scroll inside the panel as the user moves through the sections

#### Scenario: The browser scrolls its own card grid

- **WHEN** a user scrolls through the browsed cards
- **THEN** the cards scroll within the browser column only, the deck viewer stays confined to the visible screen, and its position is not scrolled by the browser's scrolling

#### Scenario: Appended cards stay reachable

- **WHEN** new cards load into the browser grid while the user keeps scrolling the browser column
- **THEN** the appended cards remain reachable through that column's own scrolling

#### Scenario: Smaller viewports keep the stacked layout

- **WHEN** the deck manager is viewed below the large-screen breakpoint
- **THEN** the layout stacks as before and the page scrolls through both parts normally

### Requirement: Deck viewer contents respond to the chosen width

The deck viewer's contents SHALL reflow to the panel's actual width rather than a fixed column count: each section's card rows SHALL present more cards per row when the viewer is widened and fewer when narrowed, and no deck viewer content SHALL overflow or be cut off at any width within the allowed bounds.

#### Scenario: Widening shows more cards per row

- **WHEN** a user widens the deck viewer so a section's card rows have room for more thumbnails
- **THEN** the rows show more cards per row without changing card or copy behavior

#### Scenario: Narrowing keeps rows usable

- **WHEN** a user narrows the deck viewer toward the minimum width
- **THEN** each section's card rows reflow to fewer cards per row while thumbnails, copy counts, and controls stay usable, and nothing overflows or is clipped

#### Scenario: Missing stored width falls back gracefully

- **WHEN** no stored width is available (first visit, or browser storage is unavailable)
- **THEN** the viewer uses the current default width and the page works as before

### Requirement: Editor chrome stays visible on scroll

On the deck editor page, the deck's name/meta/actions bar SHALL stay within view while the page scrolls, and the card browser's pill and filter components SHALL stay within view while their column's contents scroll, using sticky positioning within their existing containers (not extra fixed overlays).

#### Scenario: Scrolling the browser keeps its filters

- **WHEN** a user scrolls through a long card match list at a desktop layout
- **THEN** the pills, search, and filter controls remain visible at the top of the browser column

#### Scenario: Page-level scroll keeps the deck identity visible

- **WHEN** the deck editor page itself scrolls (narrow layout, or down to the footer on large screens)
- **THEN** the deck name and its actions remain visible, sitting beneath the fixed site navigation

### Requirement: Card impressions size with their container

The deck editor's browsed-card grid SHALL lay out from its container's actual width rather than fixed breakpoints: the column count SHALL reflow as the container's width changes (window resizing, or the deck viewer drag changing the browser column), and each card impression SHALL not shrink below a minimum size whose printed name and labels remain comfortably readable.

#### Scenario: More width, more columns

- **WHEN** the browser column gets wider (window grows or the deck viewer is dragged narrower)
- **THEN** the card grid reflows to more columns of at least the minimum comfortable size

#### Scenario: Narrow width respects the minimum size

- **WHEN** the browser column gets too narrow to fit another column
- **THEN** the column count drops and the cards stay at no smaller than the minimum comfortable size, without clipping the printed labels

### Requirement: Champion zone beside the Legend

The deck viewer SHALL provide a Champion zone directly to the right of the Legend. A deck has at most one Champion: a single champion-unit card sharing the Legend's champion tag, shown up to the standard copy cap of 3. Its copies live in the main deck, so collecting or pulling them updates the main deck exactly once for the counter and the legality rules. The zone stays empty until a champion is placed, and a placed champion is replaceable.

#### Scenario: Placing the deck's champion

- **WHEN** a user places a champion unit that shares the Legend's tag into the Champion zone
- **THEN** the zone shows that champion card and the copy goes into the main deck, with the main-deck counter and legality reacting as for any main-deck addition

#### Scenario: Playset counts in the main deck

- **WHEN** a user raises the Champion zone's champion to all 3 copies
- **THEN** the slider shows 3 in the zone and the Main deck counter counts those 3 cards — exactly once, with no doubled counting and no copies duplicated in another section

#### Scenario: Zone accepts only the Legend's tag

- **WHEN** a user attempts to place a champion unit whose tag does not match the Legend's, or replaced Legend changes
- **THEN** the zone refuses or clears as appropriate, and the deck views the correct champion placement per the tag rule

#### Scenario: Copy chip lives on the champion card

- **WHEN** the user wants to adjust the champion's copy count or remove its copies
- **THEN** the minus/count/plus and remove controls sit on the Champion card, and the Legend card presents no copy chip of its own while remaining replaceable by placing another legend

### Requirement: Deck viewer presents the field zones

At desktop sizes, the deck viewer SHALL present the deck zones in a field-like layout within its panel: the Legend and the Champion zone side by side at the top, a horizontal row for Battlefields, and a main-deck grid of roughly five cards per row on a standard desktop PC that reflows with the panel width toward a comfortable minimum instead of many tiny columns. The viewer's default width SHALL be wide enough for this layout before the user resizes it.

#### Scenario: Legend and Champion share the top row

- **WHEN** a deck with a Legend opens in the viewer at desktop width
- **THEN** the Legend card and the Champion zone appear side by side as the first zone, the champion side showing the placed champion or its empty placement state

#### Scenario: Battlefields lie horizontally

- **WHEN** the Battlefields zone has cards
- **THEN** the battlefields show in a horizontal arrangement with each card's landscape orientation respected

#### Scenario: Main deck reads large

- **WHEN** a deck with a full main deck opens on a standard desktop PC at the viewer's default width
- **THEN** the main-deck cards render noticeably larger than before, around five per row, and keep this comfortable size while the panel is narrowed until the minimum size is reached
