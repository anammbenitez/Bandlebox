// DOM glue for the deck manager's card peek (spec: card-peek; design.md D3, D4,
// D6). The dwell and stillness rule lives in src/lib/hover-intent.ts; this file
// only turns browser events into inputs for it, fetches a card's facts fragment,
// and places the peek beside the face. The peek shows the card, not the deck:
// nothing in it depends on what the deck holds. It can be reached: the pointer
// may cross onto it (it stays while the pointer is on it) and its "See more"
// link opens the card's page, which links back to this deck (deck-return.ts).
//
// Faces are `.face[data-slug]` elements: the browser tiles, the Legend, the
// Champion, battlefields, and the main / rune / side rows. A face is identified
// to the state machine by "zone:slug", never by element, because every deck
// change rebuilds the section faces under a resting pointer.

import { cardPageHref } from '../lib/deck-return';
import { createHoverIntent, faceKey, parseFaceKey, type FaceKey } from '../lib/hover-intent';

export interface CardPeekOptions {
	/** The deck manager root (`#deck-app`): all faces live under it. */
	root: HTMLElement;
}

export interface CardPeek {
	/** The deck is about to be rebuilt: close the peek and wait for the pointer to move
	 *  (the faces are re-rendered under a resting pointer, so it must not reopen on them). */
	closeForDeckChange(): void;
}

const FACE = '.face[data-slug]';
/** Pointer over these means a click is coming (copy controls) or something else
 *  already owns the hover (a native tooltip), so no peek. */
const SKIP = '.face-bar, [title]';
const GAP = 12;
const MARGIN = 8;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

export function initCardPeek(options: CardPeekOptions): CardPeek {
	const { root } = options;
	const peekEl = document.getElementById('card-peek');
	const factsEl = peekEl?.querySelector<HTMLElement>('.peek-facts');
	const moreEl = peekEl?.querySelector<HTMLAnchorElement>('.peek-more');
	if (!peekEl || !factsEl || !moreEl) return { closeForDeckChange() {} };

	// --- faces ---------------------------------------------------------------

	function zoneOf(face: HTMLElement): string {
		if (face.closest('#bd-list')) return 'browser';
		if (face.closest('[data-champion-zone]')) return 'champion';
		return face.closest<HTMLElement>('[data-section]')?.dataset.section ?? 'deck';
	}

	function faceOf(target: EventTarget | null): { el: HTMLElement; key: FaceKey } | null {
		if (!(target instanceof Element)) return null;
		const el = target.closest<HTMLElement>(FACE);
		if (!el || !root.contains(el) || !el.dataset.slug) return null;
		return { el, key: faceKey(zoneOf(el), el.dataset.slug) };
	}

	/** The face for a key, looked up fresh: sections are rebuilt, so an element
	 *  remembered from an earlier event may be gone. */
	function findFace(key: FaceKey): HTMLElement | null {
		const { zone, slug } = parseFaceKey(key);
		const scope =
			zone === 'browser' ? '#bd-list' : zone === 'champion' ? '[data-champion-zone]' : `[data-section="${CSS.escape(zone)}"]`;
		return root.querySelector<HTMLElement>(`${scope} .face[data-slug="${CSS.escape(slug)}"]`);
	}

	// --- facts ---------------------------------------------------------------

	/** One fetch per card per visit. A failure resolves to null (no peek, no
	 *  error) and is forgotten so a later dwell can try again. */
	const cache = new Map<string, Promise<string | null>>();
	function factsFor(slug: string): Promise<string | null> {
		let pending = cache.get(slug);
		if (!pending) {
			pending = fetch(`/peek/${encodeURIComponent(slug)}.json`)
				.then((response) => (response.ok ? (response.json() as Promise<{ html?: unknown }>) : null))
				.then((body) => (body && typeof body.html === 'string' ? body.html : null))
				.catch(() => null);
			pending.then((html) => {
				if (html === null) cache.delete(slug);
			});
			cache.set(slug, pending);
		}
		return pending;
	}

	// --- show / place / hide ---------------------------------------------------

	let describedEl: Element | null = null;

	function place(face: HTMLElement): void {
		// measure while invisible, then reveal: the size depends on the text
		peekEl!.style.visibility = 'hidden';
		peekEl!.dataset.open = 'false';
		peekEl!.hidden = false;
		const r = face.getBoundingClientRect();
		const w = peekEl!.offsetWidth;
		const h = peekEl!.offsetHeight;
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;

		let left: number;
		let top: number;
		// which side of the face the peek sits on: the stylesheet lays an invisible
		// bridge across the gap on that side, so the pointer can cross onto the peek
		let side: 'right' | 'left' | 'below' | 'above';
		if (r.right + GAP + w <= vw - MARGIN) {
			// beside the face, right first
			left = r.right + GAP;
			top = clamp(r.top, MARGIN, vh - h - MARGIN);
			side = 'right';
		} else if (r.left - GAP - w >= MARGIN) {
			left = r.left - GAP - w;
			top = clamp(r.top, MARGIN, vh - h - MARGIN);
			side = 'left';
		} else {
			// a narrow window: above or below, whichever has the room
			left = clamp(r.left + r.width / 2 - w / 2, MARGIN, vw - w - MARGIN);
			const below = vh - r.bottom - GAP - MARGIN;
			const above = r.top - GAP - MARGIN;
			const under = below >= h || below >= above;
			top = under ? r.bottom + GAP : r.top - GAP - h;
			top = clamp(top, MARGIN, vh - h - MARGIN);
			side = under ? 'below' : 'above';
		}
		peekEl!.dataset.side = side;
		peekEl!.style.left = `${Math.round(left)}px`;
		peekEl!.style.top = `${Math.round(top)}px`;
		peekEl!.style.visibility = '';
		// Commit the closed (transparent, lowered) style, then open it: the reflow
		// makes the fade and lift run without waiting on a frame callback, so a
		// throttled frame clock can never leave the peek stuck invisible.
		void peekEl!.offsetHeight;
		peekEl!.dataset.open = 'true';
	}

	async function show(key: FaceKey): Promise<void> {
		const { slug } = parseFaceKey(key);
		const html = await factsFor(slug);
		// the pointer may have moved on while the fragment loaded
		if (html === null || intent.openKey() !== key) return;
		const face = findFace(key);
		if (!face) return;

		factsEl!.innerHTML = html;
		// the way on to the card page, and from it back to this deck
		moreEl!.href = cardPageHref(slug, `${location.pathname}${location.search}${location.hash}`);
		place(face);
		describedEl = face.querySelector('a, button');
		describedEl?.setAttribute('aria-describedby', peekEl!.id);
	}

	function hide(): void {
		peekEl!.dataset.open = 'false';
		peekEl!.hidden = true;
		describedEl?.removeAttribute('aria-describedby');
		describedEl = null;
	}

	const intent = createHoverIntent({
		onOpen: (key) => {
			void show(key);
		},
		onClose: hide,
	});

	// --- browser events -> inputs --------------------------------------------

	function onPointer(event: PointerEvent): void {
		const face = faceOf(event.target);
		const onControl = face !== null && (event.target as Element).closest(SKIP) !== null;
		intent.point(face && !onControl ? face.key : null, event.clientX, event.clientY, event.pointerType);
	}
	root.addEventListener('pointermove', onPointer);
	root.addEventListener('pointerover', onPointer);
	root.addEventListener('pointerleave', (event) => {
		intent.point(null, event.clientX, event.clientY, event.pointerType);
	});

	// the peek itself can be reached: while the pointer is on it, it stays
	peekEl.addEventListener('pointerenter', (event) => {
		if (event.pointerType !== 'touch') intent.hold(true);
	});
	peekEl.addEventListener('pointerleave', (event) => {
		if (event.pointerType !== 'touch') intent.hold(false);
	});

	// any press closes the peek; a press on a face also blocks that face until
	// the pointer leaves it (a click is an action, usually "add this card"). A
	// press on the peek is not one of those: it is how "See more" is clicked, and
	// closing the peek on the way down would take the link away before the click.
	document.addEventListener(
		'pointerdown',
		(event) => {
			if (event.target instanceof Node && peekEl.contains(event.target)) return;
			intent.press(faceOf(event.target)?.key ?? null, event.pointerType);
		},
		true,
	);
	root.addEventListener('dragstart', (event) => {
		intent.press(faceOf(event.target)?.key ?? null);
	});

	// scroll does not bubble, so listen in the capture phase for every scroller
	// (the browser column, the deck sheet, the page); a wheel counts even when
	// nothing can scroll, since the intent is the same
	document.addEventListener('scroll', () => intent.scroll('scroll'), { capture: true, passive: true });
	document.addEventListener('wheel', () => intent.scroll('wheel'), { capture: true, passive: true });
	document.addEventListener('keydown', (event) => intent.key(event.key), true);
	window.addEventListener('blur', () => intent.blur());
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) intent.blur();
	});

	// keyboard focus: only focus the keyboard put there (not a click's), and
	// moving between the controls of one face is not leaving it
	let focusKey: FaceKey | null = null;
	root.addEventListener('focusin', (event) => {
		const target = event.target as Element;
		const face = faceOf(target);
		let keyboard = false;
		try {
			keyboard = target.matches(':focus-visible');
		} catch {
			keyboard = false;
		}
		focusKey = face && keyboard ? face.key : null;
		intent.focus(focusKey);
	});
	root.addEventListener('focusout', (event) => {
		const next = faceOf(event.relatedTarget);
		if (next && next.key === focusKey) return;
		focusKey = null;
		intent.focus(null);
	});

	return {
		closeForDeckChange() {
			intent.deckChanged();
		},
	};
}
