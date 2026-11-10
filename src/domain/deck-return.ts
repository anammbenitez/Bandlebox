// src/domain/deck-return.ts — the way back from a card page to the page it was
// opened from (spec: card-peek, the peek leads to the card page; card-catalog-
// browser, the card page's Back button).
//
// Every place that links to a card page (the deck manager's faces and peek, the
// Legend picker's peek, ...) adds `?from=<its own address>`, so the card page's
// Back button can return to exactly that page without any server, any stored
// state, or any guessing: the link carries it. That also holds for a link opened
// in a new tab or shared by hand. When the browser's own history has the
// previous page, Back is the browser's back, which restores the page as left.
//
// The `from` value comes from a URL, so it is untrusted: only an address inside
// this site is ever accepted, and anything else is ignored (Back then keeps its
// default, the card grid).
//
// Pure: no DOM, no data imports. Explicit .ts extensions on relative imports.

/** The query parameter a card page reads its way back from. */
export const RETURN_PARAM = 'from';

/** Longest return address accepted. A shared deck travels in the hash, so the
 *  address can be long, but not unboundedly so. */
const MAX_LENGTH = 8000;

/** True for an address inside this site: a path (`/decks`, `/decks/build#d/x`),
 *  never another origin, a protocol-relative `//host` or a scheme. */
function isSiteAddress(value: string): boolean {
	if (value.length > MAX_LENGTH) return false;
	// no control characters or backslashes (a browser may read "\" as "/")
	if (/[\u0000-\u001f\u007f\\]/u.test(value)) return false;
	return value.startsWith('/') && !value.startsWith('//');
}

/** The card page's address for `slug`, remembering where the reader came from.
 *  `fromAddress` is the linking page's own path + query + hash; anything that is
 *  not a site address is dropped and the plain card address comes back. */
export function cardPageHref(slug: string, fromAddress: string): string {
	const base = `/cards/${encodeURIComponent(slug)}`;
	return isSiteAddress(fromAddress) ? `${base}?${RETURN_PARAM}=${encodeURIComponent(fromAddress)}` : base;
}

/** The site address a card page's query string asks to return to, or null when
 *  it names none (or names something that is not a site address). */
export function returnTarget(search: string): string | null {
	const value = new URLSearchParams(search).get(RETURN_PARAM);
	return value !== null && isSiteAddress(value) ? value : null;
}

/** True when `referrer` is a page of this site: the previous page in this tab's
 *  history is then the page the reader came from, so "back" can be the browser's
 *  own back, which restores that page as it was left. */
export function cameFromSite(referrer: string, origin: string): boolean {
	try {
		return new URL(referrer).origin === origin;
	} catch {
		return false;
	}
}
