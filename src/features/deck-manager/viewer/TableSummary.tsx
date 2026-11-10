// The table collapsed (deck-manager spec): the Legend and the Champion as two
// cards of one size, the battlefields as a count with their names, and the
// rune split as a slider. Everything here is read from the deck; placing
// cards still happens in the open table.
import { SECTION_LABELS, qtyOf, sectionTotal, sectionTarget, type Deck } from '../../../domain/deck.ts';
import { cardPageHref } from '../../../domain/deck-return.ts';
import { fitsChampionZone } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import type { GridEntry } from '../../../domain/grid-item.ts';
import { FaceArt } from '../faces.tsx';
import { RuneSlider } from './RuneSlider.tsx';
import type { ViewerActions } from './viewer-actions.ts';

export interface TableSummaryProps {
	id: string;
	deck: Deck;
	shared: boolean;
	idx: DeckRuleIndexes;
	bySlug: Map<string, GridEntry>;
	domains: Array<{ slug: string; label?: string }>;
	championPicking: boolean;
	address: string;
	actions: ViewerActions;
}

export function TableSummary({ id, deck, shared, idx, bySlug, domains, championPicking, address, actions }: TableSummaryProps) {
	const nameOf = (slug: string) => idx.names[slug] ?? bySlug.get(slug)?.name ?? slug;
	const legend = deck.legend[0]?.card;
	const champion = deck.champion && fitsChampionZone(deck, idx, deck.champion) ? deck.champion : undefined;
	const card = (kind: 'legend' | 'champion', slug: string | undefined) => (
		<div data-summary-card={kind} className="summary-card face card-corner">
			{slug ? (
				<a href={cardPageHref(slug, address)} aria-label={nameOf(slug)} className="absolute inset-0">
					<FaceArt art={bySlug.get(slug)?.art} slug={slug} />
				</a>
			) : kind === 'champion' && !shared ? (
				<button type="button" aria-pressed={championPicking} aria-label={championPicking ? 'Picking — click a champion' : 'Select champion'} className="champion-slot" onClick={actions.toggleChampionPicking}>
					<span className="text-[11px] font-semibold leading-tight">{championPicking ? 'Click a champion in the browser' : 'Select champion'}</span>
				</button>
			) : (
				<span className="summary-card-empty">{kind === 'legend' ? 'no Legend' : 'no champion'}</span>
			)}
		</div>
	);
	const { exact } = sectionTarget('battlefields');
	return (
		<div id={id} className="table-summary">
			<div className="summary-pair">
				<div>
					<span className="summary-label">Legend</span>
					{card('legend', legend)}
				</div>
				<div>
					<span className="summary-label">
						Champion
						<span className="tnum">{champion ? ` ${qtyOf(deck.main, champion)}` : ''}</span>
					</span>
					{card('champion', champion)}
				</div>
			</div>
			<div className="summary-facts">
				<section aria-label={SECTION_LABELS.battlefields}>
					<h3 className="summary-label">
						{SECTION_LABELS.battlefields}
						<span className="tnum"> {sectionTotal(deck.battlefields)} / {exact}</span>
					</h3>
					{deck.battlefields.length ? (
						<ul className="summary-names">
							{deck.battlefields.map((slot) => (
								<li key={slot.card}>{nameOf(slot.card)}</li>
							))}
						</ul>
					) : (
						<p className="summary-none">None picked.</p>
					)}
				</section>
				<section aria-label={SECTION_LABELS.rune}>
					<h3 className="summary-label">
						{SECTION_LABELS.rune}
						<span className="tnum"> {sectionTotal(deck.rune)} / {sectionTarget('rune').exact}</span>
					</h3>
					<RuneSlider deck={deck} idx={idx} shared={shared} domains={domains} onSet={actions.setRuneRatio} />
				</section>
			</div>
		</div>
	);
}
