// The catalog grid's data shapes and step size. The tile itself is the React
// CardTile (src/ui/molecules); the payload is built by src/server/grid-payload.ts.
// Client-safe: no data imports.

export interface GridArt {
	/** OpenRift image id; the tile derives its URL via card-image.ts. */
	imageId: string;
	rotate: boolean;
	setSlug: string;
}

/** Everything the visible grid item needs (payload entry extends this). */
export interface GridItemData {
	slug: string;
	name: string;
	/** Precomputed "rarity / types" display line. */
	meta: string;
	/** Null for cards without art (placeholder only). */
	art: GridArt | null;
}

/** A grid entry with everything the client filters on (built by
 *  src/server/grid-payload.ts, read by the grid and the deck manager browser). */
export interface GridEntry extends GridItemData {
	types: string[];
	rarities: string[];
	sets: string[];
	variants: number;
	/** Name plus printed text, for free-text search. */
	text: string;
}

/** One reveal step / initial static window. 60 fills whole rows at every
 *  column count the layout uses (2/3/4/5 -> 30/20/15/12 rows). */
export const GRID_STEP = 60;
