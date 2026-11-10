// One saved deck in the library: the Legend's art as its face (leaning away
// from the mouse through the card-tilt behavior), its live legality badge, its
// counts, and Rename / Delete (Delete asks in place before it removes).
import { DECK_RULES, sectionTotal, type Deck } from '../../domain/deck.ts';
import { usePreferredImage } from '../../ui/hooks/usePreferredImage.ts';
import { CardImage } from '../../ui/atoms/CardImage.tsx';
import { VerdictBadge } from '../../ui/molecules/VerdictBadge.tsx';
import styles from './DeckLibrary.module.css';

export interface LegendEntry {
	slug: string;
	name: string;
	/** The real Legend name(s), e.g. Ahri; searchable in the picker. */
	tags: string[];
	/** The Legend's domains (slugs), for the picker's domain filter. */
	domains: string[];
	/** OpenRift image id; covers use the tile role, the picker the thumb role. */
	imageId: string | null;
}

/** A Legend's art as the browser remembers it: the printing the player chose on
 *  the card page (kept in localStorage like the decks), else the catalog's first. */
export function LegendArt({ legend, role, alt }: { legend: LegendEntry; role: 'tile' | 'thumb'; alt: string }) {
	const preferred = usePreferredImage(legend.slug);
	const imageId = preferred ?? legend.imageId;
	if (!imageId) return <span className="grid h-full place-items-center text-slate-600">—</span>;
	return <CardImage imageId={imageId} role={role} alt={alt} loading="lazy" className="h-full w-full object-cover" />;
}

interface DeckTileProps {
	deck: Deck;
	legal: boolean;
	legend: LegendEntry | undefined;
	confirming: boolean;
	onRename: () => void;
	onDelete: () => void;
	onConfirm: () => void;
	onKeep: () => void;
}

function counts(deck: Deck): string {
	return `Main ${sectionTotal(deck.main)}/${DECK_RULES.mainSize} · Rune ${sectionTotal(deck.rune)}/${DECK_RULES.runeSize}`;
}

export function DeckTile({ deck, legal, legend, confirming, onRename, onDelete, onConfirm, onKeep }: DeckTileProps) {
	return (
		<li
			data-id={deck.id}
			data-tile=""
			className={`${styles.item} group`}
			data-tilt=""
			title={`${deck.name} · updated ${new Date(deck.updatedAt).toLocaleDateString()}`}
		>
			{/* Asking "Delete — sure?" needs the corner to itself, at any tile width. */}
			<VerdictBadge legal={legal} concealed={confirming} />
			{confirming ? (
				<span className="absolute left-1.5 top-1.5 z-10 flex flex-col items-start gap-1">
					<button type="button" data-deck-confirm="" className={styles.tileAction} data-variant="danger" onClick={onConfirm}>
						Delete — sure?
					</button>
					<button type="button" data-deck-cancel="" className={styles.tileAction} onClick={onKeep}>
						Keep
					</button>
				</span>
			) : (
				<span className="absolute top-1.5 left-1.5 z-10 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
					<button type="button" data-deck-rename="" className={styles.tileAction} onClick={onRename}>
						Rename
					</button>
					<button type="button" data-deck-delete="" className={styles.tileAction} onClick={onDelete}>
						Delete
					</button>
				</span>
			)}
			<a href={`/decks/build#d/${deck.id}`} aria-label={`Open ${deck.name}`} className={styles.face} data-tilt-face="">
				{legend ? (
					<LegendArt legend={legend} role="tile" alt={`Legend art for ${legend.name}`} />
				) : (
					<span className="absolute inset-0 grid place-items-center px-2 text-center text-[11px] text-slate-500">no legend chosen</span>
				)}
			</a>
			<div className={styles.label}>
				<span className={styles.name}>{deck.name}</span>
				<span className={`${styles.counts} tnum`}>{counts(deck)}</span>
			</div>
		</li>
	);
}

export function CreateTile({ onOpen }: { onOpen: () => void }) {
	return (
		<li className={styles.item}>
			<div className={styles.face} data-empty="">
				<button id="open-create-modal" type="button" aria-label="Create a new deck" className={styles.createTile} onClick={onOpen}>
					<span className={styles.createTileIcon}>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
						</svg>
					</span>
				</button>
			</div>
			<div className={styles.label}>
				<span className={styles.name}>New deck</span>
			</div>
		</li>
	);
}
