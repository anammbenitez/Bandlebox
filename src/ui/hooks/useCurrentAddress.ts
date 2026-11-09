// The page's own address (`pathname + search + hash`), for links that must
// lead back here (a card page remembers the deck it was opened from). It is
// re-read on every render, so an address changed by `history.replaceState`
// (which fires no event) shows on the next render; `hashchange` and
// `popstate` re-render it when the reader navigates. Empty on the server and
// during the hydration pass, so both agree.
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
	window.addEventListener('hashchange', onChange);
	window.addEventListener('popstate', onChange);
	document.addEventListener('astro:page-load', onChange);
	return () => {
		window.removeEventListener('hashchange', onChange);
		window.removeEventListener('popstate', onChange);
		document.removeEventListener('astro:page-load', onChange);
	};
}

const read = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

export function useCurrentAddress(): string {
	return useSyncExternalStore(subscribe, read, () => '');
}
