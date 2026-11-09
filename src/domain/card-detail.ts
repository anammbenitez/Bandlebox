// What the card detail page shows, as plain data (openspec change
// migrate-to-react, design D3): built at build time by
// src/server/card-detail.ts from the snapshot, rendered by
// src/features/card-detail. Every label is resolved already, so the page's
// components never touch the catalog.

import type { CardStat } from './card-stats.ts';

export interface CardDetailPrinting {
	key: string;
	/** Public code, else short code, else "—". */
	code: string;
	/** For the thumbnail's alt text: public code, else short code, else the set. */
	altCode: string;
	rarity: string;
	finish: string;
	/** Shown as a tag only when the art variant is not "normal". */
	artVariant: string | null;
	isSigned: boolean;
	isOvernumbered: boolean;
	/** Shown as a tag only when the size is not "standard". */
	size: string | null;
	/** Only when it differs from the card's name. */
	printedName: string | null;
	artist: string | null;
	language: string;
	channels: string[];
	markers: string[];
	comment: string | null;
	thumbImageId: string | null;
	/** The back face of a two-sided printing. */
	side2: { name: string; slug: string | null; publicCode: string | null } | null;
}

export interface CardDetailSet {
	slug: string;
	name: string;
	printings: CardDetailPrinting[];
}

export interface CardDetailData {
	slug: string;
	name: string;
	/** Battlefields are landscape. */
	rotate: boolean;
	hero: { imageId: string; alt: string } | null;
	/** "OGN-066/298 · Normal art", or null. */
	shown: string | null;
	types: string[];
	superTypes: string[];
	domains: string[];
	stats: CardStat[];
	maxCopiesOverride: number | null;
	errata: { text: string; effectiveDate: string | null; source: string | null; sourceUrl: string | null } | null;
	bans: Array<{ format: string; bannedAt: string | null; reason: string | null }>;
	effectText: string | null;
	rulesText: string | null;
	flavorText: string | null;
	printingCount: number;
	sets: CardDetailSet[];
}
