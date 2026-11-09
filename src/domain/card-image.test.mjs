// Ported from scripts/verify-card-image.mjs (openspec change migrate-to-react, task 3.2).
// Assertions are kept verbatim; only the harness moved to Vitest. Task 3.5
// replaced the inline onerror handler with data-fallback + the page behavior
// (src/behaviors/image-fallback.ts); those checks now drive the real behavior.
import { it } from 'vitest';
import assert from 'node:assert/strict';

import { installImageFallback } from '../behaviors/image-fallback.ts';
import { OPENRIFT_SITE, ROLE_CHAIN, imageDims, imageSources, imageUrl, imgAttrs } from './card-image.ts';

const ID = '03678a34-c684-4954-a811-e8462ab2a281';

const check = (name, fn) => it(name, fn);

installImageFallback(document);

/** A real <img> carrying the attributes, failed one load at a time the way the
 *  browser would (the page behavior listens for the error). */
function stubImg(attrs) {
	const el = document.createElement('img');
	el.setAttribute('src', attrs.src);
	el.setAttribute('data-fallback', attrs.fallback);
	document.body.append(el);
	return {
		el,
		get removed() {
			return !el.isConnected;
		},
		fail() {
			el.dispatchEvent(new Event('error'));
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
	// and the fallback list built from it keeps one URL per space-separated entry
	const list = imgAttrs(`a"b'c<d>`, 'hero').fallback.split(' ');
	assert.equal(list.length, 2);
	for (const entry of list) assert.ok(!/["'<>\s]/.test(entry), entry);
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

check('hero fallback degrades full -> 400w -> 240w -> removed', () => {
	const img = stubImg(imgAttrs(ID, 'hero'));
	img.fail();
	assert.equal(img.el.getAttribute('src'), imageUrl(ID, '400w'));
	assert.equal(img.removed, false);
	img.fail();
	assert.equal(img.el.getAttribute('src'), imageUrl(ID, '240w'));
	assert.equal(img.removed, false);
	img.fail();
	assert.equal(img.removed, true, 'chain exhausted removes the element');
});

check('tile fallback degrades 400w -> 240w -> removed', () => {
	const img = stubImg(imgAttrs(ID, 'tile'));
	img.fail();
	assert.equal(img.el.getAttribute('src'), imageUrl(ID, '240w'));
	assert.equal(img.removed, false);
	img.fail();
	assert.equal(img.removed, true);
});

check('thumb fallback removes immediately (nothing smaller exists)', () => {
	const attrs = imgAttrs(ID, 'thumb');
	assert.equal(attrs.fallback, '');
	const img = stubImg(attrs);
	img.fail();
	assert.equal(img.removed, true);
});

check('fallback list is safe inside a double-quoted HTML attribute', () => {
	for (const role of ['hero', 'tile', 'thumb']) {
		assert.ok(!imgAttrs(ID, role).fallback.includes('"'), role);
	}
});
