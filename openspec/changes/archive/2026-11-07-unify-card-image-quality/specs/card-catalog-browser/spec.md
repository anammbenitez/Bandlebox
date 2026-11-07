# Spec Delta

## MODIFIED Requirements

### Requirement: Card art loads remotely without mirroring

The app SHALL display card images by loading them from OpenRift's media paths at a size suited to where they appear: the largest available variant as the main image on a card's detail page, loaded immediately, and a smaller variant for every other card image, lazily per visible card. It MUST NOT download, store, or serve card image files in bulk locally.

#### Scenario: Images appear without blocking browsing

- **WHEN** the grid or a detail page loads, with or without image connectivity
- **THEN** card data renders immediately and grid image requests are lazily issued per visible card, so browsing never waits on art

#### Scenario: Detail page shows the sharpest available art

- **WHEN** a card's detail page loads with image connectivity
- **THEN** its main image is the largest variant OpenRift offers (`full`), requested immediately rather than deferred until scrolled into view

#### Scenario: Detail art degrades gracefully

- **WHEN** the largest variant fails to load on a detail page
- **THEN** the mid-size variant is tried next, and if that also fails the "no art" placeholder remains visible without a broken-image icon

#### Scenario: Detail art does not shift the layout

- **WHEN** the detail page main image loads
- **THEN** its slot already reserves the card's aspect ratio (portrait for most cards, landscape for battlefields), so surrounding content does not move

## ADDED Requirements

### Requirement: Card art resolution follows display size

Every card image the app shows SHALL be requested at the smallest OpenRift variant that stays sharp at its displayed size: the mid-size variant (`400w`) for card faces and tiles, the small variant (`240w`) only for small thumbnails, and the largest (`full`) for the detail hero. A failed variant SHALL degrade one step to a smaller one and finally to the surface's no-art state, never a broken-image icon.

#### Scenario: Grid tiles use the mid-size variant

- **WHEN** the card grid renders tiles at roughly 200-230 CSS px wide
- **THEN** each tile's art is the mid-size variant (`400w`), not the small one

#### Scenario: Deck manager faces use the mid-size variant

- **WHEN** the deck manager shows card faces in its card browser or deck viewer (Legend, Champion, battlefields, main/rune/side faces)
- **THEN** each face's art is the mid-size variant

#### Scenario: Small thumbnails keep the small variant

- **WHEN** a surface shows many small images, such as the Legend picker in the new-deck modal or the printings list on a card's detail page
- **THEN** those images use the small variant (`240w`), since a larger file would add weight without a visible gain

#### Scenario: Any surface degrades the same way

- **WHEN** an image's preferred variant fails to load on any surface
- **THEN** the next smaller variant is tried, and when none remain the image element is removed so the surface's existing placeholder shows, without a broken-image icon

#### Scenario: Weight stays proportionate

- **WHEN** a page with many cards loads
- **THEN** only images near the viewport are requested at the larger variant, and the card data payload does not carry a prebuilt URL per image variant
