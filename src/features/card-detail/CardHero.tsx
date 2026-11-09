// The card's art at hero size. The stage is the card's own box and never
// moves; the face inside it leans away from the mouse (the card-tilt
// behavior reads data-tilt / data-tilt-face; angles live in global.css).
import { CardImage } from '../../ui/atoms/CardImage.tsx';
import type { CardDetailData } from '../../domain/card-detail.ts';

export function CardHero({ card }: { card: CardDetailData }) {
	return (
		<div className="lg:sticky lg:top-20 lg:self-start">
			<div data-tilt="large" className="mx-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:mx-0 lg:max-w-none">
				<div
					data-tilt-face=""
					data-landscape={card.rotate ? '' : undefined}
					className={`card-corner relative ${card.rotate ? 'aspect-[7/5]' : 'aspect-[5/7]'} w-full overflow-hidden bg-slate-900`}
				>
					<div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">no art</div>
					{card.hero && (
						<CardImage
							imageId={card.hero.imageId}
							role="hero"
							rotate={card.rotate}
							alt={card.hero.alt}
							fetchPriority="high"
							className="absolute inset-0 h-full w-full object-cover"
						/>
					)}
				</div>
			</div>
			{card.shown && <p className="mt-2 text-xs text-slate-500 tnum">Shown: {card.shown}</p>}
		</div>
	);
}
