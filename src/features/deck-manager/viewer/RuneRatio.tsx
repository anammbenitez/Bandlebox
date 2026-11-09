// The written rune ratio (deck-manager spec): one counter per color of the
// Legend. Typing a number sets that color's rune copies; while a field has
// focus it shows what is typed, otherwise the deck's own count.
import { useState, type CSSProperties } from 'react';
import type { Deck } from '../../../domain/deck.ts';
import { legendDomains, runeCopiesFor } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';

/** Riftbound domain palette for the counters' color dots. */
const DOMAIN_COLORS: Record<string, string> = {
	fury: '#ef4444',
	chaos: '#a855f7',
	mind: '#3b82f6',
	calm: '#22c55e',
	body: '#f97316',
	order: '#eab308',
};

export interface RuneRatioProps {
	deck: Deck;
	idx: DeckRuleIndexes;
	shared: boolean;
	domains: Array<{ slug: string; label?: string }>;
	onSet(domain: string, target: number): void;
}

export function RuneRatio({ deck, idx, shared, domains, onSet }: RuneRatioProps) {
	const colors = [...new Set(legendDomains(deck, idx) ?? [])];
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	if (shared || colors.length === 0) return <div data-rune-ratio="" className="mb-2 hidden" />;
	return (
		<div data-rune-ratio="" className="mb-2 flex flex-wrap items-center gap-2">
			<span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500">Rune ratio</span>
			{colors.map((domain) => {
				const label = domains.find((d) => d.slug === domain)?.label ?? domain;
				return (
					<label key={domain} className="rune-counter" style={{ '--dot': DOMAIN_COLORS[domain] ?? '#98a3af' } as CSSProperties} title={`${label} runes`}>
						<i className="dot" />
						<input
							type="number"
							min="0"
							max="12"
							step="1"
							data-ratio={domain}
							aria-label={`${label} rune count`}
							className="rune-counter-input tnum"
							value={drafts[domain] ?? String(runeCopiesFor(deck, idx, domain))}
							onFocus={(e) => setDrafts((d) => ({ ...d, [domain]: e.currentTarget.value }))}
							onBlur={() =>
								setDrafts((d) => {
									const { [domain]: _done, ...rest } = d;
									return rest;
								})
							}
							onChange={(e) => {
								const value = e.currentTarget.value;
								setDrafts((d) => ({ ...d, [domain]: value }));
								onSet(domain, Math.max(0, Math.floor(Number(value) || 0)));
							}}
						/>
					</label>
				);
			})}
		</div>
	);
}
