// The card peek (card-peek spec): a non-modal card beside a card face that
// opens only after the pointer rests (or keyboard focus dwells), closes on any
// press, scroll or key, and can be reached to follow "See more". The timing is
// the pure state machine in domain/hover-intent.ts; this module wires it to
// the deck manager with delegated listeners on the manager's root (one set for
// every face, design D8) and renders the facts with React. "See more" opens the
// card's full detail in a modal (the card page's own components), keeping the
// link to the card page for modified clicks and the modal's bar.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { cardPageHref } from '../../../domain/deck-return.ts';
import { createHoverIntent, faceKey, parseFaceKey, type FaceKey, type HoverIntent } from '../../../domain/hover-intent.ts';
import type { PeekFacts as Facts } from '../../../domain/peek-facts.ts';
import { useCurrentAddress } from '../../hooks/useCurrentAddress.ts';
import { CardDetailModal } from '../card-detail/CardDetailModal.tsx';
import { PeekFacts } from './PeekFacts.tsx';

/** What a peek-able card face is, unless the host names its own. */
const DEFAULT_FACE = '.face';
/** Pointer over these means a click is coming (copy controls) or something
 *  else already owns the hover (a native tooltip), so no peek. */
const SKIP = '.face-bar, [title]';
const GAP = 12;
const MARGIN = 8;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

export interface CardPeekHandle {
	/** The deck is about to change: close, and stay closed until the pointer moves. */
	deckChanged(): void;
}

function zoneOf(face: HTMLElement): string {
	if (face.closest('#bd-list')) return 'browser';
	if (face.closest('[data-champion-zone]')) return 'champion';
	return face.closest<HTMLElement>('[data-section]')?.dataset.section ?? 'deck';
}

/** One fetch per card per visit; a failure is forgotten so a later dwell can retry. */
const cache = new Map<string, Promise<Facts | null>>();
function factsFor(slug: string): Promise<Facts | null> {
	let pending = cache.get(slug);
	if (!pending) {
		pending = fetch(`/peek/${encodeURIComponent(slug)}.json`)
			.then((response) => (response.ok ? (response.json() as Promise<{ facts?: Facts }>) : null))
			.then((body) => body?.facts ?? null)
			.catch(() => null);
		void pending.then((facts) => {
			if (facts === null) cache.delete(slug);
		});
		cache.set(slug, pending);
	}
	return pending;
}

interface Shown {
	key: FaceKey;
	slug: string;
	facts: Facts;
}

export const CardPeek = forwardRef<CardPeekHandle, { root: RefObject<HTMLElement | null>; faceSelector?: string }>(function CardPeek(
	{ root, faceSelector = DEFAULT_FACE },
	ref,
) {
	const [shown, setShown] = useState<Shown | null>(null);
	/** The card whose full detail is open in the modal ("See more"). */
	const [detailSlug, setDetailSlug] = useState<string | null>(null);
	const closeDetail = useCallback(() => setDetailSlug(null), []);
	const peekRef = useRef<HTMLDivElement>(null);
	const intentRef = useRef<HoverIntent | null>(null);

	useImperativeHandle(ref, () => ({ deckChanged: () => intentRef.current?.deckChanged() }), []);

	useEffect(() => {
		const rootEl = root.current;
		const peekEl = peekRef.current;
		if (!rootEl || !peekEl) return;

		const faceOf = (target: EventTarget | null): { el: HTMLElement; key: FaceKey } | null => {
			if (!(target instanceof Element)) return null;
			const el = target.closest<HTMLElement>(`${faceSelector}[data-slug]`);
			if (!el || !rootEl.contains(el) || !el.dataset.slug) return null;
			return { el, key: faceKey(zoneOf(el), el.dataset.slug) };
		};

		const intent = createHoverIntent({
			onOpen: (key) => {
				const { slug } = parseFaceKey(key);
				void factsFor(slug).then((facts) => {
					if (facts && intent.openKey() === key) setShown({ key, slug, facts });
				});
			},
			onClose: () => setShown(null),
		});
		intentRef.current = intent;

		const onPointer = (event: PointerEvent) => {
			const face = faceOf(event.target);
			const onControl = face !== null && (event.target as Element).closest(SKIP) !== null;
			intent.point(face && !onControl ? face.key : null, event.clientX, event.clientY, event.pointerType);
		};
		const onLeave = (event: PointerEvent) => intent.point(null, event.clientX, event.clientY, event.pointerType);
		const onPeekEnter = (event: PointerEvent) => {
			if (event.pointerType !== 'touch') intent.hold(true);
		};
		const onPeekLeave = (event: PointerEvent) => {
			if (event.pointerType !== 'touch') intent.hold(false);
		};
		const onDown = (event: PointerEvent) => {
			if (event.target instanceof Node && peekEl.contains(event.target)) return;
			intent.press(faceOf(event.target)?.key ?? null, event.pointerType);
		};
		const onDrag = (event: DragEvent) => intent.press(faceOf(event.target)?.key ?? null);
		const onScroll = () => intent.scroll('scroll');
		const onWheel = () => intent.scroll('wheel');
		const onKey = (event: KeyboardEvent) => intent.key(event.key);
		const onBlur = () => intent.blur();
		const onVisibility = () => {
			if (document.hidden) intent.blur();
		};
		let focusKey: FaceKey | null = null;
		const onFocusIn = (event: FocusEvent) => {
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
		};
		const onFocusOut = (event: FocusEvent) => {
			const next = faceOf(event.relatedTarget);
			if (next && next.key === focusKey) return;
			focusKey = null;
			intent.focus(null);
		};

		rootEl.addEventListener('pointermove', onPointer);
		rootEl.addEventListener('pointerover', onPointer);
		rootEl.addEventListener('pointerleave', onLeave);
		peekEl.addEventListener('pointerenter', onPeekEnter);
		peekEl.addEventListener('pointerleave', onPeekLeave);
		document.addEventListener('pointerdown', onDown, true);
		rootEl.addEventListener('dragstart', onDrag);
		document.addEventListener('scroll', onScroll, { capture: true, passive: true });
		document.addEventListener('wheel', onWheel, { capture: true, passive: true });
		document.addEventListener('keydown', onKey, true);
		window.addEventListener('blur', onBlur);
		document.addEventListener('visibilitychange', onVisibility);
		rootEl.addEventListener('focusin', onFocusIn);
		rootEl.addEventListener('focusout', onFocusOut);
		return () => {
			intent.destroy();
			intentRef.current = null;
			rootEl.removeEventListener('pointermove', onPointer);
			rootEl.removeEventListener('pointerover', onPointer);
			rootEl.removeEventListener('pointerleave', onLeave);
			peekEl.removeEventListener('pointerenter', onPeekEnter);
			peekEl.removeEventListener('pointerleave', onPeekLeave);
			document.removeEventListener('pointerdown', onDown, true);
			rootEl.removeEventListener('dragstart', onDrag);
			document.removeEventListener('scroll', onScroll, { capture: true });
			document.removeEventListener('wheel', onWheel, { capture: true });
			document.removeEventListener('keydown', onKey, true);
			window.removeEventListener('blur', onBlur);
			document.removeEventListener('visibilitychange', onVisibility);
			rootEl.removeEventListener('focusin', onFocusIn);
			rootEl.removeEventListener('focusout', onFocusOut);
		};
	}, [root, faceSelector]);

	// Place it beside its face once its size is known: right, else left, else
	// below or above, always inside the window. Then describe the face by it.
	useLayoutEffect(() => {
		const peekEl = peekRef.current;
		const rootEl = root.current;
		if (!peekEl || !rootEl || !shown) return;
		const { zone, slug } = parseFaceKey(shown.key);
		const scope = zone === 'browser' ? '#bd-list' : zone === 'champion' ? '[data-champion-zone]' : `[data-section="${CSS.escape(zone)}"]`;
		const face = rootEl.querySelector<HTMLElement>(`${scope} ${faceSelector}[data-slug="${CSS.escape(slug)}"]`);
		if (!face) return;
		peekEl.style.visibility = 'hidden';
		peekEl.dataset.open = 'false';
		const r = face.getBoundingClientRect();
		const w = peekEl.offsetWidth;
		const h = peekEl.offsetHeight;
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;
		let left: number;
		let top: number;
		let side: 'right' | 'left' | 'below' | 'above';
		if (r.right + GAP + w <= vw - MARGIN) {
			left = r.right + GAP;
			top = clamp(r.top, MARGIN, vh - h - MARGIN);
			side = 'right';
		} else if (r.left - GAP - w >= MARGIN) {
			left = r.left - GAP - w;
			top = clamp(r.top, MARGIN, vh - h - MARGIN);
			side = 'left';
		} else {
			left = clamp(r.left + r.width / 2 - w / 2, MARGIN, vw - w - MARGIN);
			const below = vh - r.bottom - GAP - MARGIN;
			const above = r.top - GAP - MARGIN;
			const under = below >= h || below >= above;
			top = clamp(under ? r.bottom + GAP : r.top - GAP - h, MARGIN, vh - h - MARGIN);
			side = under ? 'below' : 'above';
		}
		peekEl.dataset.side = side;
		peekEl.style.left = `${Math.round(left)}px`;
		peekEl.style.top = `${Math.round(top)}px`;
		peekEl.style.visibility = '';
		void peekEl.offsetHeight;
		peekEl.dataset.open = 'true';
		const described = face.matches('a, button') ? face : face.querySelector('a, button');
		described?.setAttribute('aria-describedby', peekEl.id);
		return () => described?.removeAttribute('aria-describedby');
	}, [shown, root, faceSelector]);

	const here = useCurrentAddress();
	const openDetail = (click: MouseEvent<HTMLAnchorElement>) => {
		// A plain click opens the full detail over this page; a modified click
		// (new tab, new window) keeps the link's own navigation to the card page.
		if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey || !shown) return;
		click.preventDefault();
		setDetailSlug(shown.slug);
		intentRef.current?.deckChanged();
	};
	return (
		<>
			<div ref={peekRef} id="card-peek" className="card-peek" role="group" aria-label="Card details" hidden={!shown} data-open="false">
				<div className="peek-facts">{shown && <PeekFacts facts={shown.facts} />}</div>
				<a className="btn peek-more" data-variant="link" href={shown ? cardPageHref(shown.slug, here) : '/cards'} onClick={openDetail}>
					<span>See more</span>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path d="M4.5 2.5 8 6 4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</a>
			</div>
			{detailSlug && <CardDetailModal slug={detailSlug} pageHref={cardPageHref(detailSlug, here)} onClose={closeDetail} />}
		</>
	);
});
