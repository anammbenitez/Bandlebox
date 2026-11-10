// One section of the deck sheet: its header (a button that focuses the
// section, with its count against its target), its cards, and, for the Legend
// the champion zone, for the rune deck the written ratio. A section is also a
// drop target: it lights up for a card it would accept.
import { useState, type DragEvent } from 'react';
import { SECTION_LABELS, sectionTarget, sectionTotal, type Deck, type SectionKey } from '../../../domain/deck.ts';
import { canAdd } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import type { GridEntry } from '../../../domain/grid-item.ts';
import { ChampionZone } from './ChampionZone.tsx';
import { RuneRatio } from './RuneRatio.tsx';
import { SectionRow } from './SectionRow.tsx';
import type { ViewerActions } from './viewer-actions.ts';

const SECTION_HINT: Record<SectionKey, string> = {
	legend: 'Place one Legend from the browser.',
	battlefields: 'Pick three different battlefields.',
	main: 'Add units, spells, and gear — 40 cards.',
	rune: 'Place a Legend; its colors set the runes.',
	side: 'Up to 10 optional cards.',
};

export interface DeckSectionProps {
	section: SectionKey;
	deck: Deck;
	idx: DeckRuleIndexes;
	bySlug: Map<string, GridEntry>;
	domains: Array<{ slug: string; label?: string }>;
	shared: boolean;
	active: boolean;
	championPicking: boolean;
	dragging: string | null;
	/** This page's address, so card pages can link back to this deck. */
	address: string;
	actions: ViewerActions;
}

export function DeckSection({ section, deck, idx, bySlug, domains, shared, active, championPicking, dragging, address, actions }: DeckSectionProps) {
	const [accept, setAccept] = useState(false);
	const { exact, cap } = sectionTarget(section);
	const slots = deck[section].slice().sort((a, b) => a.card.localeCompare(b.card));

	function onDragOver(event: DragEvent) {
		if (!dragging || shared) return;
		const ok = canAdd(deck, idx, section, dragging).ok;
		if (ok !== accept) setAccept(ok);
		if (ok) event.preventDefault();
	}

	const rows = slots.length ? (
		slots.map((slot) => (
			<SectionRow
				key={slot.card}
				section={section}
				slug={slot.card}
				qty={slot.qty}
				name={idx.names[slot.card] ?? bySlug.get(slot.card)?.name ?? slot.card}
				art={bySlug.get(slot.card)?.art}
				shared={shared}
				address={address}
				onChangeQty={(delta, from) => actions.changeQty(section, slot.card, delta, from)}
				onRemove={() => actions.removeRow(section, slot.card)}
			/>
		))
	) : (
		<li className="section-empty col-span-full w-full">{SECTION_HINT[section]}</li>
	);

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
				if (dragging && !shared) actions.dropOn(section, dragging);
			}}
		>
			<button type="button" data-focus-section={section} className="sheet-head" onClick={() => actions.focusSection(section)}>
				<span className="section-name">{SECTION_LABELS[section]}</span>
				<span className="section-count">
					<span data-count={section}>{sectionTotal(deck[section])}</span>
					<span className="mx-1 text-slate-600">/</span>
					{exact != null ? String(exact) : `≤ ${cap}`}
				</span>
			</button>
			<div className="section-body">
				{section === 'legend' ? (
					<div className="legend-pair">
						<ul data-rows="legend" className="contents">
							{rows}
						</ul>
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
				) : section === 'battlefields' ? (
					<ul data-rows="battlefields" className="battlefield-row">
						{rows}
					</ul>
				) : section === 'rune' ? (
					<div className="rune-bay">
						<RuneRatio deck={deck} idx={idx} shared={shared} domains={domains} onSet={actions.setRuneRatio} />
						<ul data-rows="rune" className="rune-faces">
							{rows}
						</ul>
					</div>
				) : (
					<ul data-rows={section} className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1.5">
						{rows}
					</ul>
				)}
			</div>
		</section>
	);
}
