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

- **WHEN** the user focuses or pill-selects the rune deck (its cards and slider sit in the Legend section)
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

The site's persistent navigation SHALL expose a Decks entry as its first destination, followed by Browse cards, serving as the home for the deck list and deck manager entry points.

#### Scenario: Navigating to the deck system

- **WHEN** a user follows the Decks navigation entry from a card page
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

### Requirement: Rune deck is set by the color slider

The rune deck (the two rune cards in the Legend section) SHALL be split between the deck's Legend colors by the rune slider (see "The rune slider is the only rune control"), so the user can declare how many runes of each color to play; the slider SHALL fill the rune deck with copies of that color's rune cards up to the chosen counts and keep the section's total at the required rune-deck size. A fresh rune deck with a Legend SHALL start with the default even split of the rune-deck size (6 and 6 for two colors). Battlefields and other sections do not provide this per-color setting.

#### Scenario: Moving the slider fills the rune deck

- **WHEN** a user with a fury/chaos Legend moves the slider to 8 fury
- **THEN** the rune deck holds 8 Fury Rune copies and 4 Chaos Rune copies, changes made through other controls move the slider, and the legal/illegal outcome tracks the exact-12 rule as any other rune change

#### Scenario: Slider moves respect copy behavior

- **WHEN** the user moves the slider so a color drops below its current copies
- **THEN** surplus copies of that color are pulled from the rune deck accordingly

### Requirement: Neutral-domain cards are always legal and always searchable

The legality checker and the Domain filter SHALL treat a card whose Domain set contains the neutral domain (a generic-domain card, e.g. Neeko) as legal in every deck and visible under any Domain filter selection, so such cards remain present in the default browsing and in search no matter which domains are preselected or chosen; never coloring them a domain-identity failure.

#### Scenario: Neeko is findable by name

- **WHEN** a user searches for "Neeko" in any deck's card browser, whatever the Legend or the Domain chips
- **THEN** Neeko appears in the results

#### Scenario: Neutral card passes domain identity

- **WHEN** a neutral-domain card sits in any section of a deck whose Legend's colors do not include it
- **THEN** the domain rule passes it and never lists it among off-color failures

### Requirement: Deck manager desktop split is equal

On large screens, the deck manager SHALL lay the card browser and deck viewer out as equal-width columns, each held in its own bark frame. The split SHALL be fixed: no grip, handle, or drag interaction SHALL resize either column, and no stored width preference SHALL alter the split. Both panels SHALL still fill the working height and scroll their own contents.

#### Scenario: Equal halves at desktop width

- **WHEN** the deck manager opens at a large-screen width
- **THEN** the card browser and the deck viewer occupy equal widths and neither column can be resized by dragging

#### Scenario: Window resize keeps parity

- **WHEN** the desktop window is widened or narrowed
- **THEN** both panels grow or shrink together and remain the same width as each other

#### Scenario: No resize affordance

- **WHEN** a pointer moves between the card browser and the deck viewer
- **THEN** no resize grip appears, the cursor stays in its default state, and no drag behavior starts

#### Scenario: Stale width preference is ignored

- **WHEN** a viewer-width value from an earlier visit exists in local browser storage
- **THEN** the deck manager still renders the equal split and never applies the stored width

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

### Requirement: Deck viewer contents reflow with the panel width

The deck viewer's contents SHALL reflow to the panel's actual width rather than a fixed column count: each section's card rows SHALL present more cards per row when the viewer's equal column is wider and fewer when it is narrower, and no deck viewer content SHALL overflow or be cut off at any desktop window width.

#### Scenario: Wider window shows more cards per row

- **WHEN** the desktop window widens so the equal viewer column has room for more thumbnails
- **THEN** the section rows show more cards per row without changing card or copy behavior

#### Scenario: Narrower window keeps rows usable

- **WHEN** the desktop window narrows so the viewer column approaches the stacked breakpoint
- **THEN** the section rows reflow to fewer cards per row while thumbnails, copy counts, and controls stay usable, and nothing overflows or is clipped

#### Scenario: Stacked viewer still reflows

- **WHEN** the layout stacks below the large-screen breakpoint and the viewer becomes a full-width pane
- **THEN** its section rows still size from the pane's actual width without overflow

### Requirement: Editor chrome stays visible on scroll

On the deck editor page, the deck's name/meta/actions bar SHALL stay within view while the page scrolls, and the card browser's pill and filter components SHALL stay within view while their column's contents scroll, using sticky positioning within their existing containers (not extra fixed overlays).

#### Scenario: Scrolling the browser keeps its filters

- **WHEN** a user scrolls through a long card match list at a desktop layout
- **THEN** the pills, search, and filter controls remain visible at the top of the browser column

#### Scenario: Page-level scroll keeps the deck identity visible

- **WHEN** the deck editor page itself scrolls (narrow layout, or down to the footer on large screens)
- **THEN** the deck name and its actions remain visible, sitting beneath the fixed site navigation

### Requirement: Card impressions size with their container

The deck editor's browsed-card grid SHALL lay out from its container's actual width rather than fixed breakpoints: the column count SHALL reflow as the container's width changes with the window, and each card impression SHALL not shrink below a minimum size whose printed name and labels remain comfortably readable.

#### Scenario: More width, more columns

- **WHEN** the desktop window widens so the browser's equal column gets wider
- **THEN** the card grid reflows to more columns of at least the minimum comfortable size

#### Scenario: Narrow width respects the minimum size

- **WHEN** the browser column gets too narrow to fit another column
- **THEN** the column count drops and the cards stay at no smaller than the minimum comfortable size, without clipping the printed labels

### Requirement: Champion zone beside the Legend

The deck viewer SHALL provide a Champion zone directly to the right of the Legend. A deck has at most one Champion: a single champion-unit card sharing the Legend's champion tag, shown up to the standard copy cap of 3. Its copies live in the main deck, so collecting or pulling them updates the main deck exactly once for the counter and the legality rules. The zone stays empty until a champion is placed, and a placed champion is replaceable. While empty, the zone's slot is itself the control that starts picking; there is no separate select or switch button, and a placed champion is replaced by dropping another tag-matching champion on the zone or by removing it and picking again.

#### Scenario: Placing the deck's champion

- **WHEN** a user places a champion unit that shares the Legend's tag into the Champion zone
- **THEN** the zone shows that champion card and the copy goes into the main deck, with the main-deck counter and legality reacting as for any main-deck addition

#### Scenario: Playset counts in the main deck

- **WHEN** a user raises the Champion zone's champion to all 3 copies
- **THEN** the zone's counter shows 3 and the Main deck counter counts those 3 cards — exactly once, with no doubled counting and no copies duplicated in another section

#### Scenario: Zone accepts only the Legend's tag

- **WHEN** a user attempts to place a champion unit whose tag does not match the Legend's, or replaced Legend changes
- **THEN** the zone refuses or clears as appropriate, and the deck views the correct champion placement per the tag rule

#### Scenario: Copy chip lives on the champion card

- **WHEN** the user wants to adjust the champion's copy count or remove its copies
- **THEN** the minus/count/plus and remove controls sit on the Champion card, and the Legend card presents no copy chip of its own while remaining replaceable by placing another legend

### Requirement: Deck viewer presents the field zones

At desktop sizes, the deck viewer SHALL present the deck zones in a field-like layout within its panel: the Legend section holding the Legend, the Champion zone and the two rune cards (the rune slider under the rune cards) in one row at the top, with the Battlefields (a horizontal row) under it, and a main-deck grid of comfortably sized cards that reflows with the panel width instead of many tiny columns. The viewer's equal half of the desktop workspace SHALL be wide enough for this layout.

#### Scenario: Legend and Champion share the top row

- **WHEN** a deck with a Legend opens in the viewer at desktop width
- **THEN** the Legend card and the Champion zone appear side by side as the first zone, the champion side showing the placed champion or its empty placement state

#### Scenario: Battlefields lie horizontally

- **WHEN** the Battlefields zone has cards
- **THEN** the battlefields show in a horizontal arrangement with each card's landscape orientation respected

#### Scenario: Main deck reads large

- **WHEN** a deck with a full main deck opens on a standard desktop PC
- **THEN** the main-deck cards render at a comfortable size with several per row, and keep this size as the window narrows toward the stacked breakpoint

### Requirement: Panels use a plain bark frame

The deck manager's card browser and deck viewer panels SHALL each be enclosed by a plain bordered frame — a bark-colored rail with a thin inner hairline over a warm dark fill — built from ordinary box styling with no positioned decorative pieces. Painted woodland art SHALL appear only on the site header. The frame SHALL reflow with its panel at every width, with no geometry that depends on breakpoint-specific constants.

#### Scenario: Both panels are framed

- **WHEN** the deck manager renders at any width
- **THEN** the card browser and the deck viewer are each enclosed by the bark frame on all four sides

#### Scenario: Frame never covers working content

- **WHEN** filters, card impressions, the ledger, sections, or controls render near a frame edge
- **THEN** the frame's padding keeps them clear of the border, and the frame takes no pointer input

### Requirement: Decks page description

The deck library page SHALL present the description "Decks live in this browser locally and save themselves as you build, be creative!" beneath its title.

#### Scenario: Reading the page intro

- **WHEN** the deck library opens
- **THEN** its title is followed by exactly that description

### Requirement: Deck title is edited in place

On the deck editor, the deck's title SHALL be editable where it is shown: a user can click it and type, and the new name is saved when they press Enter or when focus leaves the title. Pressing Escape SHALL discard the edit and restore the previous name. The "Rename" button SHALL remain and SHALL move focus into the title with its text selected, rather than opening a separate prompt.

#### Scenario: Enter saves

- **WHEN** a user clicks the deck title, types a new name and presses Enter
- **THEN** the deck is saved under the new name, the title shows it, and reopening the deck from the library shows the same name

#### Scenario: Clicking elsewhere saves

- **WHEN** a user edits the title and then clicks anywhere else on the page
- **THEN** the new name is saved exactly as if Enter had been pressed

#### Scenario: Escape cancels

- **WHEN** a user edits the title and presses Escape
- **THEN** the title returns to the name it had before the edit began and nothing is saved

#### Scenario: Rename button opens the same editing state

- **WHEN** a user presses the "Rename" button
- **THEN** no dialog opens, the title takes focus with its whole text selected, and typing replaces the name

#### Scenario: Keyboard users reach the title

- **WHEN** a keyboard user tabs through the deck bar
- **THEN** the title is a focus stop that is announced as the deck name and is editable

### Requirement: Deck names stay valid when renamed

A rename SHALL never leave a deck without a name: an empty or whitespace-only name SHALL NOT be saved and the previous name SHALL return. Surrounding whitespace SHALL be trimmed, and a name SHALL be at most 80 characters, the same limit as the deck creation modal. A name that did not change SHALL NOT be saved again.

#### Scenario: Empty name reverts

- **WHEN** a user clears the title and presses Enter or clicks elsewhere
- **THEN** the title shows the previous name and the deck keeps it

#### Scenario: Name is trimmed

- **WHEN** a user saves the name "  Poro Swarm  "
- **THEN** the deck is named "Poro Swarm"

#### Scenario: Long names are capped

- **WHEN** a user types more than 80 characters into the title
- **THEN** the title accepts no more than 80 characters

#### Scenario: Unchanged name is not saved

- **WHEN** a user focuses the title and leaves it without changing the text
- **THEN** the deck is not saved again and its last-updated time does not change

### Requirement: Editable title is recognisable

The deck editor SHALL make it apparent that the title can be edited. On hover the title SHALL show a text cursor and a subtle highlight; while it is being edited it SHALL show the interface's focus treatment, and the deck bar's meta line SHALL read that Enter saves and Escape cancels. These cues SHALL NOT add height to the deck bar.

#### Scenario: Hover signals an editable title

- **WHEN** a pointer rests over the title of an editable deck
- **THEN** the cursor becomes a text cursor and the title is highlighted

#### Scenario: Editing explains how to finish

- **WHEN** the title has focus for editing
- **THEN** it shows the focus ring and the meta line reads "Enter to save · Esc to cancel"

#### Scenario: Cues add no height

- **WHEN** a user hovers, focuses and leaves the title
- **THEN** the deck bar keeps the same height throughout

### Requirement: A saved rename is confirmed

After a rename is saved, the deck bar's meta line SHALL briefly confirm it and then return to the deck's counts, and the new name SHALL be announced to assistive technology.

#### Scenario: A save is confirmed

- **WHEN** a rename is saved
- **THEN** the meta line shows a short "Saved" confirmation and then the deck's card count and focused section again, and the new name is announced by the page's status region

#### Scenario: Reduced motion

- **WHEN** the user prefers reduced motion
- **THEN** the hover highlight and the confirmation appear and disappear without animated transitions

### Requirement: Renaming does not disturb the deck views

Saving a rename SHALL change only the deck's name. It SHALL NOT rebuild the deck sections, checklist, rune slider, card chips or Champion zone, and SHALL NOT dismiss or recreate any element other than the title and the meta line, so that the click that moved focus out of the title still takes effect.

#### Scenario: The click that ends the edit still lands

- **WHEN** a user edits the title and then presses a card's "+" control
- **THEN** the name is saved and that card is added in the same press

#### Scenario: Views are unchanged by a rename

- **WHEN** a deck is renamed
- **THEN** its section contents, legality results and scroll positions are exactly as before

### Requirement: Shared decks keep a read-only title

A deck opened from a shared link SHALL show its title as plain text: no hover highlight, no text cursor, no focus stop for editing, and no "Rename" button. Adopting the deck with "Save as my deck" SHALL make the title editable at once.

#### Scenario: Shared title is not editable

- **WHEN** a user opens a shared deck link
- **THEN** the title cannot be edited and shows no editing cues

#### Scenario: Saving a shared deck enables editing

- **WHEN** a user presses "Save as my deck" on a shared deck
- **THEN** the title becomes editable and the "Rename" button appears

### Requirement: The deck zone has General info and Main deck groups

The deck viewer SHALL group the deck into "General info" (Legend, champion unit, runes, battlefields) and "Main deck" (the deck cards, then the side deck). General info SHALL be a dropdown with a toggle exposing `aria-expanded`/`aria-controls`, open by default. Open, it SHALL show one Legend section holding the Legend, the champion unit and the two rune cards, all at exactly the same size in one row (a hairline between the Legend pair and the rune pair), with the rune slider under the two rune cards and the rune count (12 / 12) shown with them, and the Battlefields as their own section below; there SHALL be no separate Rune deck section in General info. Rolled up, it SHALL show a preview of the Legend, the rune slider with its information and the battlefield counter "n / 3". Focusing the Legend, Battlefields or Rune section (a ledger tab, a browser section pill) SHALL open General info again.

#### Scenario: General info starts open and rolls up
- **WHEN** a deck is opened
- **THEN** General info shows the Legend, champion unit and the two rune cards at one size in one Legend section with the rune slider under the rune cards, and the battlefields below; rolling it up replaces them with the Legend preview, the slider and the counter

#### Scenario: A ledger tab reopens General info
- **GIVEN** General info is rolled up
- **WHEN** the user presses the Runes tab of the ledger
- **THEN** General info opens with the Legend section (which holds the runes) focused

### Requirement: The rune slider is the only rune control

The rune split SHALL be one range slider with the Legend's two colors at its two ends, each end showing that domain's emblem (its name as text when there is no emblem) and its rune count. The slider's range SHALL always be the full rune deck of 12, the game's fixed size, whatever the deck holds at the moment: its two ends are 0 and 12 runes of one color, and moving it SHALL set both colors through the rune-ratio rule so that the rune deck is always 12. There SHALL be no number inputs for rune counts. With one color, no Legend or a shared (read-only) deck it SHALL show the counts without an interactive slider. The slider stays interactive when General info is rolled up.

#### Scenario: The slider rebalances the runes
- **GIVEN** a Legend of two colors
- **WHEN** the user moves the slider so the first color has 8
- **THEN** the rune deck holds 8 runes of the first color and 4 of the second

### Requirement: A Legend change re-colors the rune deck

Whenever a different Legend is placed (including after the previous one was removed), the rune deck SHALL be re-colored in the same save, even if its ratio had been edited. The rune deck's total is always preserved (12, 10, 8, whatever it was). Let the new Legend's colors be [c1, c2]: every rune of another color is deleted (a multi-domain rune card is kept when any of its domains is a Legend color, otherwise deleted and counted under its first domain); each of c1, c2 keeps the count the deck already has of that color; a color with no count takes, by position, the counts of the deleted colors; any deleted count still left over is added to c1, c2 in order, round-robin starting with c1, so the total never shrinks. An empty rune deck gets the default even split of 12, and a one-color Legend gets the whole preserved total in its color (a 10-rune deck becomes 10 of that color). Counts of a color the Legend keeps are never moved: 12 Fury under a Fury + Calm Legend stays Fury 12 / Calm 0 (nothing is deleted; the slider adjusts it). A Legend with no known color, or the same Legend, leaves the runes alone. Removing the Legend without placing another leaves the runes alone.

#### Scenario: Fury 8 / Chaos 4 under a Fury + Calm Legend
- **WHEN** the Legend becomes a Fury + Calm Legend
- **THEN** the rune deck is Fury 8 / Calm 4

#### Scenario: Fury 8 / Chaos 4 under a Calm + Mind Legend
- **WHEN** the Legend becomes a Calm + Mind Legend
- **THEN** the rune deck is Calm 8 / Mind 4 and no Fury or Chaos runes remain

#### Scenario: Fury 5 / Chaos 4 / Order 3 under a Fury + Calm Legend
- **WHEN** the Legend becomes a Fury + Calm Legend
- **THEN** Calm takes Chaos' 4, the 3 leftover Order runes go to Fury, Calm, Fury, and the rune deck is Fury 7 / Calm 5 (total 12)

#### Scenario: Fury 6 / Calm 4 / Chaos 2 under a Fury + Calm Legend
- **WHEN** the Legend becomes a Fury + Calm Legend
- **THEN** the 2 Chaos runes go to Fury then Calm and the rune deck is Fury 7 / Calm 5

#### Scenario: A one-color Legend keeps the total
- **WHEN** a deck with 10 runes gets a one-color Legend
- **THEN** the rune deck is 10 runes of that color

#### Scenario: 12 Fury under a Fury + Calm Legend
- **WHEN** the Legend becomes a Fury + Calm Legend
- **THEN** the rune deck stays Fury 12 / Calm 0 (nothing is deleted)
