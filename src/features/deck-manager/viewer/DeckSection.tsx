// One section of the deck sheet: its header (a button that focuses the
// section, with its count against its target), its cards, and, for the Legend
// the champion zone and the rune cards with their slider (passed as `extra`). A section is also a
// drop target: it lights up for a card it would accept.
import { useState, type DragEvent, type ReactNode } from 'react';
import { SECTION_LABELS, sectionTarget, sectionTotal, type Deck, type SectionKey } from '../../../domain/deck.ts';
import { canAdd } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import type { GridEntry } from '../../../domain/grid-item.ts';
import { ChampionZone } from './ChampionZone.tsx';
import { SectionRow } from './SectionRow.tsx';
import type { ViewerActions } from './viewer-actions.ts';

const SECTION_HINT: Record<SectionKey, string> = {
	legend: 'Place one Legend from the browser.',
	battlefields: 'Pick three different battlefields.',
	main: 'Add units, spells, and gear — 40 cards.',
	rune: 'Place a Legend; its colors set the runes.',
	side: 'Up to 10 optional cards.',
};

/** Heading of a section; the main deck's cards sit under the "Main deck" group. */
const HEAD_LABEL: Record<SectionKey, string> = { ...SECTION_LABELS, main: 'Deck cards' };

export interface DeckSectionProps {
	section: SectionKey;
	deck: Deck;
	idx: DeckRuleIndexes;
	bySlug: Map<string, GridEntry>;
	shared: boolean;
	active: boolean;
	championPicking: boolean;
	dragging: string | null;
	/** This page's address, so card pages can link back to this deck. */
	address: string;
	actions: ViewerActions;
	/** Legend only: given the rune cards, the content shown after the Legend and Champion. */
	extra?: (runeRows: ReactNode) => ReactNode;
}

export function DeckSection({ section, deck, idx, bySlug, shared, active, championPicking, dragging, address, actions, extra }: DeckSectionProps) {
	const [accept, setAccept] = useState(false);
	const { exact, cap } = sectionTarget(section);

	// The two rune cards live in the Legend section, so a rune dragged onto it
	// is a rune for the rune deck; anything else follows the section's own rule.
	const targetFor = (slug: string): SectionKey => (section === 'legend' && idx.cards[slug]?.types.includes('rune') ? 'rune' : section);

	function onDragOver(event: DragEvent) {
		if (!dragging || shared) return;
		const ok = canAdd(deck, idx, targetFor(dragging), dragging).ok;
		if (ok !== accept) setAccept(ok);
		if (ok) event.preventDefault();
	}

	const rowsOf = (key: SectionKey) => {
		const slots = deck[key].slice().sort((a, b) => a.card.localeCompare(b.card));
		return slots.length ? (
			slots.map((slot) => (
				<SectionRow
					key={slot.card}
					section={key}
					slug={slot.card}
					qty={slot.qty}
					name={idx.names[slot.card] ?? bySlug.get(slot.card)?.name ?? slot.card}
					art={bySlug.get(slot.card)?.art}
					shared={shared}
					address={address}
					onChangeQty={(delta, from) => actions.changeQty(key, slot.card, delta, from)}
					onRemove={() => actions.removeRow(key, slot.card)}
				/>
			))
		) : (
			<li className="section-empty col-span-full w-full">{SECTION_HINT[key]}</li>
		);
	};
	const rows = rowsOf(section);

	return (
		<section
			data-section={section}
			data-active={String(active)}
			className={accept ? 'sheet-section drag-accept' : 'sheet-section'}
			onDragOver={onDragOver}
			onDragLeave={(event) => {
				if (event.target === event.currentTarget) setAccept(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setAccept(false);
				if (dragging && !shared) actions.dropOn(targetFor(dragging), dragging);
			}}
		>
			<button type="button" data-focus-section={section} className="sheet-head" onClick={() => actions.focusSection(section)}>
				<span className="section-name">{HEAD_LABEL[section]}</span>
				<span className="section-count">
					<span data-count={section}>{sectionTotal(deck[section])}</span>
					<span className="mx-1 text-slate-600">/</span>
					{exact != null ? String(exact) : `≤ ${cap}`}
				</span>
			</button>
			<div className="section-body">
				{section === 'legend' ? (
					<div className="legend-row">
						<div className="legend-pair">
							<div className="min-w-0">
								<div className="flex items-baseline px-0.5">
									<span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500">Legend</span>
								</div>
								<ul data-rows="legend" className="mt-1.5">
									{rows}
								</ul>
							</div>
							<ChampionZone
								deck={deck}
								idx={idx}
								art={deck.champion ? bySlug.get(deck.champion)?.art : undefined}
								shared={shared}
								picking={championPicking}
								dragging={dragging}
								onChangeQty={(delta, from) => actions.changeQty('main', deck.champion ?? '', delta, from)}
								onRemove={() => actions.removeRow('main', deck.champion ?? '')}
								onDrop={actions.dropChampion}
								onTogglePicking={actions.toggleChampionPicking}
							/>
						</div>
						{extra?.(rowsOf('rune'))}
					</div>
				) : section === 'battlefields' ? (
					<ul data-rows="battlefields" className="battlefield-row">
						{rows}
					</ul>
				) : (
					<ul data-rows={section} className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1.5">
						{rows}
					</ul>
				)}
			</div>
		</section>
	);
}
