## ADDED Requirements

### Requirement: Header brand is named BandleBox
The header brand SHALL display the name "BandleBox" on every page, at every screen width, and SHALL link home. The browser tab title of every page SHALL identify the app as BandleBox.

#### Scenario: Brand text on desktop and phone
- **WHEN** any page is opened at desktop or phone width
- **THEN** the header brand reads "BandleBox" and no "Riftbound" or "Deck Manager" wordmark text appears in it

#### Scenario: Home link and tab title
- **WHEN** a user activates the brand, or looks at the browser tab of any page
- **THEN** the brand leads to the home page, and the tab title ends with or equals "BandleBox"

### Requirement: Current page is marked with a discreet gold leaf
The navigation entry for the current page SHALL carry a small gold leaf marker: slender, with a visible midrib and short stem, drawn in the app's gold token and without a glow or halo. Entries that are not current SHALL show no marker.

#### Scenario: Marker on the active entry only
- **WHEN** the user is on the deck library, deck manager, or card grid
- **THEN** only the corresponding entry shows the gold leaf beside its label

#### Scenario: Marker stays quiet
- **WHEN** the marker is viewed next to the link label
- **THEN** it is no taller than the label's text line, and does not outshine the label or the brand
