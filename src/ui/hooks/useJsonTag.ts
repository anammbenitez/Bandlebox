// Reading a JSON payload the page carries in a
// `<script type="application/json" id="…">` tag. Each tag element is parsed
// once (the router keeps this module alive across pages, and a new page brings
// a new element) and the same value is returned afterwards (a stable snapshot, as
// `useSyncExternalStore` needs). A missing or malformed tag reads as `null`
// rather than throwing, so a broken payload degrades to an empty page.
import { useSyncExternalStore } from 'react';

let cache = new WeakMap<Element, unknown>();

export function readJsonTag<T>(id: string): T | null {
	const tag = document.getElementById(id);
	if (!tag) return null;
	if (cache.has(tag)) return cache.get(tag) as T | null;
	let value: T | null = null;
	try {
		if (tag.textContent) value = JSON.parse(tag.textContent) as T;
	} catch {
		// malformed JSON: treated as absent
	}
	cache.set(tag, value);
	return value;
}

/** For tests: forget what was read. */
export function clearJsonTagCache(): void {
	cache = new WeakMap();
}

const noSubscribe = () => () => {};

/** The tag's value once the page runs; `null` during the build render and the
 *  hydration pass (so server and first client render agree), and when the tag
 *  is absent or malformed. */
export function useJsonTag<T>(id: string): T | null {
	return useSyncExternalStore(
		noSubscribe,
		() => readJsonTag<T>(id),
		() => null,
	);
}
