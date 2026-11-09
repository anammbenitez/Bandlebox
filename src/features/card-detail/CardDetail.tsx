// The card detail page body (static: rendered at build, readable without
// JavaScript). The back link above it is a separate island.
import type { CardDetailData } from '../../domain/card-detail.ts';
import { CardFacts } from './CardFacts.tsx';
import { CardHero } from './CardHero.tsx';
import { PrintingsTable } from './PrintingsTable.tsx';

export function CardDetail({ card }: { card: CardDetailData }) {
	return (
		<>
			<article className="mt-3 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
				<CardHero card={card} />
				<CardFacts card={card} />
			</article>
			<PrintingsTable card={card} />
		</>
	);
}
