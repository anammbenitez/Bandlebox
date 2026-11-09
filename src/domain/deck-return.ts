// src/domain/deck-return.ts — the way back from a card page to the deck being
// built (spec: card-peek, the peek leads to the card page; card-catalog-browser,
// the card page's back link).
//
// The deck manager links to a card page with `?from=<its own address>`, so the
// card page can send the reader back to exactly the deck they were building
// without any server, any stored state, or any guessing: the link carries it.
// That also holds for a link opened in a new tab or shared by hand.
//
// The `from` value comes from a URL, so it is untrusted: only an address inside
// the deck manager is ever accepted, and anything else is ignored (the back link
// then keeps its default, All cards).
//
// Pure: no DOM, no data imports. Explicit .ts extensions on relative imports.

/** The query parameter a card page reads its way back from. */
export const RETURN_PARAM = 'from';

/** The deck manager's route: the only place a card page will send a reader back to. */
export const BUILDER_PATH = '/decks/build';

/** Longest return address accepted. A shared deck travels in the hash, so the
 *  address can be long, but not unboundedly so. */
const MAX_LENGTH = 8000;

/** True for an address inside the deck manager: its route, then nothing, a
 *  query or a hash (`#d/<id>` for a saved deck, `#s/<payload>` for a shared one). */
function isBuilderAddress(value: string): boolean {
	if (value.length > MAX_LENGTH) return false;
	// no control characters or backslashes (a browser may read "\" as "/")
	if (/[\u0000-\u001f\u007f\\]/u.test(value)) return false;
	if (!value.startsWith(BUILDER_PATH)) return false;
	const next = value.charAt(BUILDER_PATH.length);
	return next === '' || next === '#' || next === '?';
}

/** The card page's address for `slug`, remembering where the reader came from.
 *  `builderAddress` is the deck manager's own path + query + hash; anything that
 *  is not one is dropped and the plain card address comes back. */
export function cardPageHref(slug: string, builderAddress: string): string {
	const base = `/cards/${encodeURIComponent(slug)}`;
	return isBuilderAddress(builderAddress) ? `${base}?${RETURN_PARAM}=${encodeURIComponent(builderAddress)}` : base;
}

/** The deck manager address a card page's query string asks to return to, or
 *  null when it names none (or names something that is not the deck manager). */
export function returnTarget(search: string): string | null {
	const value = new URLSearchParams(search).get(RETURN_PARAM);
	return value !== null && isBuilderAddress(value) ? value : null;
}

/** True when `referrer` is the deck manager on the same site: the previous page
 *  in this tab's history is then the deck being built, so "back" can be the
 *  browser's own back, which restores the page as it was left. */
export function cameFromBuilder(referrer: string, origin: string): boolean {
	try {
		const url = new URL(referrer);
		return url.origin === origin && url.pathname === BUILDER_PATH;
	} catch {
		return false;
	}
}
