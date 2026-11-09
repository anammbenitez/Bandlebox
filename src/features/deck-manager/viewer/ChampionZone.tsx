// The champion zone beside the Legend (deck-manager spec): the pick shown as a
// face with its copy count out of three, a button to pick or switch (the
// browser then places the next matching click), and a drop target that takes a
// champion unit carrying the Legend's tag.
import { useState, type DragEvent } from 'react';
import { qtyOf, type Deck } from '../../../domain/deck.ts';
import { copyLimit, fitsChampionZone, isChampionUnit } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import type { GridArt } from '../../../domain/grid-item.ts';
import { FaceArt, ICON_MINUS, ICON_PLUS, ICON_TRASH } from '../faces.tsx';

const CHAMPION_CHIP_CAP = 3;

export interface ChampionZoneProps {
	deck: Deck;
	idx: DeckRuleIndexes;
	/** Art of the picked champion, if there is one. */
	art: GridArt | null | undefined;
	shared: boolean;
	picking: boolean;
	/** The slug being dragged from the browser, if any. */
	dragging: string | null;
	onChangeQty(delta: number, from: HTMLElement): void;
	onRemove(): void;
	/** A card was dropped here; `zone` is this zone, for a refusal flash. */
	onDrop(slug: string, zone: HTMLElement): void;
	onTogglePicking(): void;
}

export function ChampionZone({ deck, idx, art, shared, picking, dragging, onChangeQty, onRemove, onDrop, onTogglePicking }: ChampionZoneProps) {
	const [accept, setAccept] = useState(false);
	const slug = deck.champion ?? '';
	const placed = Boolean(slug) && fitsChampionZone(deck, idx, slug);
	const qty = placed ? qtyOf(deck.main, slug) : 0;
	const cap = placed ? Math.min(CHAMPION_CHIP_CAP, copyLimit(idx, slug)) : CHAMPION_CHIP_CAP;
	const name = idx.names[slug] ?? slug;

	function onDragOver(event: DragEvent) {
		if (!dragging || shared || !fitsChampionZone(deck, idx, dragging)) return;
		event.stopPropagation();
		setAccept(true);
		event.preventDefault();
	}

	function onDropHere(event: DragEvent) {
		if (!dragging || shared) return;
		if (fitsChampionZone(deck, idx, dragging) || isChampionUnit(idx, dragging)) {
			event.preventDefault();
			event.stopPropagation();
			setAccept(false);
			onDrop(dragging, event.currentTarget as HTMLElement);
		}
	}

	return (
		<div
			data-champion-zone=""
			className={accept ? 'min-w-0 drag-accept' : 'min-w-0'}
			onDragOver={onDragOver}
			onDragLeave={(event) => {
				if (event.target === event.currentTarget) setAccept(false);
			}}
			onDrop={onDropHere}
		>
			<div className="flex items-baseline justify-between gap-2 px-0.5">
				<span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500">Champion</span>
				<span data-champion-count="" className="text-[10px] text-slate-400 tnum" aria-live="polite">
					{placed ? `${qty} / ${cap}` : `0 / ≤ ${CHAMPION_CHIP_CAP}`}
				</span>
			</div>
			<div data-champion-face="" className="mt-1.5">
				{placed ? (
					<div data-slug={slug} className="face relative aspect-[5/7] w-full max-w-32">
						<a href={`/cards/${slug}`} aria-label={name} className="absolute inset-0">
							<FaceArt art={art} />
						</a>
						<div title="Champion copies in the main deck" className="card-badge">
							C{qty}
						</div>
						{shared ? (
							<div className="face-bar justify-center">
								<span className="count-chip">× {qty} copies</span>
							</div>
						) : (
							<div className="face-bar">
								<button type="button" data-section-row="main" data-slug={slug} data-qty="-1" className="stepper" aria-label={`Pull a copy from ${name}`} onClick={(e) => onChangeQty(-1, e.currentTarget)}>
									{ICON_MINUS}
								</button>
								<span className="count-chip">{qty}</span>
								<button type="button" data-section-row="main" data-slug={slug} data-qty="1" className="stepper" aria-label={`Add a copy to ${name}`} onClick={(e) => onChangeQty(1, e.currentTarget)}>
									{ICON_PLUS}
								</button>
								<button type="button" data-section-row="main" data-slug={slug} data-qty="-1" data-remove="" className="stepper" aria-label={`Remove ${name} from the deck`} onClick={onRemove}>
									{ICON_TRASH}
								</button>
							</div>
						)}
					</div>
				) : shared ? (
					<div className="card-corner flex aspect-[5/7] w-full max-w-32 items-center justify-center border border-dashed border-slate-800 bg-slate-900/40 px-2 text-center text-[10px] leading-tight text-slate-500">
						no champion picked
					</div>
				) : (
					<div
						className={`card-corner flex aspect-[5/7] w-full max-w-32 flex-col items-center justify-center gap-1.5 border border-dashed ${picking ? 'border-amber-400/70' : 'border-slate-700'} bg-slate-900/40 px-2 text-center text-slate-500`}
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
						<span className="text-[10px] leading-tight">champion unit of the legend's tag</span>
					</div>
				)}
			</div>
			<button type="button" data-champion-pick="" aria-pressed={picking} disabled={shared} className="btn mt-1.5 w-full" data-size="sm" onClick={onTogglePicking}>
				{picking ? 'Picking — click a champion' : deck.champion ? 'Switch champion' : 'Select champion'}
			</button>
		</div>
	);
}
