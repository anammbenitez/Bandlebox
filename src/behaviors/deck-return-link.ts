// The card page's way back (card-catalog-browser spec, the Back button). It is
// the previous page, always: when the page before this one in the tab is on this
// site, the browser's own back restores it exactly as it was left; otherwise
// (a link opened in a new tab) the link goes to the address the card link
// carried (?from=...), or to the card grid.
//
// A framework-free behavior rather than a React island (design D8): it is
// the card page's only interactive bit, and an island would ship the whole
// React runtime to all 1,106 card pages for it.

import { cameFromSite, returnTarget } from '../domain/deck-return.ts';

export function enhanceBackLink(doc: Document, location: Location, history: History, referrer: string = doc.referrer): void {
	const link = doc.getElementById('back-link') as HTMLAnchorElement | null;
	if (!link) return;
	const target = returnTarget(location.search);
	if (target) link.href = target;
	link.addEventListener('click', (event) => {
		const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
		// `index` is the router's own count of in-site navigations in this tab: above
		// zero, the previous entry is a page of this site even though
		// `document.referrer` still names whatever the tab first loaded.
		const navigated = Number((history.state as { index?: number } | null)?.index ?? 0) > 0;
		if (plain && history.length > 1 && (navigated || cameFromSite(referrer, location.origin))) {
			event.preventDefault();
			history.back();
		}
	});
}

// Pages swap without a reload, so the link is upgraded again on every page.
if (typeof document !== 'undefined') {
	document.addEventListener('astro:page-load', () => enhanceBackLink(document, window.location, window.history));
}
