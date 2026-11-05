# catalog-snapshot Specification

## Purpose

Maintains the local OpenRift catalog snapshot and the derived card/printing/set index that the whole application reads. Owns how remote catalog data is acquired, refreshed cheaply, and kept strictly separate from any app-owned data.

## Requirements

### Requirement: Snapshot fetch acquires the English catalog

The refresh process SHALL fetch the OpenRift catalog with `?langs=EN` and write the response to the local snapshot file (`catalog.json`) on disk. It SHALL store the response's ETag alongside the snapshot.

#### Scenario: First refresh

- **WHEN** the refresh process runs and no snapshot file exists
- **THEN** the catalog is fetched with `?langs=EN` and written fully to disk, and the response's ETag is persisted so the next run can conditionally revalidate

#### Scenario: Refresh presents a proper identity

- **WHEN** the refresh process contacts the OpenRift API
- **THEN** the request carries a User-Agent identifying the project name and a contact method, so breaking-change warnings can reach the project

### Requirement: Refresh revalidates conditionally

The refresh process SHALL send the stored ETag as `If-None-Match` on repeated runs, so an unchanged catalog returns an empty `304 Not Modified`. On `304` the existing snapshot MUST be left intact. On new content the snapshot and its ETag MUST be replaced.

#### Scenario: Catalog unchanged

- **WHEN** the refresh process runs with a stored ETag and the server answers `304 Not Modified`
- **THEN** no new catalog body is downloaded, the existing snapshot file is untouched, and the result reports the snapshot is up to date

#### Scenario: Catalog changed

- **WHEN** the refresh process runs with a stored ETag and the server answers with a new catalog body
- **THEN** the snapshot file and stored ETag are replaced with the new response

### Requirement: Derived index maps cards, printings and sets

The refresh process SHALL also emit a derived index next to the snapshot that relates the three levels: each card (by `cardId` and slug) to its printings (by `printingId`), and each printing to its set (by set slug and `setId`). The index MUST key on `cardId` and `printingId` so later app features can reference exact printings.

#### Scenario: Index covers the snapshot

- **WHEN** a refresh completes successfully
- **THEN** the derived index reflects every card and printing in the snapshot, including each printing's set, language, rarity, and image references

### Requirement: Refresh never touches app-owned data

The refresh process MUST only replace OpenRift-owned data (the snapshot, the glyph cache, and files derived directly from the snapshot). It MUST NOT delete, overwrite, or restructure any other local data, reserved for later app features such as collections and decks.

#### Scenario: Refresh alongside app data

- **WHEN** the snapshot is replaced by a refresh
- **THEN** no file outside the snapshot, its derived index, and the glyph cache is created, modified, or deleted

### Requirement: Refresh caches the glyph artwork that card text needs

The refresh process SHALL acquire the glyph artwork used by card text into a local cache alongside the catalog snapshot, and SHALL ensure the cache is complete even when the catalog itself is unchanged. Failure to acquire glyph artwork MUST NOT prevent the catalog snapshot from being updated.

#### Scenario: First refresh populates the glyph cache

- **WHEN** the refresh process completes successfully on a machine with no glyph cache
- **THEN** the glyph files needed to render card text are present in the local cache

#### Scenario: Unchanged catalog still fills a missing cache

- **WHEN** the catalog request returns `304 Not Modified` but the glyph cache is missing or incomplete
- **THEN** the glyph cache is populated without replacing the existing snapshot

#### Scenario: Glyph acquisition fails

- **WHEN** the glyph artwork cannot be downloaded but the catalog can
- **THEN** the refresh still reports success for the snapshot, and the app renders card text without glyphs rather than failing
