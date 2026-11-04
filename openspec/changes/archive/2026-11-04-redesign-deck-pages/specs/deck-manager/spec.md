# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Rune deck accepts written color ratios
The Rune deck section SHALL provide per-color count inputs matching the deck's Legend colors, so the user can declare how many runes of each color to play; the inputs SHALL fill the rune deck with copies of that color's rune cards up to the declared counts and keep the section's total at the required rune-deck size (exceeding or falling short shows in the count as usual). Battlefields and other sections do not provide this per-color writing.

#### Scenario: Writing a ratio fills the rune deck
- **WHEN** a user with a fury/chaos Legend writes 8 fury and 4 chaos
- **THEN** the rune deck holds 8 Fury Rune copies and 4 Chaos Rune copies, modifications via other controls update the inputs, and the legal/unlegal outcome tracks the exact-12 rule as any other rune change

#### Scenario: Ratio edits respect copy behavior
- **WHEN** the user lowers a per-color count below the current copies of that color
- **THEN** surplus copies are pulled from the rune deck accordingly
