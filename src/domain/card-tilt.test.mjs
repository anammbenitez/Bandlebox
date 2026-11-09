// Ported from scripts/verify-card-tilt.mjs (openspec change migrate-to-react, task 3.3).
// Assertions are kept verbatim; only the harness moved to Vitest.
import { it } from 'vitest';
import assert from 'node:assert/strict';
import { FOLLOW_MS, MAX_FRAME_MS, REST, RELEASE_MS, SETTLED, approach, cssNumber, isSettled, pointerToTilt, stepTilt } from './card-tilt.ts';

// scripts/verify-card-tilt.mjs — checks the card tilt's pure arithmetic
// (src/domain/card-tilt.ts): where the pointer is on a face, the smoothing that
// follows it, and the numbers written into CSS.
//
// src/domain modules are plain TypeScript with no Vite-only imports, so Node's
// type stripping can load them directly. The controller (src/behaviors/card-tilt.ts)
// and the look (global.css "card tilt") need a browser and are checked there.
// Run with:
//   node scripts/verify-card-tilt.mjs



const check = (name, fn) => it(name, fn);

const near = (actual, expected, eps = 1e-9, message) =>
	assert.ok(Math.abs(actual - expected) <= eps, `${message ?? 'value'}: ${actual} is not ${expected}`);

/* --- where the pointer is on the face --------------------------------------- */

// A 200 x 280 face (5:7) with its corner at (100, 50): centre (200, 190).
const FACE = { left: 100, top: 50, width: 200, height: 280 };

check('the centre of the face is rest', () => {
	assert.deepEqual(pointerToTilt(200, 190, FACE), { x: 0, y: 0 });
});

check('edges and corners read -1 and 1: x grows to the right, y grows downward', () => {
	assert.deepEqual(pointerToTilt(100, 190, FACE), { x: -1, y: 0 }, 'left edge');
	assert.deepEqual(pointerToTilt(300, 190, FACE), { x: 1, y: 0 }, 'right edge');
	assert.deepEqual(pointerToTilt(200, 50, FACE), { x: 0, y: -1 }, 'top edge');
	assert.deepEqual(pointerToTilt(200, 330, FACE), { x: 0, y: 1 }, 'bottom edge');
	assert.deepEqual(pointerToTilt(100, 50, FACE), { x: -1, y: -1 }, 'top-left corner');
	assert.deepEqual(pointerToTilt(300, 330, FACE), { x: 1, y: 1 }, 'bottom-right corner');
});

check('each axis is scaled by its own half-extent, so a tall card is not squashed', () => {
	// A quarter of the way across and a quarter of the way down: same fraction on both axes.
	const at = pointerToTilt(250, 260, FACE);
	near(at.x, 0.5, 1e-9, 'x');
	near(at.y, 0.5, 1e-9, 'y');
});

check('a pointer off the face (the label under it) clamps instead of over-tilting', () => {
	assert.deepEqual(pointerToTilt(260, 500, FACE), { x: 0.6, y: 1 }, 'below the face');
	assert.deepEqual(pointerToTilt(-40, 190, FACE), { x: -1, y: 0 }, 'far left');
	assert.deepEqual(pointerToTilt(1e6, -1e6, FACE), { x: 1, y: -1 }, 'far off');
});

check('a face with no size leans nowhere (no NaN reaches the CSS)', () => {
	assert.deepEqual(pointerToTilt(10, 10, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 });
	assert.deepEqual(pointerToTilt(10, 10, { left: 0, top: 0, width: NaN, height: 50 }), { x: 0, y: 0 });
});

/* --- smoothing --------------------------------------------------------------- */

check('a value approaches its target and never overshoots it', () => {
	let value = 0;
	let previous = 0;
	for (let i = 0; i < 200; i += 1) {
		value = approach(value, 1, 16.7, FOLLOW_MS);
		assert.ok(value >= previous, 'monotone');
		assert.ok(value <= 1, 'no overshoot');
		previous = value;
	}
	near(value, 1, 1e-6, 'arrives');
	near(approach(0, 1, 16.7, FOLLOW_MS), 1 - Math.exp(-16.7 / FOLLOW_MS), 1e-12, 'one frame is 1 - e^(-dt/tau)');
});

check('it moves the same at 60Hz and at 180Hz: short steps add up to a long one', () => {
	const run = (frames, frameMs) => {
		let value = 0;
		for (let i = 0; i < frames; i += 1) value = approach(value, 1, frameMs, FOLLOW_MS);
		return value;
	};
	// 100ms either way: 6 frames of 1000/60 ms, or 18 frames of 1000/180 ms.
	near(run(6, 1000 / 60), 1 - Math.exp(-100 / FOLLOW_MS), 1e-9, '60Hz');
	near(run(18, 1000 / 180), 1 - Math.exp(-100 / FOLLOW_MS), 1e-9, '180Hz');
	near(approach(approach(0, 1, 8, FOLLOW_MS), 1, 8, FOLLOW_MS), approach(0, 1, 16, FOLLOW_MS), 1e-12, 'two 8ms steps = one 16ms step');
});

check('a stalled frame is capped, and a zero or negative frame moves nothing', () => {
	assert.equal(approach(0, 1, 5000, FOLLOW_MS), approach(0, 1, MAX_FRAME_MS, FOLLOW_MS));
	assert.equal(approach(0.3, 1, 0, FOLLOW_MS), 0.3);
	assert.equal(approach(0.3, 1, -20, FOLLOW_MS), 0.3);
});

check('it lets go more slowly than it follows', () => {
	assert.ok(RELEASE_MS > FOLLOW_MS);
	const follow = stepTilt({ x: 0, y: 0, p: 0 }, { x: 1, y: 1, p: 1 }, 16, true);
	const release = stepTilt({ x: 1, y: 1, p: 1 }, { ...REST }, 16, false);
	assert.ok(follow.x > 1 - release.x, 'the same frame covers more distance while following than while releasing');
});

check('a card pressed on the right edge leans right and presses back; releasing returns it to rest', () => {
	const at = pointerToTilt(300, 190, FACE);
	let state = { ...REST };
	const target = { x: at.x, y: at.y, p: 1 };
	assert.equal(isSettled(state, target), false, 'moving at the start');
	for (let i = 0; i < 120; i += 1) state = stepTilt(state, target, 16.7, true);
	assert.ok(isSettled(state, target), 'arrived');
	assert.ok(state.x > 0.98 && state.p > 0.98, `${JSON.stringify(state)}`);
	for (let i = 0; i < 180; i += 1) state = stepTilt(state, { ...REST }, 16.7, false);
	assert.ok(isSettled(state, REST), `back at rest: ${JSON.stringify(state)}`);
});

check('settling is bounded: a release at full press is done well inside a second', () => {
	let state = { x: 1, y: -1, p: 1 };
	let ms = 0;
	while (!isSettled(state, REST)) {
		state = stepTilt(state, { ...REST }, 16.7, false);
		ms += 16.7;
		assert.ok(ms < 1500, 'never settles');
	}
	assert.ok(ms < 1000, `settled after ${Math.round(ms)}ms`);
});

check('SETTLED is a tenth of a degree on a 9 degree tilt', () => {
	assert.ok(SETTLED * 9 < 0.1);
});

check('the shared REST value cannot be changed by a controller by accident', () => {
	assert.ok(Object.isFrozen(REST));
	assert.deepEqual(REST, { x: 0, y: 0, p: 0 });
});

/* --- what reaches CSS ------------------------------------------------------- */

check('custom property numbers are short plain decimals', () => {
	assert.equal(cssNumber(0), '0');
	assert.equal(cssNumber(-0), '0');
	assert.equal(cssNumber(1), '1');
	assert.equal(cssNumber(-1), '-1');
	assert.equal(cssNumber(0.5), '0.5');
	assert.equal(cssNumber(-0.25), '-0.25');
	assert.equal(cssNumber(0.123456789), '0.1235');
	assert.equal(cssNumber(0.00004), '0', 'a tiny value does not become 4e-5');
	assert.equal(cssNumber(-0.00004), '0', 'and a tiny negative is not "-0"');
	assert.match(cssNumber(1e-7), /^0$/);
});

