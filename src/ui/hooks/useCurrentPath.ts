// The page's pathname, for a component that stays mounted while the reader
// moves between pages (the site header persists across navigations, so a prop
// set at build would go stale). `initial` is what the server rendered and what
// the hydration pass shows; after it the live address wins. The router fires
// `astro:page-load` after each swap, `popstate` covers back and forward.
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
	document.addEventListener('astro:page-load', onChange);
	window.addEventListener('popstate', onChange);
	return () => {
		document.removeEventListener('astro:page-load', onChange);
		window.removeEventListener('popstate', onChange);
	};
}

export function useCurrentPath(initial: string): string {
	return useSyncExternalStore(subscribe, () => window.location.pathname, () => initial);
}
