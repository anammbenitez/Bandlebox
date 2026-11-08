# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Riftbound trading-card players: deck builders and catalog browsers who arrive on their own, often without being sent a link. They are typically at a desk mid-task — checking whether a card fits a deck, scanning a set for options, validating a list before a game, or showing a finished deck to a playgroup.

## Product Purpose

Make the whole English Riftbound card pool readable and searchable in one place, and turn that pool into a deck that can be checked and shared. Success is a player who can read any card's text and printings without leaving the app, build a deck against the real constructed rules, see immediately whether it is legal, and hand that list to someone else.

## Positioning

A complete catalog *and* a rules-aware deck builder in one static, local-first app. Browsing needs no network, deck state needs no account, and a shared deck travels inside the URL rather than through a server. Card-database sites can render cards; deck sites can count copies; this is the combination without a backend, a login, or a sync story.

## Operating Context

- A catalog snapshot is fetched from the OpenRift API by one refresh command and read locally from that point on.
- Card data, set pages, filters, and deck building work with no network; only card art is fetched remotely.
- Building happens across many short sittings: decks are saved locally and reopened rather than built in one session.
- Comparing and discussing happens off-app: a deck is sent as a link and opened by someone else.
- Rules change as new sets release, so the snapshot and the legality rules are things that get updated, not fixed facts.

## Capabilities and Constraints

Confirmed:

- Browseable, filterable card grid over the full English catalog (type, rarity, set, free text), with windowed infinite scroll and URL-restored state.
- Set index and per-set card pages; one page per card listing all its printings.
- Deck builder with domain/rune-ratio guidance, per-section copy limits, and a legality checker that reports each check (legal / illegal / pending).
- Deck library persisted in the browser, restored on return.
- Stateless deck share links encoded in the URL.
- Static output: no server state, no accounts, no database.
- Catalog data and art belong to OpenRift / Riot Games; attribution and links back are required, and the app must not claim official affiliation.
- Card art stays remote and lazily loaded; it is never mirrored into the repository.
- The committed catalog snapshot is not part of the repo; the app reads it from the local data directory.

Undecided:

- Hosting. Future work must stay portable — assume neither a fixed public domain nor guaranteed localhost, and take nothing that depends on a specific host.

## Brand Commitments

- The product name, "BandleBox", is fixed.
- Third-party ownership is non-negotiable: catalog data and images belong to OpenRift / Riot Games, attributed in the interface, with card names linking back. No wording may imply endorsement or official status.

## Evidence on Hand

- `README.md` — the public overview: what the app does, the deck rules table, quick start and commands, how refresh, share links and the deck library work, the project map, contributing, data ownership, license.
- `openspec/specs/` — confirmed behavioral specifications for catalog browsing, snapshot refresh, deck legality, deck library, deck manager, and site navigation.
- `openspec/changes/archive/` — the design record of how each surface reached its current behavior.
- `data/catalog.json`, `data/index.json` — real catalog and derived index, generated locally, intentionally uncommitted.

Absences future work must not fabricate: there are no users' testimonials, no usage metrics, no pricing, no partnership, and no editorial card commentary.

## Product Principles

1. **No backend, ever.** Every feature must work as static files plus browser storage. A feature that needs a server is a different product.
2. **Offline browsing is the baseline.** The catalog must stay readable from the local snapshot; network is an enhancement for art, never a requirement for data.
3. **The rules are the product.** A count, a domain requirement, or a legality verdict is only useful if it is correct and current; closeness is failure.
4. **Nothing to sign up for.** State lives in the browser and in the URL, so a visitor can arrive, build, and share without an account or a recovery story.
5. **The cards are the only ornament.** The catalog and art carry the visual interest; interface chrome stays out of the way of reading cards and judging a deck.

## Accessibility & Inclusion

Keyboard-operable throughout, with a skip link as the first focus stop, a single visible focus treatment, and contrast held at readable levels on every surface. Motion is limited and respects a reduced-motion preference.
