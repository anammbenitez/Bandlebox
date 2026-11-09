// Grid tile markup checks, moved from the ported card-image and card-tilt
// tests (task 6.2) when the HTML builder (gridItemHtml) was retired: the same
// assertions now run against what the React CardTile renders in its list item.
import { it } from 'vitest';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { installImageFallback } from '../../behaviors/image-fallback.ts';
import { imageUrl } from '../../domain/card-image.ts';
import { CardTile } from './CardTile.tsx';

const check = (name, fn) => it(name, fn);
const ID = '03678a34-c684-4954-a811-e8462ab2a281';

/** The grid tile as the grid renders it. */
const gridItemHtml = (item) => renderToStaticMarkup(createElement('li', { 'data-slug': item.slug }, createElement(CardTile, item)));

installImageFallback(document);

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

// --- grid item markup (shared by SSR and client reveals) --------------------

const unescapeAttr = (text) =>
	text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const gridItem = (art) => gridItemHtml({ slug: 'abandon', name: 'Abandon', meta: 'uncommon · spell', art });

check('grid tiles use the tile variant with its true dimensions', () => {
	const html = gridItem({ imageId: ID, rotate: false, setSlug: 'UNL' });
	assert.ok(html.includes(`src="${imageUrl(ID, '400w')}"`), html);
	assert.ok(html.includes('width="400" height="559"'));
	assert.ok(!html.includes('src="' + imageUrl(ID, '240w')), 'only the fallback list may mention 240w');
});

check('rotated (battlefield) grid tiles swap dimensions and keep the rotate classes', () => {
	const html = gridItem({ imageId: ID, rotate: true, setSlug: 'UNL' });
	assert.ok(html.includes('width="559" height="400"'));
	assert.ok(html.includes('rotate-90'));
});

check('grid tile fallback survives HTML escaping and still degrades then removes', () => {
	const html = gridItem({ imageId: ID, rotate: false, setSlug: 'UNL' });
	const attr = html.match(/data-fallback="([^"]*)"/)[1];
	assert.ok(!attr.includes('<') && !attr.includes("'"), 'attribute value is HTML-escaped');
	const img = stubImg({ src: imageUrl(ID, '400w'), fallback: unescapeAttr(attr) });
	img.fail();
	assert.equal(img.el.getAttribute('src'), imageUrl(ID, '240w'));
	img.fail();
	assert.equal(img.removed, true);
});

check('cards without art render the placeholder only', () => {
	const html = gridItem(null);
	assert.ok(!html.includes('<img'));
	assert.ok(html.includes('no art'));
});


/* --- the markup the controller finds ---------------------------------------- */


check('a grid tile is a stage with its card art as the face (and the label stays outside it)', () => {
	const html = gridItemHtml({
		slug: 'abandon',
		name: 'Abandon',
		meta: 'uncommon · spell',
		art: { imageId: 'abc', rotate: false, setSlug: 'UNL' },
	});
	const stage = html.indexOf('data-tilt');
	const face = html.indexOf('data-tilt-face');
	assert.ok(stage > -1 && face > stage, 'the stage opens before its face');
	assert.equal(html.match(/data-tilt(?!-)/g).length, 1, 'exactly one stage');
	assert.equal(html.match(/data-tilt-face/g).length, 1, 'exactly one face');
	const box = document.createElement('div');
	box.innerHTML = html;
	const faceEl = box.querySelector('[data-tilt-face]');
	const nameEl = [...box.querySelectorAll('div')].find((el) => el.textContent === 'Abandon');
	assert.ok(nameEl && !faceEl.contains(nameEl), 'the name is not part of the face');
});

check('a tile with no art still has a stage and face, so it behaves like its neighbours', () => {
	const html = gridItemHtml({ slug: 'x', name: 'X', meta: 'm', art: null });
	assert.ok(html.includes('data-tilt') && html.includes('data-tilt-face'));
});

