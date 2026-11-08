// Card tilt controller: a card art that leans away from the mouse.
//
// Markup contract (no registration, so tiles drawn later by infinite scroll or a
// re-render are picked up on their own):
//   [data-tilt]       the stage. It never moves, so its edges stay put under the
//                     pointer and the card cannot flicker as it leans away.
//   [data-tilt-face]  inside the stage: the card art that does move. A stage
//                     without one is left alone.
//
// This script only follows the pointer and publishes where it is, as unitless
// custom properties on the face (--tilt-x, --tilt-y, --tilt-p; see
// src/lib/card-tilt.ts for the ranges). The look (angle, depth, perspective) is in
// global.css under "card tilt", so it is tuned as design, not here. The face is
// painted from a single requestAnimationFrame loop that runs only while a card is
// still moving, and `data-tilting` is on the stage only for that time, so a
// resting grid of tiles carries no transform and no compositing layer.
//
// Only a hovering mouse or pen tilts a card: touch has no pointer to follow, and
// a reader who asked for reduced motion gets none (the gold rim still shows).

import {
	REST,
	cssNumber,
	isSettled,
	pointerToTilt,
	stepTilt,
	type Rect,
	type Tilt,
} from '../lib/card-tilt';

const STAGE = '[data-tilt]';
const FACE = '[data-tilt-face]';

interface Tile {
	stage: HTMLElement;
	face: HTMLElement;
	state: Tilt;
	target: Tilt;
}

const tiles = new WeakMap<HTMLElement, Tile>();
/** Tiles being painted: the hovered one, and any still settling back to rest. */
const moving = new Set<Tile>();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let hovered: Tile | null = null;
let pointerX = 0;
let pointerY = 0;
/** The face has to be measured again (the pointer moved, or the page scrolled under it). */
let stale = false;
let frameId = 0;
let lastFrame = 0;

function tileFor(stage: HTMLElement): Tile | null {
	const known = tiles.get(stage);
	if (known) return known;
	const face = stage.querySelector<HTMLElement>(FACE);
	if (!face) return null;
	const tile: Tile = { stage, face, state: { ...REST }, target: { ...REST } };
	tiles.set(stage, tile);
	return tile;
}

/** Layout size is untouched by a transform; the tilted bounds' centre is within a
 *  pixel or two of the true one, which is far less than the card can tell. */
function measure(face: HTMLElement): Rect {
	const box = face.getBoundingClientRect();
	const width = face.offsetWidth;
	const height = face.offsetHeight;
	return {
		left: box.left + box.width / 2 - width / 2,
		top: box.top + box.height / 2 - height / 2,
		width,
		height,
	};
}

function paint(tile: Tile): void {
	const { style } = tile.face;
	style.setProperty('--tilt-x', cssNumber(tile.state.x));
	style.setProperty('--tilt-y', cssNumber(tile.state.y));
	style.setProperty('--tilt-p', cssNumber(tile.state.p));
	tile.stage.setAttribute('data-tilting', '');
}

function clear(tile: Tile): void {
	const { style } = tile.face;
	style.removeProperty('--tilt-x');
	style.removeProperty('--tilt-y');
	style.removeProperty('--tilt-p');
	tile.stage.removeAttribute('data-tilting');
	tile.state = { ...REST };
	tile.target = { ...REST };
}

function frame(now: number): void {
	frameId = 0;
	const dt = now - lastFrame;
	lastFrame = now;

	if (hovered && !hovered.stage.isConnected) {
		moving.delete(hovered);
		hovered = null; // re-rendered under a resting pointer
	}
	if (hovered && stale) {
		stale = false;
		const at = pointerToTilt(pointerX, pointerY, measure(hovered.face));
		hovered.target = { x: at.x, y: at.y, p: 1 };
	}

	let travelling = false;
	for (const tile of moving) {
		if (!tile.stage.isConnected) {
			moving.delete(tile);
			continue;
		}
		const engaged = tile === hovered;
		tile.state = stepTilt(tile.state, tile.target, dt, engaged);
		if (!engaged && isSettled(tile.state, REST)) {
			clear(tile);
			moving.delete(tile);
			continue;
		}
		paint(tile);
		if (!isSettled(tile.state, tile.target)) travelling = true;
	}
	if (travelling) frameId = requestAnimationFrame(frame);
}

function kick(): void {
	if (frameId) return;
	lastFrame = performance.now();
	frameId = requestAnimationFrame(frame);
}

function release(): void {
	if (!hovered) return;
	hovered.target = { ...REST };
	hovered = null;
	kick();
}

function releaseAll(): void {
	release();
	for (const tile of moving) clear(tile);
	moving.clear();
}

function usable(event: PointerEvent): boolean {
	return (event.pointerType === 'mouse' || event.pointerType === 'pen') && !reduceMotion.matches;
}

function stageOf(node: EventTarget | null): HTMLElement | null {
	return node instanceof Element ? node.closest<HTMLElement>(STAGE) : null;
}

document.addEventListener('pointerover', (event) => {
	if (!usable(event)) return;
	const stage = stageOf(event.target);
	if (!stage || stage === hovered?.stage) return;
	release();
	const tile = tileFor(stage);
	if (!tile) return;
	hovered = tile;
	moving.add(tile);
	pointerX = event.clientX;
	pointerY = event.clientY;
	stale = true;
	kick();
});

document.addEventListener('pointerout', (event) => {
	const stage = stageOf(event.target);
	if (!stage || stage !== hovered?.stage) return;
	const into = event.relatedTarget;
	if (into instanceof Node && stage.contains(into)) return; // still on the same card
	release();
});

document.addEventListener(
	'pointermove',
	(event) => {
		if (!hovered || !usable(event)) return;
		pointerX = event.clientX;
		pointerY = event.clientY;
		stale = true;
		kick();
	},
	{ passive: true },
);

// A page that scrolls (or resizes) under a resting pointer moves the card under
// it, so the lean is worked out again from the same pointer.
const remeasure = (): void => {
	if (!hovered) return;
	stale = true;
	kick();
};
window.addEventListener('scroll', remeasure, { passive: true, capture: true });
window.addEventListener('resize', remeasure, { passive: true });

// The pointer left without a pointerout (a drag out of the window, a hidden tab).
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => {
	if (document.hidden) releaseAll();
});
document.addEventListener('pointercancel', release);
reduceMotion.addEventListener('change', () => {
	if (reduceMotion.matches) releaseAll();
});
