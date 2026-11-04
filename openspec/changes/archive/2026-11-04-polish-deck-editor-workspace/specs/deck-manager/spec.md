# Spec Delta

## ADDED Requirements

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
