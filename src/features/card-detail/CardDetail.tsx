// The card detail page body: rendered at build (readable without JavaScript)
// and hydrated for two controls: the foil switch under the card, which lights
// up the hero and every foil printing's art, and the printing list in the side
// column, where picking a printing makes its art the card's default across the app.
import type { CardDetailData } from '../../domain/card-detail.ts';
import { CardFacts } from '../../ui/organisms/card-detail/CardFacts.tsx';
import { CardHero } from '../../ui/organisms/card-detail/CardHero.tsx';
import { PrintingsTable } from '../../ui/organisms/card-detail/PrintingsTable.tsx';
import { useCardArt } from '../../ui/organisms/card-detail/useCardArt.ts';

export function CardDetail({ card }: { card: CardDetailData }) {
	const { foil, setFoil, imageId, shown, select } = useCardArt(card);
	return (
		<article className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)] lg:min-h-0 lg:flex-1 lg:grid-cols-[clamp(15rem,22vw,26rem)_minmax(0,1fr)_clamp(20rem,26vw,30rem)] lg:grid-rows-[minmax(0,1fr)] lg:gap-x-10">
			<CardHero card={card} foil={foil} imageId={imageId} shown={shown} onFoilChange={setFoil} />
			<div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
				<CardFacts card={card} />
			</div>
			<aside
				aria-label="Printings"
				className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:col-span-2 lg:col-span-1 lg:max-h-full lg:min-h-0 lg:self-start lg:overflow-y-auto lg:overscroll-contain"
			>
				<PrintingsTable card={card} foil={foil} selected={imageId} onSelect={select} />
			</aside>
		</article>
	);
}
