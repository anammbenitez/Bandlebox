// One card in a deck section: the Legend as a big face, a battlefield as a
// landscape face, and every other card as a face. Each foot carries the shared
// counter (minus, copy count, plus, remove — the champion zone's look), or the
// count alone in a shared deck. The Legend has one copy, so its foot is just
// the remove button; a rune's count is set by the ratio beside it, so its foot
// is the count and the remove button.
import { SECTION_LABELS, type SectionKey } from '../../../domain/deck.ts';
import type { GridArt } from '../../../domain/grid-item.ts';
import { cardPageHref } from '../../../domain/deck-return.ts';
import { FaceArt, ICON_MINUS, ICON_PLUS, ICON_TRASH } from '../faces.tsx';

export interface SectionRowProps {
	section: SectionKey;
	slug: string;
	qty: number;
	name: string;
	art: GridArt | null | undefined;
	/** Shared decks are read-only: the count shows, the buttons do not. */
	shared: boolean;
	/** This page's address, so the card page can link back to this deck. */
	address: string;
	onChangeQty(delta: number, from: HTMLElement): void;
	onRemove(): void;
}

type CounterProps = Pick<SectionRowProps, 'section' | 'slug' | 'qty' | 'name' | 'onChangeQty' | 'onRemove'>;

function RemoveButton({ section, slug, name, onRemove }: Pick<CounterProps, 'section' | 'slug' | 'name' | 'onRemove'>) {
	return (
		<button type="button" data-section-row={section} data-slug={slug} data-qty="-1" data-remove="" className="stepper" aria-label={`Remove ${name} from ${SECTION_LABELS[section]}`} onClick={onRemove}>
			{ICON_TRASH}
		</button>
	);
}

function Counter({ section, slug, qty, name, onChangeQty, onRemove }: CounterProps) {
	return (
		<div className="face-bar">
			<button type="button" data-section-row={section} data-slug={slug} data-qty="-1" className="stepper" aria-label={`Remove copy of ${name}`} onClick={(e) => onChangeQty(-1, e.currentTarget)}>
				{ICON_MINUS}
			</button>
			<span className="count-chip">{qty}</span>
			<button type="button" data-section-row={section} data-slug={slug} data-qty="1" className="stepper" aria-label={`Add copy of ${name}`} onClick={(e) => onChangeQty(1, e.currentTarget)}>
				{ICON_PLUS}
			</button>
			<RemoveButton section={section} slug={slug} name={name} onRemove={onRemove} />
		</div>
	);
}

function SharedCount({ qty }: { qty: number }) {
	return (
		<div className="face-bar justify-center">
			<span className="count-chip">{qty}</span>
		</div>
	);
}

export function SectionRow({ section, slug, qty, name, art, shared, address, onChangeQty, onRemove }: SectionRowProps) {
	if (section === 'legend') {
		return (
			<li data-slug={slug} className="face relative aspect-[5/7] w-full max-w-44">
				<a href={cardPageHref(slug, address)} aria-label={name} className="absolute inset-0">
					<FaceArt art={art} slug={slug} />
				</a>
				{!shared && (
					<div className="face-bar justify-end">
						<RemoveButton section={section} slug={slug} name={name} onRemove={onRemove} />
					</div>
				)}
			</li>
		);
	}

	if (section === 'rune') {
		// The ratio counters beside the runes set their counts; the face shows the
		// count and can still drop a rune (one off the Legend's colors, say).
		return (
			<li data-slug={slug} className="face relative aspect-[5/7]">
				<span className="sr-only">{name}</span>
				<span className="absolute inset-0">
					<FaceArt art={art} slug={slug} />
				</span>
				<div className={shared ? 'face-bar justify-center' : 'face-bar'}>
					<span className={shared ? 'count-chip' : 'count-chip pl-1.5'}>{qty}</span>
					{!shared && <RemoveButton section={section} slug={slug} name={name} onRemove={onRemove} />}
				</div>
			</li>
		);
	}

	const counter = shared ? <SharedCount qty={qty} /> : <Counter section={section} slug={slug} qty={qty} name={name} onChangeQty={onChangeQty} onRemove={onRemove} />;

	if (section === 'battlefields') {
		return (
			<li data-slug={slug} data-landscape="" className="face relative aspect-[7/5] w-full">
				<span className="sr-only">{name}</span>
				<span className="absolute inset-0">
					<FaceArt art={art} slug={slug} landscape />
				</span>
				{counter}
			</li>
		);
	}

	return (
		<li data-slug={slug} className="face relative aspect-[5/7]">
			<span className="sr-only">{name}</span>
			<span className={shared ? 'absolute inset-0' : 'absolute inset-0 cursor-pointer'}>
				<FaceArt art={art} slug={slug} />
			</span>
			{counter}
		</li>
	);
}
