# Spec Delta

## Purpose

Gives the deck manager a quick, readable look at any card's deck-building facts without leaving the deck: a non-modal peek that appears only when the user has paused on a card, and stays out of the way of clicking, dragging and scrolling.

## ADDED Requirements

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

While a dwell is pending, pointer movement of more than a few pixels SHALL restart it, so the peek opens only once the pointer has come to rest. Once open, the peek SHALL stay while the pointer remains on the same face, and SHALL close when the pointer leaves it.

#### Scenario: Drifting delays the peek

- **WHEN** the pointer keeps moving across a card face for longer than the dwell
- **THEN** no peek appears until the pointer then rests for a full dwell

#### Scenario: Small tremor does not cancel

- **WHEN** the pointer rests on a face with only a slight hand tremor
- **THEN** the dwell is not restarted and the peek opens on time

#### Scenario: Leaving closes the peek

- **WHEN** the pointer leaves a face whose peek is open
- **THEN** the peek closes

#### Scenario: Moving to another card

- **WHEN** the pointer moves from one card with an open peek onto a neighbouring card
- **THEN** the first peek closes and the neighbour's peek opens only after its own full dwell

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
- **THEN** the peek closes, so it never shows stale copy counts

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

The peek SHALL show the card's name, type line and domains; a cost row giving whichever of Energy, Power and Might the card has, each with its game symbol; its keywords; and its printed rules and effect text. It SHALL be set at a size comfortable to read, not a reduced copy of the card face.

#### Scenario: A unit with all three stats

- **WHEN** the peek opens on Ahri, Alluring
- **THEN** it shows the name, the champion unit type with the calm domain, Energy 5, Power 1 and Might 4, and the text "When I hold, you score 1 point."

#### Scenario: A spell has no Might

- **WHEN** the peek opens on a spell
- **THEN** its cost row shows Energy, and Power only if the spell has one, with no Might entry

#### Scenario: A card without a cost

- **WHEN** the peek opens on a Legend, battlefield or rune
- **THEN** no cost row appears and the name, type line, domains and text are shown

#### Scenario: A card without rules text

- **WHEN** a card has no printed rules or effect text
- **THEN** the peek omits the text section rather than showing an empty block

### Requirement: The peek reports colors and champion fit for this deck

The peek SHALL state, for the open deck, whether the card fits the Legend's colors, using the same decision as the legality checklist: it fits, it is outside the Legend's colors (naming them), or it is pending while no Legend is placed. A champion unit SHALL also state whether its tag matches the Legend's champion tag.

#### Scenario: A card inside the Legend's colors

- **WHEN** the peek opens on a fury card in a deck led by a fury and chaos Legend
- **THEN** it says the card fits the Legend's colors

#### Scenario: A card outside the Legend's colors

- **WHEN** the peek opens on a calm card in that same deck
- **THEN** it says the card is outside the Legend's colors and names fury and chaos

#### Scenario: A neutral card

- **WHEN** the peek opens on a neutral-domain card
- **THEN** it says the card fits, as neutral cards fit every deck

#### Scenario: No Legend yet

- **WHEN** the peek opens in a deck with no Legend placed
- **THEN** the color line says it depends on choosing a Legend, and nothing is marked wrong

#### Scenario: Champion tag

- **WHEN** the peek opens on a champion unit
- **THEN** it says whether the unit's tag matches the Legend's champion tag, and non-champion cards show no tag line

#### Scenario: Battlefields have no color rule

- **WHEN** the peek opens on a battlefield
- **THEN** no color verdict is shown, since battlefields are any color

### Requirement: The peek reports copies held and bans

The peek SHALL show how many copies of the card the deck already holds in each section it appears in, against that card's copy limit, and SHALL carry a clear warning when the card is banned in Constructed.

#### Scenario: Copies against the limit

- **WHEN** the peek opens on a card with two copies in the main deck
- **THEN** it shows two held in the main deck against the card's limit of three

#### Scenario: A card not in the deck

- **WHEN** the peek opens on a card with no copies in the deck
- **THEN** it says the card is not in the deck and still shows the limit

#### Scenario: A card with its own limit

- **WHEN** the peek opens on a card whose copy limit differs from the standard three
- **THEN** the peek shows that card's own limit

#### Scenario: A banned card

- **WHEN** the peek opens on a card banned in Constructed
- **THEN** it shows a ban warning, and a card that is not banned shows none

### Requirement: The peek never gets in the way

The peek SHALL be non-modal: no backdrop, no focus capture, and no pointer input of its own, so clicks and drags pass through it. It SHALL sit beside the card face without covering that face, flip to the other side when there is no room, and stay fully inside the visible window. It SHALL also appear for shared, read-only decks.

#### Scenario: Clicks pass through

- **WHEN** a peek is open and the user clicks or drags toward something it overlaps
- **THEN** the action reaches the control underneath and the peek closes by the press rule

#### Scenario: Edge of the window

- **WHEN** a peek would not fit beside a face near the right or bottom edge of the window
- **THEN** it opens on the other side or shifts up so it remains fully visible

#### Scenario: The face stays visible

- **WHEN** a peek is open
- **THEN** the card face it describes is never covered by it

#### Scenario: Shared deck

- **WHEN** a shared deck is open in read-only view and the pointer rests on a card
- **THEN** the peek opens as it does for the user's own decks

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
