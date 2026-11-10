// The "See more" modal (card-peek spec): everything the card page shows for a
// card (art with its foil switch, facts, printed text, errata, bans, every
// printing), opened over whatever the player was doing, so they never lose
// their place. It reuses the card page's own components. The Escape key, the
// backdrop and Close dismiss it, and focus returns to what opened it.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CardDetailData } from '../../../domain/card-detail.ts';
import { useCardDetail } from '../../hooks/useCardDetail.ts';
import { CardFacts } from './CardFacts.tsx';
import { CardHero } from './CardHero.tsx';
import { PrintingsTable } from './PrintingsTable.tsx';
import { useCardArt } from './useCardArt.ts';

function Body({ card }: { card: CardDetailData }) {
	const { foil, setFoil, imageId, shown, select } = useCardArt(card);
	return (
		<div className="grid gap-x-8 gap-y-6 md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]">
			<CardHero card={card} foil={foil} imageId={imageId} shown={shown} onFoilChange={setFoil} />
			<CardFacts card={card} />
			<section aria-label="Printings" className="min-w-0 md:col-span-2">
				<PrintingsTable card={card} foil={foil} selected={imageId} onSelect={select} />
			</section>
		</div>
	);
}

export interface CardDetailModalProps {
	slug: string;
	/** The card's own page, for the link in the modal's bar. */
	pageHref: string;
	onClose: () => void;
}

export function CardDetailModal({ slug, pageHref, onClose }: CardDetailModalProps) {
	const state = useCardDetail(slug);
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		closeRef.current?.focus();
		const scroll = document.body.style.overflow;
		document.body.style.overflow = 'hidden'; // the page behind stays put
		const onKeyDown = (press: KeyboardEvent) => {
			if (press.key !== 'Escape') return;
			// Only the modal closes: a dialog underneath (the New deck picker) stays.
			press.stopPropagation();
			onClose();
		};
		document.addEventListener('keydown', onKeyDown, true);
		return () => {
			document.removeEventListener('keydown', onKeyDown, true);
			document.body.style.overflow = scroll;
			opener?.focus?.();
		};
	}, [onClose]);

	return createPortal(
		<div
			className="card-detail-modal-backdrop"
			onClick={(click) => {
				if (click.target === click.currentTarget) onClose();
			}}
		>
			<div role="dialog" aria-modal="true" aria-label={state.status === 'ready' ? `${state.detail.name}, full card details` : 'Card details'} className="card-detail-modal">
				<div className="card-detail-modal-bar">
					<a className="btn" data-variant="link" href={pageHref}>
						Open card page
					</a>
					<button ref={closeRef} type="button" className="btn" onClick={onClose}>
						Close
					</button>
				</div>
				<div className="card-detail-modal-body">
					{state.status === 'loading' && <p className="text-sm text-slate-400">Loading card details…</p>}
					{state.status === 'error' && (
						<p className="text-sm text-slate-300">
							The details could not be loaded.{' '}
							<a className="text-amber-300 hover:underline" href={pageHref}>
								Open the card page instead.
							</a>
						</p>
					)}
					{state.status === 'ready' && <Body card={state.detail} />}
				</div>
			</div>
		</div>,
		document.body,
	);
}
