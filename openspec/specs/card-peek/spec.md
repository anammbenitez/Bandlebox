# card-peek Specification

## Purpose

Gives the deck manager a quick, readable look at any card's facts (what it costs, its domains and what it says) without leaving the deck: a non-modal peek that appears only when the user has paused on a card, stays out of the way of clicking, dragging and scrolling, and can be reached to open the card's own page.

## Requirements

### Requirement: A card face opens a peek after the pointer rests on it

The deck manager SHALL show a card peek beside any card face (browser tiles, and the Legend, Champion, battlefield, main, rune and side faces in the deck viewer) once the pointer has rested on that face for a short dwell, about half a second. Before the dwell elapses, nothing appears.

#### Scenario: Resting on a browser card

- **WHEN** the pointer settles on a card in the card browser and stays there for the dwell
- **THEN** the card's peek appears beside it

#### Scenario: Resting on a deck card

- **WHEN** the pointer settles on a card face in any deck section for the dwell
- **THEN** that card's peek appears beside it

#### Scenario: Passing over cards shows nothing

- **WHEN** the pointer sweeps across several cards without pausing
- **THEN** no peek appears for any of them

### Requirement: Pointer movement restarts the dwell

While a dwell is pending, pointer movement of more than a few pixels SHALL restart it, so the peek opens only once the pointer has come to rest. Once open, the peek SHALL stay while the pointer remains on the same face or on the peek itself, and SHALL close a short moment after the pointer has left both, a grace that lets the pointer cross the gap from the face onto the peek.

#### Scenario: Drifting delays the peek

- **WHEN** the pointer keeps moving across a card face for longer than the dwell
- **THEN** no peek appears until the pointer then rests for a full dwell

#### Scenario: Small tremor does not cancel

- **WHEN** the pointer rests on a face with only a slight hand tremor
- **THEN** the dwell is not restarted and the peek opens on time

#### Scenario: Leaving closes the peek

- **WHEN** the pointer leaves a face whose peek is open and goes to neither the peek nor back to the face
- **THEN** the peek closes after the short grace

#### Scenario: Moving onto the peek

- **WHEN** the pointer leaves a face whose peek is open and arrives on the peek within the grace
- **THEN** the peek stays open for as long as the pointer is on it

#### Scenario: Moving off the peek

- **WHEN** the pointer leaves the peek for somewhere that is neither the peek nor its face
- **THEN** the peek closes after the same short grace, and moving back onto the face or the peek within it keeps the peek open

#### Scenario: Moving to another card

- **WHEN** the pointer moves from one card with an open peek onto a neighbouring card
- **THEN** the first peek closes at once, without waiting out the grace, and the neighbour's peek opens only after its own full dwell

### Requirement: A click, press or drag on a card blocks its peek

A pointer press, click, or drag start on a card face SHALL cancel a pending dwell and close an open peek. That card SHALL show no peek again until the pointer has left it, even if the pointer then rests on it.

#### Scenario: Clicking a browser card to add it

- **WHEN** the user clicks a browser card to add it and the pointer stays still on it
- **THEN** the peek does not appear, and an open peek has closed on the press

#### Scenario: Dragging a card

- **WHEN** the user starts dragging a card face
- **THEN** any pending or open peek is cancelled and none shows during the drag

#### Scenario: Re-entering after a click

- **WHEN** the user clicked a card, moved the pointer off it, then rests on it again
- **THEN** the peek opens after the dwell as usual

### Requirement: Scrolling blocks the peek until the pointer moves

Any scroll of the card browser, the deck viewer, or the page SHALL cancel a pending dwell and close an open peek. Afterwards, no peek SHALL appear while the pointer stays still; it becomes available again once the pointer moves and then rests. A scroll that only brings a keyboard-focused card into view does not cancel that card's focus dwell.

#### Scenario: Scrolling the grid under a resting pointer

- **WHEN** the user scrolls the card browser with the wheel while the pointer stays put, so different cards pass under it
- **THEN** no peek appears for any card that slides under the pointer

#### Scenario: Open peek closes on scroll

- **WHEN** a peek is open and the user scrolls the column it belongs to
- **THEN** the peek closes at once

#### Scenario: Resuming after a scroll

- **WHEN** the user finishes scrolling, moves the pointer, and rests on a card
- **THEN** that card's peek opens after the dwell

#### Scenario: Focus scrolls a card into view

- **WHEN** the user tabs to a card whose controls start below the fold, the browser scrolls it into view, and the user then pauses
- **THEN** the peek still opens after the dwell, though the user's own mouse wheel would have cancelled it

### Requirement: Typing, Escape and window changes close the peek

Any key press SHALL cancel a pending dwell and close an open peek, with the peek staying blocked until the pointer next moves; Escape closes it. The peek SHALL also close when the window loses focus or the page is hidden, and when the deck changes.

#### Scenario: Typing in the search box

- **WHEN** a peek is open and the user types in the browser's search box
- **THEN** the peek closes and does not return while the pointer stays still

#### Scenario: Escape

- **WHEN** a peek is open and the user presses Escape
- **THEN** the peek closes

#### Scenario: Switching away

- **WHEN** the user switches to another window or tab while a peek is open
- **THEN** the peek is gone when they return

#### Scenario: Deck changes underneath

- **WHEN** the deck changes while a peek is open, by any means
- **THEN** the peek closes, since the faces it points at are rebuilt and must not reopen under a resting pointer

### Requirement: Copy controls and touch input do not open a peek

The peek SHALL NOT open while the pointer rests on a face's copy controls (the minus and plus steppers and the count chip), since the user is about to click them. Touch input SHALL never open it.

#### Scenario: Resting on a stepper

- **WHEN** the pointer rests on a card's plus or minus control for longer than the dwell
- **THEN** no peek appears

#### Scenario: Moving from the stepper to the art

- **WHEN** the pointer moves from a stepper onto the card art and rests
- **THEN** the peek opens after the dwell

#### Scenario: Touch tap

- **WHEN** a card is touched on a touch screen
- **THEN** no peek opens and the tap behaves as before

### Requirement: Keyboard focus opens the same peek

Moving keyboard focus onto a card face (its link or its copy controls) SHALL open its peek after the dwell, provided no further key is pressed in that time. Pressing Escape, moving focus away, or pressing another key SHALL close it.

#### Scenario: Tabbing to a card and pausing

- **WHEN** the user tabs onto a card face and presses nothing for the dwell
- **THEN** the peek opens

#### Scenario: Tabbing through quickly

- **WHEN** the user tabs across several card faces in quick succession
- **THEN** no peek opens for faces focus only passed through

#### Scenario: Focus moves away

- **WHEN** a peek opened by focus is open and focus moves to another control
- **THEN** the peek closes

### Requirement: The peek presents a card's facts

The peek SHALL show the card's name, with the card's domains as emblems in the top-right corner of that same line; a type line; a cost row giving Energy, Power and Might, each figure the card has with its game symbol; and the card's printed description. It SHALL be set at a size comfortable to read at a glance: no text smaller than a reading size, and game symbols and domain emblems clearly larger than inline text. Every card's name and its emblems SHALL fit on one line at the peek's width.

#### Scenario: A unit with all three stats

- **WHEN** the peek opens on Ahri, Alluring
- **THEN** it shows the name with the calm emblem at the right end of its line, the champion unit type line, Energy 5, Power 1 and Might 4, and the text "When I hold, you score 1 point."

#### Scenario: A spell has no Might

- **WHEN** the peek opens on a spell
- **THEN** its Energy shows, its Power shows only if the spell has one, and its Might place shows a dash

#### Scenario: A card without a cost

- **WHEN** the peek opens on a Legend, battlefield or rune
- **THEN** the cost row is still drawn with a dash in each of its three places, and the name, type line, domains and text are shown

#### Scenario: A card without rules text

- **WHEN** a card has no printed rules or effect text
- **THEN** the peek omits the text section rather than showing an empty block

### Requirement: Every card is laid out in the same order, in the same places

The peek SHALL use one layout for every card, whatever its type, so a player learns where to look. Top to bottom: the card's name, with the domain emblems at the right end of that line (the top-right corner); the type line, with the ban marker at the right end of that line; the cost row; the description. The cost row SHALL always have three places in a fixed order from left to right, Energy, then Power, then Might, each starting at the same position on every card; a place the card has no figure for SHALL keep its label and show a dash, never be left out or closed up. The description SHALL come last and only it may be absent, so that nothing above it moves with the card's type.

#### Scenario: Different card types, same places

- **WHEN** the peek opens on a unit, then a spell, a Legend, a battlefield and a rune
- **THEN** the name, the type line, the domains, the Energy, Power and Might places and the start of the description are each at the same position in every one of them

#### Scenario: A figure the card lacks

- **WHEN** the peek opens on a card with Energy and Might but no Power
- **THEN** the Power place shows a dash between them, and Might stays where it is on a card that has all three

#### Scenario: No description

- **WHEN** the peek opens on a card with no printed text
- **THEN** the name, type line and cost row are where they are on every other card, and nothing is drawn below them

### Requirement: Domains show as their emblems, never as a color

Each of a card's domains SHALL appear in the peek as that domain's emblem (the image OpenRift draws for it), in the top-right corner on the same line as the card's name, with the domain's name as the emblem's text alternative for assistive technology. This covers all eight domains the catalog lists, including Neutral and Colorless, which have no rune. The peek SHALL NOT use a colored dot or any hue of its own to stand for a domain. A domain whose emblem is not available locally SHALL still show its name, as text in the same place.

#### Scenario: A card of two domains

- **WHEN** the peek opens on a card of the calm and mind domains
- **THEN** the calm emblem and the mind emblem appear side by side at the right end of the name line, and no colored dot appears

#### Scenario: Colorless and neutral

- **WHEN** the peek opens on a Colorless battlefield or the Neutral champion
- **THEN** it shows that domain's own emblem in the same corner

#### Scenario: An emblem is missing

- **WHEN** a domain's emblem has not been cached
- **THEN** that domain shows as its name alone in the corner, with no broken image

### Requirement: The description is the card's printed text

The peek's description SHALL be the card's printed effect text and printed rules text, rendered with the same keyword labels, symbols and italics as the card detail page. Keywords SHALL appear only where that text prints them, as labels inside the text. The peek SHALL NOT list a card's keywords as a separate row of labels, because the card itself does not.

#### Scenario: Keywords print inside the text

- **WHEN** the peek opens on Abandon
- **THEN** the Reaction and Predict labels appear inside its description, in the order the card prints them, and nowhere else in the peek

#### Scenario: A keyword the card does not print

- **WHEN** a card's data lists a keyword but the card prints no text containing it
- **THEN** the peek shows no label for it

### Requirement: The peek marks a banned card

The peek SHALL show a "Banned" marker at the right end of the card's type line when the card is banned in Constructed, using the same decision as the legality checklist, and assistive technology SHALL hear it as "Banned in Constructed". A card that is not banned SHALL show no marker.

#### Scenario: A banned card

- **WHEN** the peek opens on a card banned in Constructed
- **THEN** a ban marker appears at the right end of the card's type line

#### Scenario: An ordinary card

- **WHEN** the peek opens on a card that is not banned
- **THEN** no ban marker appears

### Requirement: The peek describes the card, not the deck

The peek SHALL show only facts that belong to the card. It SHALL NOT show whether the card fits the Legend's colors, whether a champion tag matches, how many copies the deck holds, or the card's copy limit; the deck sheet and its legality checklist already carry those.

#### Scenario: A card in the deck

- **WHEN** the peek opens on a card the deck already holds
- **THEN** it shows the same facts as for a card the deck does not hold

#### Scenario: No Legend yet

- **WHEN** the peek opens in a deck with no Legend placed
- **THEN** it shows the same facts as with a Legend, and nothing is marked pending or wrong

### Requirement: The peek never gets in the way

The peek SHALL be non-modal: no backdrop and no focus capture. It takes pointer input only while it is open, and only so that it can stay open under the pointer and be clicked; while it is closed, clicks and drags pass through where it will be. It SHALL sit beside the card face without covering that face, with no gap on the way to it that would close the peek, flip to the other side when there is no room, and stay fully inside the visible window. It SHALL also appear for shared, read-only decks.

#### Scenario: A press outside the peek

- **WHEN** a peek is open and the user presses on, or starts dragging, anything outside it
- **THEN** the action reaches that control and the peek closes by the press rule

#### Scenario: A press on the peek

- **WHEN** the user presses on the peek, including its "See more" link
- **THEN** the peek stays open until the link is followed, and the press does not count as a click on any card beneath it

#### Scenario: The gap between face and peek

- **WHEN** the pointer crosses the space between a card face and its peek
- **THEN** it is never over some other card while it does, so the peek does not close on the way

#### Scenario: Edge of the window

- **WHEN** a peek would not fit beside a face near the right or bottom edge of the window
- **THEN** it opens on the other side or shifts up so it remains fully visible

#### Scenario: The face stays visible

- **WHEN** a peek is open
- **THEN** the card face it describes is never covered by it

#### Scenario: Shared deck

- **WHEN** a shared deck is open in read-only view and the pointer rests on a card
- **THEN** the peek opens as it does for the user's own decks

### Requirement: The peek leads to the card's page, and back to the deck

The peek SHALL end with a "See more" link, last in the peek, styled as navigation (a row along the foot of the card, with an arrow at its far end, not a button plate), that opens the card's own page (`/cards/{slug}`). The link SHALL carry the address of the deck being built, so the card page can send the reader back to that deck. The card page's back link SHALL then read "Back to deck" and return to the deck manager with the same deck open, whether it is one of the user's own decks or a shared one. When the page before the card page in that tab is the deck manager, the back link SHALL use the browser's own back, so the deck comes back as it was left.

#### Scenario: Following See more

- **WHEN** the user moves onto a peek and clicks "See more"
- **THEN** the card's page opens, and its back link reads "Back to deck"

#### Scenario: Going back to the deck

- **WHEN** the user clicks "Back to deck" on that card page
- **THEN** the deck manager opens with the same deck, and no extra history entry is left behind

#### Scenario: A shared deck

- **WHEN** the deck being built is a shared, read-only deck and the user follows See more and then Back to deck
- **THEN** the same shared deck is open again

#### Scenario: A card page opened some other way

- **WHEN** a card page is opened with no return address, or with an address that is not the deck manager's
- **THEN** its back link keeps its default and returns to the card grid

#### Scenario: A link opened in a new tab

- **WHEN** the See more link is opened in a new tab and the user clicks Back to deck there
- **THEN** the deck manager opens with the deck in that tab

### Requirement: Card faces carry no competing native tooltip

Card faces in the deck manager SHALL NOT show the browser's own tooltip over the face art, so the peek is the only hover popup on a face. The copy controls MAY keep their own tooltips.

#### Scenario: One popup at a time

- **WHEN** the pointer rests on a card face for several seconds
- **THEN** only the peek appears, with no browser tooltip alongside it

### Requirement: The peek respects reduced motion

The peek SHALL appear and disappear with at most a short fade and lift, and SHALL appear instantly with no movement when the user prefers reduced motion.

#### Scenario: Reduced motion preferred

- **WHEN** the user's system asks for reduced motion and a peek opens
- **THEN** it appears at once without animation

### Requirement: The peek works offline and fails quietly

The peek SHALL be built entirely from local build output, with no request to any outside service. If a card's facts cannot be loaded, that card SHALL simply show no peek, and clicking, dragging, copy controls and links on it SHALL behave exactly as before.

#### Scenario: Offline after a refresh

- **WHEN** the deck manager is used offline after a completed refresh
- **THEN** peeks open normally, since only card art ever contacts OpenRift

#### Scenario: A card's facts are unavailable

- **WHEN** a card's facts fail to load
- **THEN** that card shows no peek, no error appears, and the card stays fully usable
