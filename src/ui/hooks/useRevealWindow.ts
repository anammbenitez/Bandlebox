// Windowed reveal in fixed steps (the catalog grid and the deck manager's
// browser): while the
// sentinel after the last tile is within two screens of the viewport, show
// one more step. Runs after every render, so a very tall viewport fills at
// once, and an IntersectionObserver wakes it when scrolling nears the end.
import { useEffect, useLayoutEffect, useReducer, type RefObject } from 'react';
import { GRID_STEP } from '../../domain/grid-item.ts';

export function useRevealWindow(options: {
	sentinel: RefObject<HTMLElement | null>;
	enabled: boolean;
	shown: number;
	available: number;
	grow: (next: number) => void;
}): void {
	const { sentinel, enabled, shown, available, grow } = options;
	const [tick, wake] = useReducer((n: number) => n + 1, 0);

	useEffect(() => {
		const el = sentinel.current;
		if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(() => wake(), { rootMargin: '100% 0px' });
		io.observe(el);
		return () => io.disconnect();
	}, [enabled, sentinel]);

	useLayoutEffect(() => {
		const el = sentinel.current;
		if (!enabled || !el || shown >= available) return;
		if (el.getBoundingClientRect().top <= window.innerHeight * 2) grow(Math.min(shown + GRID_STEP, available));
	}, [enabled, sentinel, shown, available, grow, tick]);
}
