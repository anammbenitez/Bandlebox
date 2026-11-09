// One card in a deck section: the Legend as a big face with its badge, a
// battlefield as a landscape face, and every other card as a face with its
// copy chip between a minus and a plus (or the chip alone in a shared deck).
import { SECTION_CODE, type SectionKey } from '../../../domain/deck.ts';
import type { GridArt } from '../../../domain/grid-item.ts';
import { cardPageHref } from '../../../domain/deck-return.ts';
import { FaceArt, ICON_MINUS, ICON_PLUS } from '../faces.tsx';

export interface SectionRowProps {
	section: SectionKey;
	slug: string;
	qty: number;
	name: string;
	art: GridArt | null | undefined;
	/** Shared decks are read-only: the chip shows, the steppers do not. */
	shared: boolean;
	/** This page's address, so the card page can link back to this deck. */
	address: string;
	onChangeQty(delta: number, from: HTMLElement): void;
}

function Steppers({ section, slug, qty, minus, plus, onChangeQty }: Pick<SectionRowProps, 'section' | 'slug' | 'qty' | 'onChangeQty'> & { minus: string; plus: string }) {
	return (
		<>
			<button type="button" data-section-row={section} data-slug={slug} data-qty="-1" className="stepper" aria-label={minus} onClick={(e) => onChangeQty(-1, e.currentTarget)}>
				{ICON_MINUS}
			</button>
			<span className="count-chip">
				{SECTION_CODE[section]} {qty}
			</span>
			<button type="button" data-section-row={section} data-slug={slug} data-qty="1" className="stepper" aria-label={plus} onClick={(e) => onChangeQty(1, e.currentTarget)}>
				{ICON_PLUS}
			</button>
		</>
	);
}

export function SectionRow({ section, slug, qty, name, art, shared, address, onChangeQty }: SectionRowProps) {
	if (section === 'legend') {
		return (
			<li data-slug={slug} className="face relative aspect-[5/7] w-full max-w-44">
				<a href={cardPageHref(slug, address)} aria-label={name} className="absolute inset-0">
					<FaceArt art={art} />
				</a>
				<div title="Legend copies" className="card-badge">
					L{qty}
				</div>
			</li>
		);
	}

	if (section === 'battlefields') {
		return (
			<li data-slug={slug} data-landscape="" className="face relative aspect-[7/5] min-w-[9rem] flex-1 basis-[calc(33.333%-0.375rem)]">
				<span className="sr-only">{name}</span>
				<span className="absolute inset-0">
					<FaceArt art={art} landscape />
				</span>
				{shared ? (
					<div className="face-bar justify-center">
						<span className="count-chip">
							{SECTION_CODE[section]} {qty}
						</span>
					</div>
				) : (
					<div className="face-bar">
						<Steppers section={section} slug={slug} qty={qty} minus={`Remove ${name}`} plus={`Add ${name}`} onChangeQty={onChangeQty} />
					</div>
				)}
			</li>
		);
	}

	return (
		<li data-slug={slug} className="face relative aspect-[5/7]">
			<span className="sr-only">{name}</span>
			<span className={shared ? 'absolute inset-0' : 'absolute inset-0 cursor-pointer'}>
				<FaceArt art={art} />
			</span>
			<div className="face-bar">
				{shared ? (
					<span className="count-chip px-1">
						{SECTION_CODE[section]} {qty}
					</span>
				) : (
					<Steppers section={section} slug={slug} qty={qty} minus={`Remove copy of ${name}`} plus={`Add copy of ${name}`} onChangeQty={onChangeQty} />
				)}
			</div>
		</li>
	);
}
