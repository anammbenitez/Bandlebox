// Card art fallback (openspec change migrate-to-react, design D4/D8): when a
// card image fails, try the next smaller variant listed in its
// `data-fallback` attribute (space-separated URLs, best first); when none is
// left, remove the image so its "no art" placeholder shows instead of a
// broken-image icon.
//
// One capture-phase listener on the document serves every image on the page:
// server-rendered HTML, React islands, and images added later. It replaces
// the old per-image inline `onerror` strings, which React cannot render.
//
// `installImageFallback` must stay self-contained (no imports, no outer
// variables): Base.astro inlines its source into <head> so the listener
// exists before the first image can fail.

export function installImageFallback(doc: Document): void {
	const win = doc.defaultView as (Window & { __cardImageFallback?: boolean }) | null;
	if (!win || win.__cardImageFallback) return;
	win.__cardImageFallback = true;

	function degrade(img: HTMLImageElement): void {
		const rest = (img.getAttribute('data-fallback') ?? '').split(' ').filter(Boolean);
		const next = rest.shift();
		if (next === undefined) {
			img.remove();
			return;
		}
		img.setAttribute('data-fallback', rest.join(' '));
		img.src = next;
	}

	doc.addEventListener(
		'error',
		(event) => {
			const target = event.target as Element | null;
			if (target && target.tagName === 'IMG' && target.hasAttribute('data-fallback')) {
				degrade(target as HTMLImageElement);
			}
		},
		true,
	);

	// Images that failed before the listener existed (only possible when the
	// script runs late, e.g. in tests or when inlined after content).
	for (const img of Array.from(doc.querySelectorAll<HTMLImageElement>('img[data-fallback]'))) {
		if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) degrade(img);
	}
}
