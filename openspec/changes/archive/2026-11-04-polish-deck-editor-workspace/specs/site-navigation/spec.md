# Spec Delta

## Purpose

Owns the app-wide top navigation shell: what it contains for system behavior purposes and how it behaves while the page scrolls, independent of any single feature page.

## ADDED Requirements

### Requirement: Main navigation stays fixed on scroll
The app's header navigation SHALL stay fixed in place while the page scrolls, on every page of the app, with page content laid out so the fixed bar does not permanently cover or hide content underneath it.

#### Scenario: Long page keeps the nav visible
- **WHEN** a user scrolls down any page with content taller than the screen
- **THEN** the header navigation remains visible at the top, and its links stay usable without scrolling back up

#### Scenario: Content is not hidden under the bar
- **WHEN** any page loads or the user scrolls to its top
- **THEN** the topmost content of the page sits below the fixed navigation and nothing becomes permanently unreachable beneath it
