// A card in the catalog grid: its art (leaning away from the mouse through
// the card-tilt behavior, which reads `data-tilt` / `data-tilt-face`), name,
// rarity and type, and set. The whole tile links to the card's page.
import { CardImage } from '../atoms/CardImage.tsx';
import styles from './CardTile.module.css';

export interface CardTileArt {
	imageId: string;
	rotate: boolean;
	setSlug: string;
}

export interface CardTileProps {
	slug: string;
	name: string;
	/** Precomputed "rarity · types" line. */
	meta: string;
	art: CardTileArt | null;
}

export function CardTile({ slug, name, meta, art }: CardTileProps) {
	const setBadge = (art?.setSlug ?? '').trim();
	const alt = setBadge ? `${name} card art (${setBadge})` : `${name} card art`;
	return (
		<a href={`/cards/${slug}`} className={`${styles.tile} group`} data-tilt="" title={name}>
			<div className={styles.art} data-tilt-face="">
				<div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">no art</div>
				{art && (
					<CardImage
						imageId={art.imageId}
						role="tile"
						rotate={art.rotate}
						alt={alt}
						loading="lazy"
						className={
							art.rotate
								? 'absolute left-1/2 top-1/2 w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90'
								: 'absolute inset-0 h-full w-full object-cover'
						}
					/>
				)}
			</div>
			<div className={`${styles.name} truncate`}>{name}</div>
			<div className={styles.meta}>
				<span className="truncate">{meta}</span>
				<span className={styles.set}>{setBadge || '—'}</span>
			</div>
		</a>
	);
}
