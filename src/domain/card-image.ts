// Card image delivery: the single owner of how card art is requested from
// OpenRift (openspec: card-catalog-browser, "Card art resolution follows
// display size"). Surfaces name a ROLE; this module decides the URL, the
// variant, the degrade-then-remove fallback and the intrinsic dimensions.
//
// Pure on purpose (no data or DOM imports, explicit `.ts` relative imports
// elsewhere): it runs in SSR front matter, in browser scripts, and under the
// Node verify scripts. Images are never mirrored locally.

export const OPENRIFT_SITE = 'https://openrift.app';

/** The only sizes OpenRift serves (WebP; nothing larger than `full` exists). */
export type ImageVariant = '240w' | '400w' | 'full';

/**
 * What a surface *is*, not how many pixels it uses:
 *  - hero:  the card detail page's main image (~300 CSS px)
 *  - tile:  card faces and tiles (grid, deck manager, library covers)
 *  - thumb: genuinely small images (Legend picker, printings list)
 */
export type ImageRole = 'hero' | 'tile' | 'thumb';

/** Preferred variant first; each failure steps down, then the image is removed. */
export const ROLE_CHAIN: Readonly<Record<ImageRole, readonly ImageVariant[]>> = {
	hero: ['full', '400w', '240w'],
	tile: ['400w', '240w'],
	thumb: ['240w'],
};

/** Measured intrinsic portrait sizes per variant (battlefields are the same, rotated). */
const PORTRAIT_SIZE: Readonly<Record<ImageVariant, readonly [number, number]>> = {
	'240w': [240, 335],
	'400w': [400, 559],
	full: [744, 1039],
};

export function imageUrl(imageId: string, variant: ImageVariant = '240w'): string {
	// encodeURIComponent keeps `'`; escape it too, so a URL never carries a
	// quote (and never a space: the fallback list is space-separated).
	const id = encodeURIComponent(imageId).replace(/'/g, '%27');
	return `${OPENRIFT_SITE}/media/cards/${id}-${variant}.webp`;
}

/** Every URL for a role, best first. */
export function imageSources(imageId: string, role: ImageRole): string[] {
	return ROLE_CHAIN[role].map((variant) => imageUrl(imageId, variant));
}

/** Intrinsic size of the role's preferred variant; swapped for rotated (battlefield) art. */
export function imageDims(role: ImageRole, rotate = false): { width: number; height: number } {
	const [w, h] = PORTRAIT_SIZE[ROLE_CHAIN[role][0]!];
	return rotate ? { width: h, height: w } : { width: w, height: h };
}

export interface ImgAttrs {
	src: string;
	width: number;
	height: number;
	/** The smaller variants to try, best first, space-separated: the page's
	 *  image-fallback behavior (src/behaviors/image-fallback.ts) walks them on
	 *  failure and removes the image when none is left. */
	fallback: string;
}

/** The attributes every card `<img>` needs: src, size, and its fallback chain
 *  (rendered as `data-fallback`). */
export function imgAttrs(imageId: string, role: ImageRole, opts: { rotate?: boolean } = {}): ImgAttrs {
	const [src, ...rest] = imageSources(imageId, role) as [string, ...string[]];
	return { src, ...imageDims(role, opts.rotate), fallback: rest.join(' ') };
}
