// The rune split as one slider (deck-manager spec): the Legend's two colors
// sit at the two ends, the thumb is where the rune deck divides between them.
// Moving it rewrites both colors through the same `setRuneRatio` rule the
// written counters use, so the total stays at the rune-deck size. With one
// color, no Legend, or a shared deck it only reads out the counts.
import type { CSSProperties } from 'react';
import { DECK_RULES, type Deck } from '../../../domain/deck.ts';
import { legendDomains, runeCopiesFor } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import { DOMAIN_COLORS } from './RuneRatio.tsx';

export interface RuneSliderProps {
	deck: Deck;
	idx: DeckRuleIndexes;
	shared: boolean;
	domains: Array<{ slug: string; label?: string }>;
	onSet(domain: string, target: number): void;
}

const dot = (domain: string) => ({ '--dot': DOMAIN_COLORS[domain] ?? '#98a3af' }) as CSSProperties;

export function RuneSlider({ deck, idx, shared, domains, onSet }: RuneSliderProps) {
	const colors = [...new Set(legendDomains(deck, idx) ?? [])];
	if (colors.length === 0) return <p className="section-empty">Place a Legend; its colors set the runes.</p>;
	const label = (domain: string) => domains.find((d) => d.slug === domain)?.label ?? domain;
	const total = DECK_RULES.runeSize;
	const counts = colors.map((domain) => runeCopiesFor(deck, idx, domain));
	const interactive = colors.length === 2 && !shared;
	const [left, right] = colors;
	const [leftCount = 0, rightCount = 0] = counts;

	function move(value: number) {
		if (!left || !right) return;
		const next = Math.min(total, Math.max(0, Math.round(value)));
		const rest = total - next;
		// the side that shrinks goes first, so the rune deck never overshoots
		if (rest < rightCount) {
			onSet(right, rest);
			onSet(left, next);
		} else {
			onSet(left, next);
			onSet(right, rest);
		}
	}

	return (
		<div data-rune-slider="" className="rune-slider">
			<div className="rune-slider-ends">
				{colors.map((domain, i) => (
					<span key={domain} data-slider-end={domain} className="rune-slider-end tnum" style={dot(domain)}>
						<i className="dot" />
						{`${label(domain)} ${counts[i]}`}
					</span>
				))}
			</div>
			{interactive && left && right ? (
				<input
					type="range"
					min={0}
					max={total}
					step={1}
					value={Math.min(total, leftCount)}
					aria-label={`Rune split: ${label(left)} to ${label(right)}`}
					aria-valuetext={`${label(left)} ${leftCount}, ${label(right)} ${rightCount}`}
					className="rune-range"
					style={{ ...dot(left), '--dot-b': DOMAIN_COLORS[right] ?? '#98a3af', '--pos': `${(Math.min(total, leftCount) / total) * 100}%` } as CSSProperties}
					onChange={(e) => move(Number(e.currentTarget.value))}
				/>
			) : (
				<div
					aria-hidden="true"
					className="rune-range rune-range-static"
					style={{ ...dot(left ?? ''), '--dot-b': DOMAIN_COLORS[right ?? ''] ?? '#98a3af', '--pos': `${right ? (Math.min(total, leftCount) / total) * 100 : 100}%` } as CSSProperties}
				/>
			)}
		</div>
	);
}
