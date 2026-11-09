// Browsing position (card-catalog-browser spec: returning to the grid after
// following a card restores the same filters, depth and scroll position).
// The last scroll offset is kept per address in sessionStorage. Saving starts
// only after the restore has read it: the pre-React script saved first and so
// overwrote the position it was about to restore (a defect the parity suite
// recorded; fixed here).
import { useEffect, useState } from 'react';

const PLACE_KEY = 'browse-grid-place';

function here(): string {
	return `${window.location.pathname}${window.location.search}`;
}

/** Scrolls to the saved offset for the current address, if there is one.
 *  Tiles below the fold start at an estimated height (content-visibility), so
 *  the page can be shorter than the saved offset at first: keep re-applying it
 *  for up to 1.5s as the page grows, unless the reader scrolls meanwhile. */
export function restoreGridPlace(): void {
	let target: number;
	try {
		const place = JSON.parse(sessionStorage.getItem(PLACE_KEY) ?? 'null') as { href: string; y: number } | null;
		if (!place || place.href !== here()) return;
		target = place.y;
	} catch {
		return; // restore data missing or malformed: stay at the top
	}
	// Lay every revealed tile out once (index.astro: [data-measuring]): their
	// real heights are then remembered (contain-intrinsic-size: auto), so the
	// page has its true length and the offset is reachable.
	const list = document.getElementById('grid-list');
	list?.setAttribute('data-measuring', '');
	void document.documentElement.scrollHeight;
	requestAnimationFrame(() => list?.removeAttribute('data-measuring'));

	// Scroll anchoring also moves scrollY while tiles settle, so "the reader
	// moved" is judged by input, not by position.
	let moved = false;
	const INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
	const stop = () => {
		moved = true;
	};
	for (const type of INPUT) window.addEventListener(type, stop, { once: true, passive: true });
	const until = performance.now() + 1500;
	const step = () => {
		if (!moved) {
			const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
			window.scrollTo(0, Math.min(target, maxY));
			if (Math.abs(window.scrollY - target) > 1 && performance.now() < until) {
				requestAnimationFrame(step);
				return;
			}
		}
		for (const type of INPUT) window.removeEventListener(type, stop);
	};
	step();
}

/** Saves the scroll offset as the page scrolls; returns whether "Back to top"
 *  should show (more than one screenful scrolled). */
export function useGridPlace(enabled: boolean): boolean {
	const [pastFirstScreen, setPastFirstScreen] = useState(false);

	useEffect(() => {
		if (!enabled) return;
		let lastSave = 0;
		const route = window.location.pathname;
		const onScroll = () => {
			// The router swaps pages without a reload and resets the scroll first:
			// once the address is another page, that scroll is not the grid's place.
			if (window.location.pathname !== route) return;
			const y = window.scrollY;
			setPastFirstScreen(y > window.innerHeight);
			const now = Date.now();
			if (now - lastSave > 150) {
				lastSave = now;
				try {
					sessionStorage.setItem(PLACE_KEY, JSON.stringify({ href: here(), y }));
				} catch {
					// storage unavailable: restore degrades to the top
				}
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	}, [enabled]);

	return pastFirstScreen;
}
