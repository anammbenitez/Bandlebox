// SSR-only step of the catalog grid plumbing (task 5.1): the payload build
// shared by the browse page and the deck manager. Decks builder never needs
// more card facts than the browser shows, so both pages ship byte-identical
// shapes from one place — no divergent payloads to keep in step.

import { cardSearchText, index, isBattlefield, representativePrinting } from './catalog';
import { GRID_STEP, type GridArt, type GridEntry, type GridItemData } from '../domain/grid-item';

export type { GridArt, GridEntry };

/** Full-catalog client filter payload, exactly as the browse page has always
 *  shipped it (types/rarities/sets/search text per entry). */
export function buildGridPayload(): GridEntry[] {
	return index.cards.map((card) => {
		const rep = representativePrinting(card);
		const imageId = rep?.imageIds[0];
		return {
			slug: card.slug,
			name: card.name,
			types: card.types,
			rarities: [...new Set(card.printings.map((p) => p.rarity).filter((r): r is string => Boolean(r)))],
			sets: [...new Set(card.printings.map((p) => p.setSlug))],
			variants: card.printings.length,
			text: cardSearchText(card),
			meta: `${rep?.rarity ?? '—'} · ${card.types.join(' / ')}`,
			art: imageId
				? {
						imageId,
						rotate: isBattlefield(card),
						setSlug: rep?.setSlug ?? '',
					}
				: null,
		};
	});
}

/** `<`-escaped JSON for a `type="application/json"` script tag (a card's rules
 *  text can never close the tag early this way). */
export function escapedJson(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

export { GRID_STEP };
export type { GridItemData };
