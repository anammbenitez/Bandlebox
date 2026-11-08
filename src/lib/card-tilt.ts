// Card tilt: the numbers behind a card that leans away from the pointer.
//
// A card on the table, pressed by a fingertip, sinks where it is pressed: the
// edge nearest the pointer goes back and the far edge comes forward, and the
// whole card settles a little deeper. This module is only that arithmetic, with
// no DOM and no timers, so the controller (src/scripts/card-tilt.ts) stays a thin
// shell and `scripts/verify-card-tilt.mjs` can drive it directly. Angles, depth
// and perspective are not here: they are design tokens in `global.css`, which
// scales the unitless values below (design: DESIGN.md "Card tilt").
//
// Conventions: `x` is -1 at the face's left edge and +1 at its right; `y` is -1
// at the top and +1 at the bottom (the way screen coordinates grow); `p` is how
// far the card has been pressed back, 0 (resting) to 1 (pointer on it).

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface Tilt {
	/** Where the pointer is across the face, -1 (left) .. 1 (right). */
	x: number;
	/** Where the pointer is down the face, -1 (top) .. 1 (bottom). */
	y: number;
	/** How far the card is pressed back, 0 .. 1. */
	p: number;
}

/** Time constants of the exponential approach, in ms: a card that follows the
 *  pointer with a slight weight, then lets go more slowly than it was pressed. */
export const FOLLOW_MS = 90;
export const RELEASE_MS = 150;

/** Below this distance from its target a value is treated as arrived (0.01 of a
 *  9° tilt is under a tenth of a degree, an edge moving 0.15px). */
export const SETTLED = 0.01;

/** A stalled tab can hand the loop a huge frame; never integrate more than this. */
export const MAX_FRAME_MS = 64;

export const REST: Readonly<Tilt> = Object.freeze({ x: 0, y: 0, p: 0 });

const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

/**
 * The pointer's place on a face, as -1..1 on each axis from the face's centre.
 * Outside the face it clamps, so a pointer on a label under the card leans the
 * card toward its bottom edge instead of tilting it past what it can.
 */
export function pointerToTilt(clientX: number, clientY: number, rect: Rect): { x: number; y: number } {
	if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 };
	return {
		x: clamp((clientX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1),
		y: clamp((clientY - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1),
	};
}

/**
 * One value moving toward its target by exponential smoothing. The share of the
 * remaining distance covered is `1 - e^(-dt/tau)`, so the motion is the same on a
 * 60Hz and a 144Hz screen and two short steps equal one long one.
 */
export function approach(current: number, target: number, dtMs: number, tauMs: number): number {
	const dt = clamp(dtMs, 0, MAX_FRAME_MS);
	return current + (target - current) * (1 - Math.exp(-dt / tauMs));
}

/** Advance a card one frame; `engaged` is the pointer being on it. */
export function stepTilt(state: Tilt, target: Tilt, dtMs: number, engaged: boolean): Tilt {
	const tau = engaged ? FOLLOW_MS : RELEASE_MS;
	return {
		x: approach(state.x, target.x, dtMs, tau),
		y: approach(state.y, target.y, dtMs, tau),
		p: approach(state.p, target.p, dtMs, tau),
	};
}

/** True when every axis is within `SETTLED` of the target. */
export function isSettled(state: Tilt, target: Tilt): boolean {
	return (
		Math.abs(state.x - target.x) < SETTLED &&
		Math.abs(state.y - target.y) < SETTLED &&
		Math.abs(state.p - target.p) < SETTLED
	);
}

/** A value as the plain number written into a CSS custom property: four
 *  decimals, never `-0` and never exponent notation. */
export function cssNumber(value: number): string {
	const rounded = Math.round(value * 1e4) / 1e4;
	return (rounded === 0 ? 0 : rounded).toFixed(4).replace(/\.?0+$/, '') || '0';
}
