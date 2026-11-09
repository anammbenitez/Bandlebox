// Card-text rendering assertions, moved from the ported card-text tests (task
// 8.4) when the HTML renderer (renderCardTextHtml) was retired: the same
// assertions now run against the React CardText molecule's markup.
import { it } from 'vitest';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tokenizeCardText } from '../../domain/card-text.ts';
import { keywordChipStyle } from '../../domain/keyword-styles.ts';
import { CardTextContent, KeywordChip } from './CardText.tsx';

const check = (name, fn) => it(name, fn);
const withGlyphs = (name) => `/assets/${name}.svg`;

const renderCardTextHtml = (text, options) => renderToStaticMarkup(createElement(CardTextContent, { text, ...options }));
const renderKeywordHtml = (name, options) => renderToStaticMarkup(createElement(KeywordChip, { name, ...options }));

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
	assert.ok(html.includes('<br'));
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

