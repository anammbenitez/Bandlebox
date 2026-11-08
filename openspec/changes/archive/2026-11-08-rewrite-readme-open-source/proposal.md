# Proposal

## Why

BandleBox is going open source, and the README is the first thing a stranger reads. Today it is a stale data-acquisition note: it still calls the app "a small vanilla-TS island for client-side grid filtering" and lists two routes. It says nothing about the deck builder, the legality rules engine, stateless share links, the card peek, card-text rendering, the verification scripts, or the OpenSpec workflow, which together are most of what the project is. It also says nothing about what a contributor may and may not do with Riot Games / OpenRift content, and the repository has no license.

A visitor should be able to learn in a few minutes what the app is for, how its rules logic works, how to run it, how to change it safely, and what the legal edges are. The README should also carry the project's character (a Bandle City woodland desk at dusk) without hiding the facts.

## What Changes

- Rewrite `README.md` end to end. It keeps the project's voice but every claim in it is checked against the code or an existing spec; nothing is invented.
  - **Pitch and character**: a short in-world opening (the Bandlewood, the lantern-lit desk) followed at once by what the app plainly does.
  - **Feature tour** of what ships: the filterable card grid with windowed scroll and URL-restored state, per-card pages with every printing, formatted card text with glyphs, the deck manager (drag and click to add, section filters, rune-ratio entry, champion zone, hover peek), the deck library, and share links.
  - **The rules are the product**: the constructed rules the checker enforces (1 Legend, 40-card main deck, 12-card rune deck, 3 distinct battlefields, side deck up to 10, 3 copies per card name with snapshot overrides, domain identity with the neutral exception, a champion unit matching the Legend's tag, the signature cap, Constructed bans, cards must resolve in the snapshot), the pass / fail / pending model, and the rule that a deck is legal only when every check passes. It names the one place to change a limit (`DECK_RULES` in `src/lib/deck.ts`).
  - **How it works**: snapshot → build-time pages → JSON islands → vanilla TypeScript; the refresh pipeline (ETag revalidation, validate before writing, atomic writes, previous snapshot kept on failure); the share-link format (`#s/` + `d` deflate or `b` plain + base64url over compact JSON); and the browser library (one versioned `localStorage` entry with an in-memory fallback and a one-shot warning).
  - **Quick start and commands**: Node version, `npm install`, `npm run refresh` before the first `dev` or `build`, and the four `verify-*` scripts, with what each covers.
  - **Project map and contributing**: a layout of `src/lib` (pure, Node-verifiable modules) versus `src/scripts` (DOM glue), the design constraints (tokens not hex, the bough as a corner accent only), and the OpenSpec propose / apply / archive workflow with pointers to `openspec/specs/`.
  - **Principles and non-goals**: no backend, offline browsing as the baseline, nothing to sign up for.
  - **Data ownership and legal**: card data, art and glyphs belong to OpenRift and Riot Games; the repository never contains them; `data/` is git-ignored; a deployed build embeds card text, so hosting one publicly is the host's responsibility; the project is unofficial and not endorsed by either owner.
  - **License**: MIT for BandleBox's own code, stated as covering the code only and not Riot / OpenRift content.
- Add a `LICENSE` file (MIT) so the README's license section is true.
- Set `"license": "MIT"` in `package.json` so package metadata matches.

Out of scope: any change to application behavior, rules, styles or tests; screenshots or demo GIFs (none exist, and none are fabricated); a separate `CONTRIBUTING.md` or code of conduct; CI configuration; a hosted demo or a deployment guide; badges for services the project does not use.

## Capabilities

### New Capabilities

None. A README describes behavior that specs already own; it does not introduce any.

### Modified Capabilities

None. No requirement changes, so this change declares `skip_specs: true` in `.openspec.yaml` instead of inventing a requirement. The existing capability specs under `openspec/specs/` stay the source of truth, and the README links to them.

## Impact

- `README.md`: rewritten.
- `LICENSE`: new file.
- `package.json`: one new metadata field, `license`. No dependency or script changes.
- No source, style, data, or test changes; `npm run build` output is unaffected.
- Follow-ups surfaced but not done here (see design.md): the placeholder contact in `scripts/refresh.mjs`'s User-Agent, and the glyph `NOTICE.md` wording ("if this project is ever published, revisit the asset source").
