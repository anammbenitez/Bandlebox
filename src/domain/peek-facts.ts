// The facts a card's peek shows (card-peek spec): one fixed layout for every
// card, so a player reads it by position. Built at build time by the
// /peek/[slug].json endpoint, fetched on demand, rendered by the React
// PeekFacts component (src/ui/organisms/peek). Every fact is the
// card's own; the description is the printing's printed text only (a card's
// `keywords` field is a search index, never rendered).
//
// Pure: no data imports, no DOM.

import type { CardStat } from './card-stats.ts';

export interface PeekFacts {
	name: string;
	/** Display labels, e.g. ["Unit"]. */
	types: string[];
	/** Display labels, e.g. ["Champion"]; read before the types ("Champion Unit"). */
	superTypes: string[];
	domains: Array<{ slug: string; label: string }>;
	stats: CardStat[];
	effectText: string | null;
	rulesText: string | null;
	/** Banned in Constructed: the one deck-independent rule verdict the peek carries. */
	banned?: boolean;
}
