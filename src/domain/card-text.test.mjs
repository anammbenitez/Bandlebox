// Ported from scripts/verify-card-text.mjs (openspec change migrate-to-react, task 3.3).
// Assertions are kept verbatim; only the harness moved to Vitest.
import { it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { tokenizeCardText } from './card-text.ts';
import { KNOWN_KEYWORDS } from './keyword-styles.ts';

// scripts/verify-card-text.mjs — checks the card-text tokenizer and renderer.
//
// The modules under src/lib are plain TypeScript with no Vite-only imports, so
// Node's type stripping can load them directly. Run with:
//   node scripts/verify-card-text.mjs
//
// The snapshot sweep only runs when data/catalog.json exists.



const check = (name, fn) => it(name, fn);


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
		assert.ok(tokenizeCardText(text).length > 0);
	}
	const missing = [...used].filter((name) => !KNOWN_KEYWORDS.includes(name));
	assert.deepEqual(missing, [], `palette is missing: ${missing.join(', ')}`);
	console.log(`   (${texts.length} texts, ${used.size} distinct keywords)`);
});

