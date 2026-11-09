// The deck's legality at the foot of the sheet (deck-legality spec): every
// rule with its status, what is wrong when it fails (first six named, the rest
// counted), and the verdict the deck bar shows. Derived from the deck on
// render, never synced (react-best-practices: rerender-derived-state-no-effect).
import { Fragment, useMemo, type ReactNode } from 'react';
import type { Deck } from '../../../domain/deck.ts';
import { validate, type DeckRuleIndexes, type LegalityReport } from '../../../domain/deck-rules.ts';

const STATUS_ICON: Record<string, ReactNode> = {
	pass: (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-emerald-400">
			<path d="M2.75 7.4 5.5 10.15 11.25 4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	fail: (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-red-400">
			<circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.4" />
			<path d="M5.1 5.1 8.9 8.9M8.9 5.1 5.1 8.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
		</svg>
	),
	pending: (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-amber-400">
			<circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.2 2.2" />
		</svg>
	),
};

function Checklist({ report }: { report: LegalityReport }) {
	return (
		<ul id="deck-checklist" className="check-list px-3 pb-3.5">
			{report.rules.map((rule) => {
				const shown = rule.failures.slice(0, 6);
				const rest = rule.failures.length - shown.length;
				return (
					<li key={rule.id} className="check-item" data-status={rule.status}>
						{STATUS_ICON[rule.status]}
						<span className="min-w-0">
							<span>{rule.label}</span>
							{rule.status !== 'pass' && (
								<>
									{' '}
									<span className="check-detail">{rule.detail}</span>
								</>
							)}
							{rule.failures.length > 0 && (
								<span className="check-failure">
									{shown.map((failure, i) => (
										<Fragment key={i}>
											{i > 0 && <br />}
											{failure}
										</Fragment>
									))}
									{rest > 0 && (
										<>
											<br />+{rest} more
										</>
									)}
								</span>
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

export function LegalityChecklist({ deck, idx }: { deck: Deck; idx: DeckRuleIndexes }) {
	const report = useMemo(() => validate(deck, idx), [deck, idx]);
	return (
		<section className="sheet-section" aria-label="Deck legality">
			<div className="sheet-head">
				<h2 className="section-name">Deck legality</h2>
				<span className="section-count">Riftbound constructed</span>
			</div>
			<Checklist report={report} />
		</section>
	);
}

/** The deck's verdict for the deck bar: legal, not legal, or null while nothing is open. */
export function useLegality(deck: Deck | null, idx: DeckRuleIndexes | null): boolean | null {
	return useMemo(() => (deck && idx ? validate(deck, idx).legal : null), [deck, idx]);
}
