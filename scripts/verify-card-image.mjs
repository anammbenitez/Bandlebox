// scripts/verify-card-image.mjs — checks the shared card-image module
// (URL scheme, per-role variant chains, dimensions, fallback handler) and
// the markup built on it.
//
// src/lib modules are plain TypeScript with no Vite-only imports, so Node's
// type stripping can load them directly. Run with:
//   node scripts/verify-card-image.mjs

import assert from 'node:assert/strict';

const { OPENRIFT_SITE, ROLE_CHAIN, fallbackHandler, imageDims, imageSources, imageUrl, imgAttrs } = await import(
	'../src/lib/card-image.ts'
);

const ID = '03678a34-c684-4954-a811-e8462ab2a281';

let checks = 0;

function check(name, fn) {
	fn();
	checks += 1;
	console.log(`ok ${checks} - ${name}`);
}

/** Run the generated inline handler against a stub element, like the browser would. */
function stubImg(src) {
	const el = {
		src,
		dataset: {},
		removed: false,
		remove() {
			this.removed = true;
		},
	};
	return {
		el,
		/** Fire the element's `onerror` once. */
		fail(handler) {
			new Function(handler).call(el);
		},
	};
}

check('URL scheme matches OpenRift media paths', () => {
	assert.equal(imageUrl(ID, '240w'), `${OPENRIFT_SITE}/media/cards/${ID}-240w.webp`);
	assert.equal(imageUrl(ID, '400w'), `${OPENRIFT_SITE}/media/cards/${ID}-400w.webp`);
	assert.equal(imageUrl(ID, 'full'), `${OPENRIFT_SITE}/media/cards/${ID}-full.webp`);
	assert.equal(imageUrl(ID), imageUrl(ID, '240w'), 'default variant is the small one');
});

check('image ids are percent-encoded so they cannot break the markup', () => {
	const url = imageUrl(`a"b'c<d>`, '400w');
	assert.ok(!/["'<>\s]/.test(url), url);
	// and the handler built from it keeps exactly one quoted URL per entry
	assert.ok(!imgAttrs(`a"b'c<d>`, 'hero').onerror.includes('"'));
});

check('each role lists its variants best first', () => {
	assert.deepEqual(ROLE_CHAIN.hero, ['full', '400w', '240w']);
	assert.deepEqual(ROLE_CHAIN.tile, ['400w', '240w']);
	assert.deepEqual(ROLE_CHAIN.thumb, ['240w']);
	assert.deepEqual(imageSources(ID, 'tile'), [imageUrl(ID, '400w'), imageUrl(ID, '240w')]);
	assert.equal(imageSources(ID, 'hero')[0], imageUrl(ID, 'full'));
});

check('dimensions are the measured intrinsic sizes and swap for battlefields', () => {
	assert.deepEqual(imageDims('thumb'), { width: 240, height: 335 });
	assert.deepEqual(imageDims('tile'), { width: 400, height: 559 });
	assert.deepEqual(imageDims('hero'), { width: 744, height: 1039 });
	assert.deepEqual(imageDims('hero', true), { width: 1039, height: 744 });
	assert.deepEqual(imageDims('tile', true), { width: 559, height: 400 });
});

check('imgAttrs picks the role variant for src and its dimensions', () => {
	const tile = imgAttrs(ID, 'tile');
	assert.equal(tile.src, imageUrl(ID, '400w'));
	assert.equal(tile.width, 400);
	assert.equal(tile.height, 559);
	const rotated = imgAttrs(ID, 'tile', { rotate: true });
	assert.equal(rotated.width, 559);
	assert.equal(rotated.height, 400);
	assert.equal(imgAttrs(ID, 'hero').src, imageUrl(ID, 'full'));
	assert.equal(imgAttrs(ID, 'thumb').src, imageUrl(ID, '240w'));
});

check('hero handler degrades full -> 400w -> 240w -> removed', () => {
	const attrs = imgAttrs(ID, 'hero');
	const { el, fail } = stubImg(attrs.src);
	fail(attrs.onerror);
	assert.equal(el.src, imageUrl(ID, '400w'));
	assert.equal(el.removed, false);
	fail(attrs.onerror);
	assert.equal(el.src, imageUrl(ID, '240w'));
	assert.equal(el.removed, false);
	fail(attrs.onerror);
	assert.equal(el.removed, true, 'chain exhausted removes the element');
});

check('tile handler degrades 400w -> 240w -> removed', () => {
	const attrs = imgAttrs(ID, 'tile');
	const { el, fail } = stubImg(attrs.src);
	fail(attrs.onerror);
	assert.equal(el.src, imageUrl(ID, '240w'));
	assert.equal(el.removed, false);
	fail(attrs.onerror);
	assert.equal(el.removed, true);
});

check('thumb handler removes immediately (nothing smaller exists)', () => {
	const attrs = imgAttrs(ID, 'thumb');
	assert.equal(attrs.onerror, 'this.remove()');
	const { el, fail } = stubImg(attrs.src);
	fail(attrs.onerror);
	assert.equal(el.removed, true);
});

check('handler is safe inside a double-quoted HTML attribute', () => {
	for (const role of ['hero', 'tile', 'thumb']) {
		assert.ok(!imgAttrs(ID, role).onerror.includes('"'), role);
	}
	assert.equal(fallbackHandler([]), 'this.remove()');
});

// --- grid item markup (shared by SSR and client reveals) --------------------

const { gridItemHtml } = await import('../src/lib/grid-item.ts');

const unescapeAttr = (text) =>
	text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const gridItem = (art) => gridItemHtml({ slug: 'abandon', name: 'Abandon', meta: 'uncommon · spell', art });

check('grid tiles use the tile variant with its true dimensions', () => {
	const html = gridItem({ imageId: ID, rotate: false, setSlug: 'UNL' });
	assert.ok(html.includes(`src="${imageUrl(ID, '400w')}"`), html);
	assert.ok(html.includes('width="400" height="559"'));
	assert.ok(!html.includes('240w"'), 'only the fallback handler may mention 240w');
});

check('rotated (battlefield) grid tiles swap dimensions and keep the rotate classes', () => {
	const html = gridItem({ imageId: ID, rotate: true, setSlug: 'UNL' });
	assert.ok(html.includes('width="559" height="400"'));
	assert.ok(html.includes('rotate-90'));
});

check('grid tile onerror survives HTML escaping and still degrades then removes', () => {
	const html = gridItem({ imageId: ID, rotate: false, setSlug: 'UNL' });
	const attr = html.match(/onerror="([^"]*)"/)[1];
	assert.ok(!attr.includes('<') && !attr.includes("'"), 'attribute value is HTML-escaped');
	const handler = unescapeAttr(attr);
	const { el, fail } = stubImg(imageUrl(ID, '400w'));
	fail(handler);
	assert.equal(el.src, imageUrl(ID, '240w'));
	fail(handler);
	assert.equal(el.removed, true);
});

check('cards without art render the placeholder only', () => {
	const html = gridItem(null);
	assert.ok(!html.includes('<img'));
	assert.ok(html.includes('no art'));
});

console.log(`\nAll ${checks} checks passed.`);
