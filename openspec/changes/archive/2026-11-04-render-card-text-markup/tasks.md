# Tasks

## 1. Card-text tokenizer and renderer

- [x] 1.1 Port the markup grammar into `src/lib/card-text.ts` as `tokenizeCardText`, producing `text | glyph | keyword | paren | italic | newline` tokens with `pointedRight`/`pointedLeft` on keywords; verify the tokenizer against the real snapshot with a throwaway Node run that reports unknown token shapes instead of crashing.
- [x] 1.2 Add `renderCardTextHtml` in the same module: escape text nodes, emit keyword labels, glyphs, energy discs, italics, line breaks, and pointed edges; verify escaping by rendering a text containing `<`, `&`, and quotes and confirming the output is inert.
- [x] 1.3 Add `scripts/verify-card-text.mjs` covering nested glyphs inside a label (`[Empower :rb_energy_3: :rb_rune_rainbow:]`), chained markers (`[Empowered][>][>>][Deathknell][>]`), italic reminders, parens, newlines, unknown keyword, unknown glyph, and missing glyph URL; verify with `node scripts/verify-card-text.mjs` passing.

## 2. Keyword palette

- [x] 2.1 Create `src/lib/keyword-styles.ts` with the 34 keyword color/darkText entries, base-name lookup that strips a trailing number, and the neutral fallback style; verify `Assault 3` resolves to the `Assault` color and an unknown keyword resolves to the fallback.
- [x] 2.2 Extend `scripts/verify-card-text.mjs` with assertions for base-name lookup, `darkText` keywords, and the fallback; verify the script still exits clean.

## 3. Glyph acquisition

- [x] 3.1 Extend `scripts/refresh.mjs` to download the nine text glyphs into `data/glyphs/` (atomic writes, same User-Agent), run it on a `304` catalog response too, and treat glyph failure as a warning that does not fail the refresh; verify by deleting `data/glyphs/` and running `npm run refresh` against an unchanged catalog.
- [x] 3.2 Add `data/glyphs/` to `.gitignore`, and write `data/glyphs/NOTICE.md` recording that the files come from OpenRift's glyph paths and are Riot-owned; verify `git status` stays clean after a refresh and that the notice sits beside the cached files.
- [x] 3.3 Update `README.md`'s data-directory section to describe the glyph cache and that it is fetched by refresh and never committed; verify the documented commands and paths match what refresh actually writes.

## 4. Glyph resolution and styles

- [x] 4.1 Create `src/lib/glyphs.ts` resolving glyph names to build-time asset URLs via `import.meta.glob('../../data/glyphs/*.svg', { eager: true, query: '?url', import: 'default' })`, returning `undefined` for unknown or missing files; verify by resolving `might`, `rune_rainbow`, and a made-up name.
- [x] 4.2 Add the chip, pointed-edge, glyph, and energy-disc styles to `src/styles/global.css` under `@layer components`, driven by `--kw-color`/`--kw-ink`; verify the styles render a chip, a both-pointed chip, and the energy disc at body-text size without baseline drift.
- [x] 4.3 Document the keyword-chip convention (color is data, not decoration) in `DESIGN.md`; verify it sits with the existing domain-color rule.

## 5. Card detail page integration

- [x] 5.1 Replace the three raw text paragraphs in `src/pages/cards/[slug].astro` with the renderer for printed effect text, printed rules text, and flavor text, keeping the existing typography and 70ch cap; verify `Abandon` (`UNL-131`) shows the Reaction label and italic reminder with no markup characters.
- [x] 5.2 Render errata corrected rules/effect text through the same renderer; verify a card with errata shows formatted text inside the errata callout.
- [x] 5.3 Render the keyword summary row as the same labels, and give the Energy/Might/Power stats their glyph and disc treatment; verify the summary colors match the same keywords in the text.
- [x] 5.4 Correct the footer wording in `src/layouts/Base.astro` so it says card images are not mirrored while symbols are cached locally; verify the footer text on any page.

## 6. Integration verification

- [x] 6.1 Run `npm run build` and confirm the static detail pages contain formatted text and locally emitted glyph assets, with no client JavaScript added; verify with `npm run preview` on one card.
- [x] 6.2 Check the ten longest card texts from the snapshot plus a card with several keywords; verify chips stay readable, wrap without overlap, and no page shows raw markup.
- [x] 6.3 Open a card detail page with JavaScript disabled and confirm formatted text, glyph alt names, and energy labels are all present; verify the page reads correctly in the browser's reader mode or accessibility tree.

## Workflow follow-up

- Archive the change after review and a green build.
- Verify the archived result adds the delta requirements to the main specs.
