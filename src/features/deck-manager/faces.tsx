// Card faces in the deck manager: every face is tile-role art (400w, then
// 240w, then removed), battlefields drawn sideways in portrait boxes.
import type { GridArt } from '../../domain/grid-item.ts';
import { CardImage } from '../../ui/atoms/CardImage.tsx';

export const ICON_MINUS = (
	<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
		<path d="M3 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
	</svg>
);
export const ICON_PLUS = (
	<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
		<path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
	</svg>
);
export const ICON_TRASH = (
	<svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
		<path d="M2 3.1h6M4 3.1V2.1h2v1M3.1 3.1l.45 4.9h2.9l.45-4.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

/** A face's art; `landscape` keeps battlefield art unrotated in a wide box. */
export function FaceArt({ art, landscape = false }: { art: GridArt | null | undefined; landscape?: boolean }) {
	if (!art) return <span className="absolute inset-0 grid place-items-center text-[10px] text-slate-500">no art</span>;
	if (art.rotate && !landscape) return <CardImage imageId={art.imageId} role="tile" rotate alt="" loading="lazy" data-rotate="" />;
	return <CardImage imageId={art.imageId} role="tile" rotate={art.rotate} alt="" loading="lazy" className="h-full w-full object-cover" />;
}
