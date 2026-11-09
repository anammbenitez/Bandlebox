// The card page's way back (card-catalog-browser spec, "Back to deck"). The
// link is rendered by React as plain HTML reading "All cards"; this behavior
// turns it into "Back to deck" when the deck manager sent the reader here
// (?from=<the deck's address>). When the page before this one in the tab is
// that very deck, the browser's own back restores it exactly as it was left;
// otherwise the link goes to the deck's address.
//
// A framework-free behavior rather than a React island (design D8): it is
// the card page's only interactive bit, and an island would ship the whole
// React runtime to all 1,106 card pages for it.

import { cameFromBuilder, returnTarget } from '../domain/deck-return.ts';

export function enhanceDeckReturnLink(doc: Document, location: Location, history: History, referrer: string = doc.referrer): void {
	const link = doc.getElementById('back-link') as HTMLAnchorElement | null;
	const label = doc.getElementById('back-label');
	const target = returnTarget(location.search);
	if (!link || !label || !target) return;
	link.href = target;
	label.textContent = 'Back to deck';
	link.addEventListener('click', (event) => {
		const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
		if (plain && history.length > 1 && cameFromBuilder(referrer, location.origin)) {
			event.preventDefault();
			history.back();
		}
	});
}

// Pages now swap without a reload, so `document.referrer` stays the address the
// tab first loaded: the previous page is tracked here, and the link is upgraded
// again on every page.
if (typeof document !== 'undefined') {
	let previous = document.referrer;
	let current = window.location.href;
	document.addEventListener('astro:page-load', () => {
		if (window.location.href !== current) {
			previous = current;
			current = window.location.href;
		}
		enhanceDeckReturnLink(document, window.location, window.history, previous);
	});
}
