// scripts/verify-card-peek.mjs — checks the deck manager card peek's pure
// modules: the deck-fit facts (src/lib/deck-fit.ts) and the dwell / stillness
// state machine (src/lib/hover-intent.ts).
//
// src/lib modules are plain TypeScript with no Vite-only imports, so Node's
// type stripping can load them directly, and the deck-fit cases run against the
// real catalog snapshot. Run with:
//   node scripts/verify-card-peek.mjs

import assert from 'node:assert/strict';

import indexData from '../data/index.json' with { type: 'json' };
import snapshotData from '../data/catalog.json' with { type: 'json' };

const { buildDeckRuleIndexes } = await import('../src/lib/deck-rules.ts');
const { deckFit } = await import('../src/lib/deck-fit.ts');
const { DWELL_MS, TOLERANCE_PX, createHoverIntent, faceKey, parseFaceKey } = await import('../src/lib/hover-intent.ts');

let checks = 0;

function check(name, fn) {
	fn();
	checks += 1;
	console.log(`ok ${checks} - ${name}`);
}

/* --- deck fit (spec: card-peek, colors / champion / copies / bans) ---------- */

const idx = buildDeckRuleIndexes(snapshotData, indexData);
const slugOf = (name) => {
	const card = indexData.cards.find((c) => c.name === name);
	assert.ok(card, `fixture card not found: ${name}`);
	return card.slug;
};

const LEGEND = slugOf('Nine-Tailed Fox'); // calm + mind, champion tag Ahri
const AHRI = slugOf('Ahri, Alluring'); // calm champion unit, tag Ahri
const NEEKO = slugOf('Neeko, Blending In'); // neutral domain
assert.deepEqual(idx.cards[LEGEND].domains.slice().sort(), ['calm', 'mind'], 'fixture Legend colors');
assert.ok(idx.cards[NEEKO].domains.includes('neutral'), 'fixture neutral card');

const firstWhere = (test) => {
	const found = Object.entries(idx.cards).find(([, info]) => test(info));
	assert.ok(found, 'fixture search found nothing');
	return found[0];
};
const FURY_UNIT = firstWhere((i) => i.types.includes('unit') && i.domains.length === 1 && i.domains[0] === 'fury');
const OTHER_CHAMPION = firstWhere(
	(i) => i.types.includes('unit') && i.superTypes.includes('champion') && !i.tags.includes('Ahri'),
);
const SPELL = firstWhere((i) => i.types.includes('spell') && i.domains.includes('calm') && !i.maxCopiesOverride);
const BATTLEFIELD = firstWhere((i) => i.types.includes('battlefield'));
const RUNE = firstWhere((i) => i.types.includes('rune'));
const BANNED = firstWhere((i) => i.banned);
const LOWERED = firstWhere((i) => i.maxCopiesOverride != null);

const deckWith = (extra = {}) => ({
	id: 'fixture',
	name: 'Fixture',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	schemaVersion: 1,
	legend: [{ card: LEGEND, qty: 1 }],
	battlefields: [],
	main: [],
	rune: [],
	side: [],
	...extra,
});

check('a card inside the Legend colors fits', () => {
	assert.deepEqual(deckFit(AHRI, deckWith(), idx).color, { state: 'fits' });
});

check('a fury card under a calm/mind Legend is off-color and names the Legend colors', () => {
	const fit = deckFit(FURY_UNIT, deckWith(), idx);
	assert.equal(fit.color.state, 'off');
	assert.deepEqual(fit.color.legendColors.slice().sort(), ['calm', 'mind']);
});

check('a neutral card fits every Legend', () => {
	assert.deepEqual(deckFit(NEEKO, deckWith(), idx).color, { state: 'fits' });
});

check('without a Legend the color line is pending, never wrong', () => {
	const fit = deckFit(FURY_UNIT, deckWith({ legend: [] }), idx);
	assert.deepEqual(fit.color, { state: 'pending' });
	assert.deepEqual(deckFit(AHRI, deckWith({ legend: [] }), idx).champion, { state: 'pending' });
});

check('battlefields and Legends carry no color verdict', () => {
	assert.deepEqual(deckFit(BATTLEFIELD, deckWith(), idx).color, { state: 'n/a' });
	assert.deepEqual(deckFit(LEGEND, deckWith(), idx).color, { state: 'n/a' });
});

check('a champion unit whose tag matches the Legend says so', () => {
	assert.deepEqual(deckFit(AHRI, deckWith(), idx).champion, { state: 'match', tag: 'Ahri' });
});

check('a champion unit with another tag is a mismatch that names the Legend tag', () => {
	assert.deepEqual(deckFit(OTHER_CHAMPION, deckWith(), idx).champion, { state: 'mismatch', tag: 'Ahri' });
});

check('non-champion cards show no tag line', () => {
	assert.deepEqual(deckFit(SPELL, deckWith(), idx).champion, { state: 'n/a' });
	assert.deepEqual(deckFit(FURY_UNIT, deckWith(), idx).champion.state === 'n/a', !idx.cards[FURY_UNIT].superTypes.includes('champion'));
});

check('copies held are listed per section against the standard limit of three', () => {
	const fit = deckFit(SPELL, deckWith({ main: [{ card: SPELL, qty: 2 }], side: [{ card: SPELL, qty: 1 }] }), idx);
	assert.deepEqual(fit.held, [
		{ section: 'main', qty: 2 },
		{ section: 'side', qty: 1 },
	]);
	assert.equal(fit.limit, 3);
});

check('a card not in the deck holds nothing and still reports its limit', () => {
	const fit = deckFit(SPELL, deckWith(), idx);
	assert.deepEqual(fit.held, []);
	assert.equal(fit.limit, 3);
});

check("a card with its own limit reports that limit", () => {
	assert.equal(deckFit(LOWERED, deckWith(), idx).limit, idx.cards[LOWERED].maxCopiesOverride);
	assert.notEqual(idx.cards[LOWERED].maxCopiesOverride, 3, 'fixture really differs from the standard cap');
});

check('Legends and battlefields cap at one, runes are uncapped', () => {
	assert.equal(deckFit(LEGEND, deckWith(), idx).limit, 1);
	assert.equal(deckFit(BATTLEFIELD, deckWith(), idx).limit, 1);
	assert.equal(deckFit(RUNE, deckWith(), idx).limit, null);
});

check('a banned card is flagged and an ordinary card is not', () => {
	assert.equal(deckFit(BANNED, deckWith(), idx).banned, true);
	assert.equal(deckFit(SPELL, deckWith(), idx).banned, false);
});

check('an unknown slug is reported as unknown without throwing, and still lists its copies', () => {
	const fit = deckFit('ghost-card', deckWith({ side: [{ card: 'ghost-card', qty: 2 }] }), idx);
	assert.equal(fit.known, false);
	assert.deepEqual(fit.held, [{ section: 'side', qty: 2 }]);
});

check('a missing deck reads as an empty deck', () => {
	const fit = deckFit(AHRI, null, idx);
	assert.equal(fit.known, true);
	assert.deepEqual(fit.color, { state: 'pending' });
	assert.deepEqual(fit.held, []);
});

/* --- the words under the facts (spec: card-peek, colors / copies / bans) ----- */

const { fitLines } = await import('../src/lib/deck-fit.ts');
const domainName = (slug) => slug.charAt(0).toUpperCase() + slug.slice(1);
const linesFor = (slug, deck) => fitLines(deckFit(slug, deck, idx), { domain: domainName });
const textsOf = (lines) => lines.map((l) => l.text);

check('fit lines: inside the Legend colors says so', () => {
	assert.ok(textsOf(linesFor(AHRI, deckWith())).includes("Fits your Legend's colors"));
	assert.equal(linesFor(AHRI, deckWith()).find((l) => l.text.startsWith('Fits')).tone, 'good');
});

check('fit lines: outside the Legend colors names them', () => {
	const line = linesFor(FURY_UNIT, deckWith()).find((l) => l.text.startsWith('Outside'));
	assert.ok(line, 'has an outside-colors line');
	assert.equal(line.tone, 'bad');
	assert.match(line.text, /Calm and Mind|Mind and Calm/);
});

check('fit lines: no Legend defers the color verdict and marks nothing wrong', () => {
	const lines = linesFor(FURY_UNIT, deckWith({ legend: [] }));
	assert.ok(lines.some((l) => /depend on your Legend/.test(l.text)));
	assert.ok(lines.every((l) => l.tone !== 'bad'), 'nothing is marked wrong');
});

check('fit lines: champion tag matches, mismatches, or is absent for other cards', () => {
	assert.ok(textsOf(linesFor(AHRI, deckWith())).includes('Champion tag Ahri matches your Legend'));
	assert.ok(textsOf(linesFor(OTHER_CHAMPION, deckWith())).some((t) => /Does not share your Legend's champion tag \(Ahri\)/.test(t)));
	assert.ok(!textsOf(linesFor(SPELL, deckWith())).some((t) => /[Cc]hampion/.test(t)), 'a spell has no tag line');
});

check('fit lines: copies held against the limit, in the section names players see', () => {
	const lines = linesFor(SPELL, deckWith({ main: [{ card: SPELL, qty: 2 }] }));
	assert.equal(lines.at(-1).text, '2 in Main deck · limit 3');
	assert.equal(lines.at(-1).tone, 'muted');
});

check('fit lines: a card not in the deck still shows its limit', () => {
	assert.equal(linesFor(SPELL, deckWith()).at(-1).text, 'Not in the deck · limit 3');
	assert.equal(linesFor(RUNE, deckWith()).at(-1).text, 'Not in the deck · no copy limit');
});

check('fit lines: a card over its own limit is marked bad', () => {
	const over = idx.cards[LOWERED].maxCopiesOverride + 1;
	const lines = linesFor(LOWERED, deckWith({ main: [{ card: LOWERED, qty: over }] }));
	assert.equal(lines.at(-1).tone, 'bad');
});

check('fit lines: a ban comes first, and only banned cards carry it', () => {
	assert.deepEqual(linesFor(BANNED, deckWith())[0], { tone: 'bad', text: 'Banned in Constructed' });
	assert.ok(!textsOf(linesFor(SPELL, deckWith())).some((t) => /Banned/.test(t)));
});

check('fit lines: an unknown card says so and prints no copy line', () => {
	const lines = fitLines(deckFit('ghost-card', deckWith(), idx));
	assert.equal(lines.length, 1);
	assert.match(lines[0].text, /Not in this snapshot/);
});

/* --- dwell and stillness (spec: card-peek, design.md D2) -------------------- */

/** A hover-intent machine on a fake clock; `events` records opens and closes. */
function harness() {
	let now = 0;
	let nextId = 1;
	const timers = new Map();
	const events = [];
	const intent = createHoverIntent({
		onOpen: (key, source) => events.push(['open', key, source]),
		onClose: (key) => events.push(['close', key]),
		setTimer: (fn, ms) => {
			const id = nextId++;
			timers.set(id, { at: now + ms, fn });
			return id;
		},
		clearTimer: (id) => timers.delete(id),
	});
	/** Move the clock forward, firing timers in order. */
	function advance(ms) {
		const end = now + ms;
		for (;;) {
			const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
			if (!due) break;
			now = due[1].at;
			timers.delete(due[0]);
			due[1].fn();
		}
		now = end;
	}
	return { intent, advance, events, timers };
}

const A = faceKey('browser', 'ahri-alluring');
const B = faceKey('browser', 'fox-fire');
const C = faceKey('main', 'fox-fire');
const opened = (h) => h.events.filter((e) => e[0] === 'open').map((e) => e[1]);

check('face keys round-trip zone and slug', () => {
	assert.deepEqual(parseFaceKey(faceKey('main', 'ahri-alluring')), { zone: 'main', slug: 'ahri-alluring' });
	assert.notEqual(faceKey('browser', 'x'), faceKey('main', 'x'), 'the same card in two zones is two faces');
});

check('a peek opens only once the dwell has fully elapsed', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS - 1);
	assert.deepEqual(h.events, []);
	h.advance(1);
	assert.deepEqual(h.events, [['open', A, 'pointer']]);
	assert.equal(h.intent.openKey(), A);
});

check('sweeping across faces without pausing opens nothing', () => {
	const h = harness();
	let x = 100;
	for (const key of [A, B, C, A, B, C]) {
		h.intent.point(key, x, 100);
		x += 40;
		h.advance(DWELL_MS / 3);
	}
	assert.deepEqual(h.events, []);
});

check('drifting more than the tolerance restarts the dwell', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(300);
	h.intent.point(A, 100 + TOLERANCE_PX + 6, 100);
	h.advance(300); // 600 ms since the first point, 300 since the restart
	assert.deepEqual(h.events, []);
	h.advance(200);
	assert.deepEqual(opened(h), [A]);
});

check('a slight tremor within the tolerance does not restart the dwell', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(300);
	h.intent.point(A, 100 + TOLERANCE_PX - 1, 100);
	h.advance(200);
	assert.deepEqual(opened(h), [A], 'opened on the original schedule');
});

check('slow drift in small steps cannot creep past the tolerance', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(200);
	h.intent.point(A, 103, 100); // 3 px from the anchor: tremor
	h.advance(200);
	h.intent.point(A, 106, 100); // 6 px from the anchor: restart
	h.advance(DWELL_MS - 1);
	assert.deepEqual(h.events, []);
	h.advance(1);
	assert.deepEqual(opened(h), [A]);
});

check('repeated same-coordinate events (synthetic moves) never restart the dwell', () => {
	const h = harness();
	for (let i = 0; i < 5; i++) {
		h.intent.point(A, 100, 100);
		h.advance(DWELL_MS / 5);
	}
	assert.deepEqual(opened(h), [A]);
});

check('an open peek stays while the pointer moves within the same face, and closes on leaving', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	h.intent.point(A, 160, 140);
	assert.equal(h.intent.openKey(), A);
	h.intent.point(null, 400, 400);
	assert.deepEqual(h.events, [['open', A, 'pointer'], ['close', A]]);
	assert.equal(h.intent.openKey(), null);
});

check('moving to a neighbouring face closes the first peek and the neighbour waits its own dwell', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	h.intent.point(B, 200, 100);
	assert.deepEqual(h.events, [['open', A, 'pointer'], ['close', A]]);
	h.advance(DWELL_MS - 1);
	assert.deepEqual(opened(h), [A]);
	h.advance(1);
	assert.deepEqual(opened(h), [A, B]);
});

check('a press or drag start before the dwell cancels it and blocks the face until the pointer leaves', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(200);
	h.intent.press(A); // drag start takes this same path
	h.advance(DWELL_MS * 2);
	h.intent.point(A, 100, 100); // resting still on the face it clicked
	h.intent.point(A, 140, 100); // even moving over it
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
	h.intent.point(B, 200, 100); // leaves for another face...
	h.advance(DWELL_MS);
	h.intent.point(null, 300, 100);
	h.intent.point(A, 100, 100); // ...and comes back
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [B, A], 'the block ended once the pointer left');
});

check('a press closes an open peek and keeps it closed', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	h.intent.press(A);
	assert.deepEqual(h.events, [['open', A, 'pointer'], ['close', A]]);
	h.advance(DWELL_MS * 3);
	assert.deepEqual(opened(h), [A], 'no second open');
});

check('a press that lands on no face closes the peek without blocking anything', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	h.intent.press(null);
	assert.deepEqual(h.events, [['open', A, 'pointer'], ['close', A]]);
	h.intent.point(null, 300, 300);
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A, A]);
});

check('a rebuilt face for the same card keeps its dwell and its press block', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(300);
	h.intent.point(A, 100, 100); // the face was re-rendered under the pointer
	h.advance(200);
	assert.deepEqual(opened(h), [A], 'dwell kept across the re-render');

	const g = harness();
	g.intent.point(A, 100, 100);
	g.intent.press(A); // click to add re-renders the deck...
	g.intent.deckChanged();
	g.intent.point(A, 100, 100); // ...and the new face reports the pointer again
	g.advance(DWELL_MS * 2);
	assert.deepEqual(g.events, []);
});

check('Escape closes the peek and blocks that face until the pointer leaves', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	h.intent.key('Escape');
	assert.deepEqual(h.events, [['open', A, 'pointer'], ['close', A]]);
	h.intent.point(A, 140, 100); // real movement, same face
	h.advance(DWELL_MS * 2);
	assert.deepEqual(opened(h), [A]);
	h.intent.point(null, 300, 100);
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A, A]);
});

/** One lock case: open A, fire the input, then run the same aftermath. */
function lockedUntilMove(name, fire) {
	check(`${name}: closes the peek and blocks arming until the pointer really moves`, () => {
		const h = harness();
		h.intent.point(A, 100, 100);
		h.advance(DWELL_MS);
		fire(h.intent);
		assert.deepEqual(h.events, [['open', A, 'pointer'], ['close', A]]);

		h.intent.point(A, 100, 100); // synthetic event, same coordinates
		h.intent.point(B, 100, 100); // a different card slid under the resting pointer
		h.intent.point(B, 100 + TOLERANCE_PX - 1, 100); // under the tolerance
		h.advance(DWELL_MS * 3);
		assert.deepEqual(opened(h), [A], 'nothing opened while the pointer rested');

		h.intent.point(B, 100 + TOLERANCE_PX + 6, 100); // a real move...
		h.advance(DWELL_MS - 1);
		assert.deepEqual(opened(h), [A]);
		h.advance(1); // ...then rest
		assert.deepEqual(opened(h), [A, B]);
	});
}
lockedUntilMove('scroll', (i) => i.scroll());
lockedUntilMove('a key press (typing in search)', (i) => i.key('a'));
lockedUntilMove('the window losing focus', (i) => i.blur());
lockedUntilMove('a deck change', (i) => i.deckChanged());

check('scrolling under a resting pointer with no peek open still blocks the sliding cards', () => {
	const h = harness();
	h.intent.point(A, 100, 100); // pointer arrives, then rests on nothing special...
	h.intent.point(null, 100, 100);
	h.intent.scroll(); // wheel over the grid
	for (const key of [A, B, C, A, B]) {
		h.intent.point(key, 100, 100); // cards slide under the still pointer
		h.advance(DWELL_MS);
	}
	assert.deepEqual(h.events, []);
});

check('a key press before any pointer event locks nothing: the first pointer event is real', () => {
	const h = harness();
	h.intent.key('x');
	h.intent.point(A, 10, 10);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A]);
});

check('touch input is ignored entirely', () => {
	const h = harness();
	h.intent.point(A, 100, 100, 'touch');
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
	assert.equal(h.timers.size, 0, 'no timer was even started');

	h.intent.press(A, 'touch'); // a tap must not block the face for the mouse
	h.intent.point(A, 100, 100, 'mouse');
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A]);
});

check('a pen is treated like a mouse', () => {
	const h = harness();
	h.intent.point(A, 100, 100, 'pen');
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A]);
});

check('over no peek-able face (copy controls, gaps) nothing is pending', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(200);
	h.intent.point(null, 105, 100); // onto the stepper: the glue reports no face
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
	h.intent.point(A, 110, 100); // back on the art: a fresh dwell
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A]);
});

check('keyboard focus opens after the dwell', () => {
	const h = harness();
	h.intent.focus(A);
	h.advance(DWELL_MS - 1);
	assert.deepEqual(h.events, []);
	h.advance(1);
	assert.deepEqual(h.events, [['open', A, 'focus']]);
});

check('a key pressed during the focus dwell cancels it', () => {
	const h = harness();
	h.intent.focus(A);
	h.advance(200);
	h.intent.key('ArrowDown');
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
});

check('tabbing through faces quickly opens only the one focus rests on', () => {
	const h = harness();
	h.intent.point(null, 5, 5); // a pointer position is known, so the key below locks it
	for (const key of [A, B]) {
		h.intent.key('Tab');
		h.intent.focus(key);
		h.advance(100);
	}
	h.intent.key('Tab');
	h.intent.focus(C);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [C], 'focus is never gated by the pointer lock');
});

check('Escape, a key, or moving focus away closes a focus-opened peek', () => {
	for (const close of [(i) => i.key('Escape'), (i) => i.key('Enter'), (i) => i.focus(null)]) {
		const h = harness();
		h.intent.focus(A);
		h.advance(DWELL_MS);
		close(h.intent);
		assert.deepEqual(h.events, [['open', A, 'focus'], ['close', A]]);
	}
});

check('Escape blocks the focused face until focus moves to another', () => {
	const h = harness();
	h.intent.focus(A);
	h.advance(DWELL_MS);
	h.intent.key('Escape');
	h.intent.focus(A);
	h.advance(DWELL_MS * 2);
	assert.deepEqual(opened(h), [A], 'refocusing the same face does not reopen it');
	h.intent.focus(B);
	h.advance(DWELL_MS);
	h.intent.focus(A);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A, B, A]);
});

check('a face clicked with the mouse does not open its peek when focus lands on it', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.intent.press(A);
	h.intent.focus(A); // the browser focuses the clicked link
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
});

check('a focus change right after a press does not lift the press block (the browser moves focus on click)', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.intent.press(A);
	h.intent.focus(null); // the click took focus off whatever had it
	h.intent.point(A, 140, 100); // a real move, still on the same card
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, [], 'still blocked until the pointer leaves the card');
	h.intent.point(null, 300, 100);
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A], 'and open again once it left and returned');
});

check('an Escape on a pointer-opened peek is not lifted by a focus change either', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(DWELL_MS);
	h.intent.key('Escape');
	h.intent.focus(null);
	h.intent.point(A, 140, 100);
	h.advance(DWELL_MS * 2);
	assert.deepEqual(opened(h), [A], 'no second open on the same card');
});

check('a pointer move never lifts the focus block, and refocusing after blur works', () => {
	const h = harness();
	h.intent.focus(A);
	h.advance(DWELL_MS);
	h.intent.key('Escape'); // closes it and blocks focus on that face
	h.intent.point(null, 50, 50);
	h.intent.focus(A);
	h.advance(DWELL_MS * 2);
	assert.deepEqual(opened(h), [A], 'pointer movement did not lift the focus block');
	h.intent.focus(null); // focus leaves every face
	h.intent.focus(A); // and comes back
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A, A]);
});

check('the pointer leaving does not close a focus-opened peek, but entering another face takes over', () => {
	const h = harness();
	h.intent.focus(A);
	h.advance(DWELL_MS);
	h.intent.point(null, 50, 50);
	assert.equal(h.intent.openKey(), A);
	h.intent.point(B, 200, 100);
	assert.deepEqual(h.events, [['open', A, 'focus'], ['close', A]]);
	h.advance(DWELL_MS);
	assert.deepEqual(opened(h), [A, B]);
});

check('a scroll caused by focus scrolling a card into view does not cancel its focus dwell or close its peek', () => {
	const h = harness();
	h.intent.focus(A);
	h.intent.scroll('scroll'); // the browser's own scroll-into-view, a frame after the focus
	h.advance(DWELL_MS);
	assert.deepEqual(h.events, [['open', A, 'focus']], 'dwell survived the scroll');
	h.intent.scroll('scroll');
	assert.equal(h.intent.openKey(), A, 'a plain scroll event leaves a focus-opened peek alone');
});

check("the user's own wheel does cancel a focus dwell and close a focus-opened peek", () => {
	const pending = harness();
	pending.intent.focus(A);
	pending.intent.scroll('wheel');
	pending.advance(DWELL_MS * 2);
	assert.deepEqual(pending.events, []);

	const open = harness();
	open.intent.focus(A);
	open.advance(DWELL_MS);
	open.intent.scroll('wheel');
	assert.deepEqual(open.events, [['open', A, 'focus'], ['close', A]]);
});

check('a plain scroll event still cancels and locks a POINTER dwell (focus leniency is focus-only)', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.advance(200);
	h.intent.scroll('scroll');
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
});

check('destroy cancels a pending dwell', () => {
	const h = harness();
	h.intent.point(A, 100, 100);
	h.intent.destroy();
	h.advance(DWELL_MS * 2);
	assert.deepEqual(h.events, []);
	assert.equal(h.timers.size, 0);
});

/* --- facts fragment (spec: card-peek, the peek presents a card's facts) ------ */

const { peekFactsHtml } = await import('../src/lib/peek-facts.ts');
const { cardStats } = await import('../src/lib/card-stats.ts');

/** The fragment for a snapshot card, built the way the /peek endpoint builds it
 *  (slug labels instead of display labels; no glyph resolver, so glyphs fall
 *  back to their readable text). */
function fragmentFor(card) {
	const record = snapshotData.cards[card.cardId];
	const rep = card.printings.find((p) => p.imageIds.length > 0) ?? card.printings[0];
	const printing = rep ? snapshotData.printings[rep.printingId] : undefined;
	return peekFactsHtml({
		name: card.name,
		types: card.types,
		superTypes: record?.superTypes ?? [],
		domains: (record?.domains ?? []).map((slug) => ({ slug, label: slug })),
		stats: record ? cardStats(record) : [],
		keywords: record?.keywords ?? [],
		effectText: printing?.printedEffectText ?? null,
		rulesText: printing?.printedRulesText ?? null,
	});
}
const allFragments = indexData.cards.map((card) => ({ card, html: fragmentFor(card) }));
const textOf = (card) => {
	const rep = card.printings.find((p) => p.imageIds.length > 0) ?? card.printings[0];
	const printing = rep ? snapshotData.printings[rep.printingId] : undefined;
	return [printing?.printedEffectText, printing?.printedRulesText].filter((t) => t && t.trim());
};

check('a unit shows name, type line, domain, cost row in Energy / Power / Might order, and its text', () => {
	const html = allFragments.find(({ card }) => card.slug === AHRI).html;
	assert.match(html, /<h2 class="peek-name">Ahri, Alluring<\/h2>/);
	assert.match(html, /<p class="peek-types">champion unit<\/p>/, 'supertype reads before type');
	assert.match(html, /data-domain="calm"/);
	const order = ['energy', 'power', 'might'].map((kind) => html.indexOf(`data-stat="${kind}"`));
	assert.ok(order.every((at) => at > 0) && order[0] < order[1] && order[1] < order[2], `cost row order: ${order}`);
	assert.match(html, /5 energy/);
	assert.match(html, /When I hold, you score 1 point\./);
});

check('every card lists exactly the figures it has, and never an empty Might', () => {
	for (const { card, html } of allFragments) {
		const record = snapshotData.cards[card.cardId];
		assert.equal(html.includes('data-stat="might"'), record.might != null, `${card.slug}: Might`);
		assert.equal(html.includes('data-stat="energy"'), record.energy != null, `${card.slug}: Energy`);
		assert.equal(html.includes('data-stat="power"'), record.power != null, `${card.slug}: Power`);
	}
});

check('Legends, battlefields and runes carry no cost row but keep name, type line and domains', () => {
	const costless = allFragments.filter(({ card }) => ['legend', 'battlefield', 'rune'].some((t) => card.types.includes(t)));
	assert.ok(costless.length > 100, 'fixture covers many cards');
	for (const { card, html } of costless) {
		assert.ok(!html.includes('peek-stats'), `${card.slug}: no cost row`);
		assert.match(html, /<h2 class="peek-name">/);
		assert.match(html, /<p class="peek-types">/);
	}
});

check('a text section appears exactly when the card has printed rules or effect text', () => {
	let withText = 0;
	let withoutText = 0;
	for (const { card, html } of allFragments) {
		const has = textOf(card).length > 0;
		assert.equal(html.includes('peek-text'), has, `${card.slug}: text section`);
		if (has) withText++;
		else withoutText++;
	}
	assert.ok(withText > 100 && withoutText > 0, `fixture covers both: ${withText} with, ${withoutText} without`);
});

check('no raw card-text markup survives into any fragment', () => {
	for (const { card, html } of allFragments) {
		assert.ok(!/:rb_\w+:/.test(html), `${card.slug}: glyph token leaked`);
		assert.ok(!/_\(/.test(html), `${card.slug}: reminder-text underscores leaked`);
	}
});

check('keywords render as labels, one per keyword on the card', () => {
	const withKeywords = allFragments.filter(({ card }) => (snapshotData.cards[card.cardId].keywords ?? []).length > 0);
	assert.ok(withKeywords.length > 100, 'fixture covers many keyword cards');
	for (const { card, html } of withKeywords) {
		const keywords = snapshotData.cards[card.cardId].keywords;
		assert.ok(html.includes('class="peek-keywords"'), `${card.slug}: keyword row`);
		const row = html.slice(html.indexOf('class="peek-keywords"'));
		const labels = row.slice(0, row.indexOf('</div>')).match(/<span class="kw"/g) ?? [];
		assert.equal(labels.length, keywords.length, `${card.slug}: ${keywords.join(', ')}`);
	}
	assert.ok(!allFragments.find(({ card }) => (snapshotData.cards[card.cardId].keywords ?? []).length === 0).html.includes('peek-keywords'));
});

check('card names and labels are escaped, never injected as markup', () => {
	const html = peekFactsHtml({
		name: '<img src=x onerror=alert(1)>',
		types: ['Unit'],
		superTypes: [],
		domains: [{ slug: 'a"b', label: '<b>x</b>' }],
		stats: [],
		keywords: [],
		effectText: null,
		rulesText: null,
	});
	assert.ok(!html.includes('<img'), 'name escaped');
	assert.ok(!html.includes('<b>x'), 'label escaped');
	assert.ok(!html.includes('a"b'), 'attribute value escaped');
});

console.log(`VERIFY OK: card-peek (${checks} checks)`);
