# Spec Delta

## MODIFIED Requirements

### Requirement: Card art loads remotely without mirroring

The app SHALL display card images by loading them from OpenRift's media paths at appropriate sizes: smaller variants in the grid, lazily per visible card, and the largest available variant as the main image on a card's detail page, loaded immediately. It MUST NOT download, store, or serve card image files in bulk locally.

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
