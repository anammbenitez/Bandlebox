// The card's art state shared by the card page and the "See more" modal: the
// foil switch, and which printing's art is shown (the player's remembered
// choice, else the catalog default). Choosing a printing remembers it.
import { useState } from 'react';
import type { CardDetailData } from '../../../domain/card-detail.ts';
import { setPreferredImage } from '../../../domain/printing-preference.ts';
import { usePreferredImage } from '../../hooks/usePreferredImage.ts';

export function useCardArt(card: CardDetailData) {
	const [foil, setFoil] = useState(false);
	const preferred = usePreferredImage(card.slug);
	const chosen = preferred && card.sets.some((set) => set.printings.some((p) => p.thumbImageId === preferred)) ? preferred : null;
	const imageId = chosen ?? card.hero?.imageId ?? null;
	const shown = chosen ? (card.sets.flatMap((set) => set.printings).find((p) => p.thumbImageId === chosen)?.code ?? card.shown) : card.shown;
	return { foil, setFoil, imageId, shown, select: (id: string) => setPreferredImage(card.slug, id) };
}
