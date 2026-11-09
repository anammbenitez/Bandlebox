// src/domain/hover-intent.ts — the dwell and stillness rule behind the deck
// manager's card peek (spec: card-peek; design.md D2).
//
// A peek opens only when the user has come to rest on a card: the pointer (or
// keyboard focus) stays on one face for DWELL_MS with no click, no drag, no
// scrolling and no key press. Once open it can be reached: the pointer may cross
// from the face onto the peek (GRACE_MS to get there), and while it is on the
// peek the peek stays. This module is that rule and nothing else — no DOM, no
// data imports, injected clock and timers — so it runs in the browser and under
// scripts/verify-card-peek.mjs alike (explicit .ts extensions on relative
// imports, none needed here).
//
// Targets are KEYS ("zone:slug"), never elements: the deck manager rebuilds its
// faces under a resting pointer (every deck change re-renders the sections), and
// a rebuilt face for the same card must keep its dwell and its blocks.
//
// Blocks stop a peek from arming:
//   blockedKey       set by a press, click, drag start or Escape (while the
//                    pointer had the peek) on a face; cleared when the POINTER
//                    is on any other face or none. Focus changes never clear it:
//                    a click moves focus away from whatever had it, and that
//                    must not lift the block the click just set.
//   blockedFocusKey  set by Escape on a focus-opened peek; cleared when focus
//                    moves to another face or off every face.
//   moveLock         set by a scroll, wheel, key press, window blur or deck
//                    change; cleared only by a pointer move of more than
//                    TOLERANCE_PX from where the pointer was when it was set.
// Movement is judged in coordinates, never by event type: browsers fire
// synthetic move/over events after a scroll or a re-render with the pointer
// exactly where it was, and those must never count as the user moving.

/** How long the pointer must rest before a peek opens. */
export const DWELL_MS = 500;
/** Pointer drift (CSS px) that still counts as resting; more restarts the dwell. */
export const TOLERANCE_PX = 4;
/** How long an open peek waits after the pointer leaves its face, so the pointer
 *  can cross the gap and land on the peek. Long enough for a slow hand, short
 *  enough that the peek never seems to cling. */
export const GRACE_MS = 250;

/** "zone:slug" — stable across re-renders; the zone is where the face sits. */
export type FaceKey = string;
export type IntentSource = 'pointer' | 'focus';

export function faceKey(zone: string, slug: string): FaceKey {
	return `${zone}:${slug}`;
}

/** Splits a key made by faceKey (zones never contain a colon). */
export function parseFaceKey(key: FaceKey): { zone: string; slug: string } {
	const cut = key.indexOf(':');
	return cut < 0 ? { zone: '', slug: key } : { zone: key.slice(0, cut), slug: key.slice(cut + 1) };
}

export interface HoverIntentOptions {
	/** Called once when the dwell completes. */
	onOpen: (key: FaceKey, source: IntentSource) => void;
	/** Called when an OPEN peek closes (a cancelled pending dwell is silent). */
	onClose: (key: FaceKey) => void;
	dwellMs?: number;
	graceMs?: number;
	tolerancePx?: number;
	setTimer?: (fn: () => void, ms: number) => unknown;
	clearTimer?: (handle: unknown) => void;
}

export interface HoverIntent {
	/** The pointer is at (x, y) over `key`, or over no peek-able face when null.
	 *  Feed it every pointermove AND pointerover/out; touch is ignored. */
	point(key: FaceKey | null, x: number, y: number, pointerType?: string): void;
	/** Keyboard focus moved onto `key`, or off every face when null. */
	focus(key: FaceKey | null): void;
	/** A pointer press, click or drag start. `key` is the face pressed, if any. */
	press(key: FaceKey | null, pointerType?: string): void;
	/** Scrolling in the deck manager. `wheel` is the user's own scroll; `scroll` is
	 *  any scroll event, including the one the browser fires when keyboard focus
	 *  scrolls a card into view, which must not cancel that card's focus dwell. */
	scroll(cause?: 'wheel' | 'scroll'): void;
	/** Any key press; Escape also blocks the face it closed. */
	key(name: string): void;
	/** Window lost focus or the page was hidden. */
	blur(): void;
	/** The pointer is on the open peek itself (true) or has left it (false). While
	 *  it is on the peek the peek stays; leaving it starts the same short grace as
	 *  leaving the face, so the pointer can go back to the face. */
	hold(held: boolean): void;
	/** The deck changed (faces are about to be rebuilt). */
	deckChanged(): void;
	/** The currently open key, or null. */
	openKey(): FaceKey | null;
	/** Cancels everything and clears timers. */
	destroy(): void;
}

interface Point {
	x: number;
	y: number;
}

export function createHoverIntent(options: HoverIntentOptions): HoverIntent {
	const dwellMs = options.dwellMs ?? DWELL_MS;
	const graceMs = options.graceMs ?? GRACE_MS;
	const tolerance = options.tolerancePx ?? TOLERANCE_PX;
	const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
	const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

	let mode: 'idle' | 'pending' | 'open' = 'idle';
	let target: FaceKey | null = null;
	let source: IntentSource = 'pointer';
	let anchor: Point | null = null;
	let last: Point | null = null;
	let blockedKey: FaceKey | null = null;
	let blockedFocusKey: FaceKey | null = null;
	let moveLock: Point | null = null;
	let timer: unknown = null;
	let graceTimer: unknown = null;
	/** The pointer is on the open peek. Reset whenever a peek closes: an element
	 *  hidden under the pointer never reports the pointer leaving it. */
	let held = false;

	const moved = (from: Point, to: Point): boolean => Math.hypot(to.x - from.x, to.y - from.y) > tolerance;

	function stopTimer(): void {
		if (timer !== null) clearTimer(timer);
		timer = null;
	}

	function stopGrace(): void {
		if (graceTimer !== null) clearTimer(graceTimer);
		graceTimer = null;
	}

	/** The pointer is off both the face and the peek: close after the grace unless
	 *  it gets back to one of them first. */
	function startGrace(): void {
		stopGrace();
		graceTimer = setTimer(() => {
			graceTimer = null;
			if (mode === 'open' && !held) dismiss();
		}, graceMs);
	}

	/** Back to idle; fires onClose only when a peek was actually open. */
	function dismiss(): void {
		stopTimer();
		stopGrace();
		held = false;
		const wasOpen = mode === 'open' ? target : null;
		mode = 'idle';
		target = null;
		anchor = null;
		if (wasOpen !== null) options.onClose(wasOpen);
	}

	function beginPending(key: FaceKey, from: IntentSource, at: Point | null): void {
		stopTimer();
		mode = 'pending';
		target = key;
		source = from;
		anchor = at;
		timer = setTimer(() => {
			timer = null;
			if (mode !== 'pending' || target !== key) return;
			mode = 'open';
			options.onOpen(key, source);
		}, dwellMs);
	}

	/** Lock arming until the pointer really moves. With no pointer position yet
	 *  there is nothing to lock: the first pointer event is real movement. */
	function lockUntilMove(): void {
		dismiss();
		if (last) moveLock = { ...last };
	}

	return {
		point(key, x, y, pointerType = 'mouse') {
			if (pointerType === 'touch') return;
			const here: Point = { x, y };
			last = here;

			// leaving the blocked face (onto any other face, or none) lifts that block
			if (blockedKey !== null && key !== blockedKey) blockedKey = null;

			if (moveLock) {
				if (!moved(moveLock, here)) return; // still the same resting pointer
				moveLock = null;
			}

			if (key === null) {
				// a peek opened by keyboard focus is not the pointer's to close
				if (source === 'pointer' || mode === 'idle') {
					// an OPEN peek is given the grace to be reached; a dwell still pending is just dropped
					if (mode === 'open') {
						if (!held) startGrace();
					} else {
						dismiss();
					}
				}
				return;
			}
			if (key === blockedKey) {
				dismiss();
				return;
			}

			if (mode !== 'idle' && target === key) {
				// same face: drifting restarts a pending dwell; an open peek stays, and a
				// pointer that came back from the gap cancels the grace it had started
				if (mode === 'open') stopGrace();
				if (mode === 'pending' && source === 'pointer' && anchor && moved(anchor, here)) {
					beginPending(key, 'pointer', here);
				}
				return;
			}

			// a different face: the previous peek (if any) closes, this one waits its own dwell
			dismiss();
			beginPending(key, 'pointer', here);
		},

		focus(key) {
			// moving focus lifts only a focus block; the pointer's press block stays
			if (blockedFocusKey !== null && key !== blockedFocusKey) blockedFocusKey = null;
			if (key === null) {
				if (source === 'focus') dismiss();
				return;
			}
			// focus landing on a face the mouse just pressed is the click's doing
			if (key === blockedKey || key === blockedFocusKey) return;
			if (mode !== 'idle' && target === key && source === 'focus') return;
			dismiss();
			beginPending(key, 'focus', null);
		},

		press(key, pointerType = 'mouse') {
			if (pointerType === 'touch') return;
			dismiss();
			if (key !== null) blockedKey = key;
		},

		scroll(cause = 'scroll') {
			// Tabbing to a card whose controls start offscreen makes the browser scroll
			// it into view; that scroll is the focus move's own doing, so it neither
			// cancels the pending focus dwell nor closes the peek that dwell opened.
			// Only the user's wheel does that.
			if (cause === 'scroll' && source === 'focus' && mode !== 'idle') return;
			lockUntilMove();
		},

		key(name) {
			const closing = mode === 'idle' ? null : target;
			const from = source;
			lockUntilMove();
			if (name === 'Escape' && closing !== null) {
				if (from === 'focus') blockedFocusKey = closing;
				else blockedKey = closing;
			}
		},

		blur() {
			lockUntilMove();
		},

		hold(next) {
			if (mode !== 'open') {
				held = false;
				return;
			}
			held = next;
			if (next) {
				// the pointer took the peek over: it is the pointer's now, whatever opened it
				source = 'pointer';
				stopGrace();
			} else {
				startGrace();
			}
		},

		deckChanged() {
			lockUntilMove();
		},

		openKey() {
			return mode === 'open' ? target : null;
		},

		destroy() {
			stopTimer();
			stopGrace();
			held = false;
			mode = 'idle';
			target = null;
			anchor = null;
			blockedKey = null;
			blockedFocusKey = null;
			moveLock = null;
		},
	};
}
