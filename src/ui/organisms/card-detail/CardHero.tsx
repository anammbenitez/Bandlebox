// The card's art at hero size. The stage is the card's own box and never
// moves; the face inside it leans away from the mouse (the card-tilt
// behavior reads data-tilt / data-tilt-face; angles live in global.css).
import { CardImage } from '../../atoms/CardImage.tsx';
import type { CardDetailData } from '../../../domain/card-detail.ts';

interface CardHeroProps {
	card: CardDetailData;
	foil: boolean;
	/** The art to show: the printing the visitor chose, else the catalog's default. */
	imageId: string | null;
	shown: string | null;
	/** Flip the foil finish; the switch sits under the card it affects. */
	onFoilChange(next: boolean): void;
}

export function CardHero({ card, foil, imageId, shown, onFoilChange }: CardHeroProps) {
	const foilOn = foil && card.hasFoil;
	return (
		<div className="lg:min-h-0">
			<div data-tilt="large" className={`mx-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:mx-0 ${card.rotate ? 'lg:max-w-none' : 'lg:max-w-[calc((100dvh-19rem)*5/7)]'}`}>
				<div
					data-tilt-face=""
					data-landscape={card.rotate ? '' : undefined}
					data-foil={foilOn ? '' : undefined}
					className={`card-corner relative ${card.rotate ? 'aspect-[7/5]' : 'aspect-[5/7]'} w-full overflow-hidden bg-slate-900`}
				>
					<div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">no art</div>
					{card.hero && imageId && (
						<CardImage
							imageId={imageId}
							role="hero"
							rotate={card.rotate}
							alt={card.hero.alt}
							fetchPriority="high"
							className="absolute inset-0 h-full w-full object-cover"
						/>
					)}
				</div>
			</div>
			{card.hasFoil && (
				<button type="button" role="switch" aria-checked={foil} className="switch mt-2" onClick={() => onFoilChange(!foil)}>
					<span>Foil</span>
					<span className="switch-track" aria-hidden="true" />
				</button>
			)}
			{shown && <p className="mt-1 text-xs text-slate-500 tnum">Shown: {shown}</p>}
		</div>
	);
}
