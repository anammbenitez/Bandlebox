# Spec Delta

## ADDED Requirements

### Requirement: Painted bough is a corner accent

The deck manager's painted bough frame SHALL appear only at the four corners of the card browser and deck viewer panels. Each corner SHALL keep its painted elbow at full strength and fade its arms smoothly to transparent before the midpoint of the adjacent edge, so the middle of every top, bottom, and side edge is bare. No continuous edge run, repeating vine, seeded cutting, or full inner border SHALL be rendered.

#### Scenario: Corner-only at desktop width

- **WHEN** the deck manager renders its two-column layout at a large-screen width
- **THEN** painted wood appears only at the four corners of each panel, and the middle of the top, bottom, and side edges is bare

#### Scenario: Each arm fades before the edge midpoint

- **WHEN** a corner's painted arm runs toward the middle of its edge
- **THEN** it fades smoothly to transparent before the edge's midpoint, with no hard cut end and no repeated vine continuing the line

#### Scenario: Tall panels do not grow a side border

- **WHEN** a panel is taller than its painted corners, as when the deck viewer holds a full deck or the browser fills the screen
- **THEN** the corners stay at the top and bottom, and the middle of each side stays bare rather than repeating a vine down the panel

#### Scenario: Stacked layout keeps the corner treatment

- **WHEN** the deck manager stacks the browser and deck viewer below the large-screen breakpoint
- **THEN** each panel still shows only its four fading corners, with no continuous top run or canopy drawn in place of the frame

#### Scenario: The frame never covers working content

- **WHEN** the browser filters, card impressions, deck ledger, sections, or controls render near a corner
- **THEN** no painted wood covers them or takes their pointer input, and the panel's content inset keeps the working area clear
