// scripts/verify-card-text.mjs — checks the card-text tokenizer and renderer.
//
// The modules under src/lib are plain TypeScript with no Vite-only imports, so
// Node's type stripping can load them directly. Run with:
//   node scripts/verify-card-text.mjs
//
// The snapshot sweep only runs when data/catalog.json exists.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const { tokenizeCardText, renderCardTextHtml, renderKeywordHtml } = await import('../src/lib/card-text.ts');
const { keywordChipStyle, KNOWN_KEYWORDS } = await import('../src/lib/keyword-styles.ts');

let checks = 0;

function check(name, fn) {
	fn();
	checks += 1;
	console.log(`ok ${checks} - ${name}`);
}

const withGlyphs = (name) => `/assets/${name}.svg`;

check('nested glyphs stay inside their keyword label', () => {
	const tokens = tokenizeCardText('[Empower :rb_energy_3: :rb_rune_rainbow:]');
	assert.equal(tokens.length, 1);
	const [keyword] = tokens;
	assert.equal(keyword.type, 'keyword');
	assert.equal(keyword.name, 'Empower');
	assert.deepEqual(
		keyword.children.map((t) => (t.type === 'glyph' ? `glyph:${t.name}` : t.type)),
		['text', 'glyph:energy_3', 'text', 'glyph:rune_rainbow'],
	);
});

check('shape markers fold into neighbours and never render as labels', () => {
	const tokens = tokenizeCardText('[Empowered][>][>>][Deathknell][>]');
	assert.equal(tokens.length, 2);
	assert.equal(tokens[0].type, 'keyword');
	assert.equal(tokens[0].pointedRight, true);
	assert.equal(tokens[1].pointedLeft, true);
	assert.equal(tokens[1].pointedRight, true);
	const html = renderCardTextHtml('[Empowered][>][>>][Deathknell][>]');
	assert.ok(html.includes('data-points="right"'));
	assert.ok(html.includes('data-points="both"'));
	assert.ok(!html.includes('&gt;'), 'a marker leaked as text');
});

check('italic reminders and bare parens render italic', () => {
	const html = renderCardTextHtml('_(Play on your turn.)_ Then (reminder).');
	assert.ok(html.includes('<em>'));
	assert.ok(html.includes('Play on your turn.'));
	assert.ok(html.includes('(reminder)'));
	assert.ok(!html.includes('_('), 'underscores leaked');
});

check('newlines become visible breaks', () => {
	const html = renderCardTextHtml('Line one.\nLine two.');
	assert.ok(html.includes('<br>'));
	assert.ok(!html.includes('\n'));
});

check('unknown keyword gets the neutral label', () => {
	const html = renderCardTextHtml('[Blorp] a unit.');
	assert.ok(html.includes('--kw-color:#707070'));
	assert.ok(html.includes('>Blorp<'));
});

check('unknown glyph degrades to readable text', () => {
	const html = renderCardTextHtml(':rb_wobble:');
	assert.ok(html.includes('kw-glyph-text'));
	assert.ok(html.includes('wobble'));
});

check('missing glyph URL degrades to readable text', () => {
	const html = renderCardTextHtml(':rb_might:', { resolveGlyph: () => undefined });
	assert.ok(html.includes('>might<'));
	assert.ok(!html.includes('<img'));
});

check('resolved glyph renders an accessible image', () => {
	const html = renderCardTextHtml(':rb_rune_fury:', { resolveGlyph: withGlyphs });
	assert.ok(html.includes('src="/assets/rune_fury.svg"'));
	assert.ok(html.includes('alt="fury rune"'));
});

check('energy renders as a labelled disc', () => {
	const html = renderCardTextHtml(':rb_energy_2:');
	assert.ok(html.includes('class="kw-energy"'));
	assert.ok(html.includes('aria-label="2 energy"'));
	assert.ok(html.includes('>2<'));
});

check('text and attributes are escaped', () => {
	const html = renderCardTextHtml('a <script>alert("x")</script> & b');
	assert.ok(!html.includes('<script>'));
	assert.ok(html.includes('&lt;script&gt;'));
	assert.ok(html.includes('&amp;'));
	assert.ok(html.includes('&quot;x&quot;'));
});

check('keyword summary labels match the palette', () => {
	assert.equal(keywordChipStyle('Reaction').color, '#24705f');
	assert.equal(keywordChipStyle('Assault 3').color, '#cd346f');
	assert.equal(keywordChipStyle('Deathknell').ink, '#0b0e12');
	assert.equal(keywordChipStyle('Blorp').color, '#707070');
	const html = renderKeywordHtml('Predict');
	assert.ok(html.includes('data-points') === false);
	assert.ok(html.includes('>Predict<'));
});

check('palette covers every keyword used in the snapshot', () => {
	if (!existsSync('data/catalog.json')) {
		console.log('   (skipped: data/catalog.json not present)');
		return;
	}
	const snapshot = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
	const texts = [];
	for (const printing of Object.values(snapshot.printings)) {
		for (const key of ['printedRulesText', 'printedEffectText', 'flavorText']) {
			if (printing[key]) texts.push(printing[key]);
		}
	}
	const used = new Set();
	const walk = (tokens) => {
		for (const token of tokens) {
			if (token.type === 'keyword') {
				assert.notEqual(token.name, '>');
				assert.notEqual(token.name, '>>');
				used.add(token.name.replace(/\s+\d+$/u, ''));
				walk(token.children);
			} else if (token.type === 'paren' || token.type === 'italic') {
				walk(token.children);
			}
		}
	};
	for (const text of texts) {
		walk(tokenizeCardText(text));
		assert.ok(renderCardTextHtml(text, { resolveGlyph: withGlyphs }).length > 0);
	}
	const missing = [...used].filter((name) => !KNOWN_KEYWORDS.includes(name));
	assert.deepEqual(missing, [], `palette is missing: ${missing.join(', ')}`);
	console.log(`   (${texts.length} texts, ${used.size} distinct keywords)`);
});

console.log(`\nAll ${checks} checks passed.`);
