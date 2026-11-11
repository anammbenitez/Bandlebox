// The rune split as one slider (deck-manager spec): the Legend's two colors
// sit at the two ends, each end showing that domain's emblem and its rune
// count; the thumb is where the rune deck divides between them. It is the
// only control for the amounts: moving it rewrites both colors through the
// `setRuneRatio` rule, so the total stays at the rune-deck size. With one
// color or a shared deck it only reads out the counts. Without a Legend it
// renders nothing (the section says to place one).
import type { CSSProperties } from 'react';
import { DECK_RULES, type Deck } from '../../../domain/deck.ts';
import { legendDomains, runeCopiesFor } from '../../../domain/deck-editing.ts';
import type { DeckRuleIndexes } from '../../../domain/deck-rules.ts';
import { DomainEmblem } from '../../../ui/atoms/DomainEmblem.tsx';

/** Riftbound domain palette for the slider's track (data, not decoration). */
export const DOMAIN_COLORS: Record<string, string> = {
	fury: '#ef4444',
	chaos: '#a855f7',
	mind: '#3b82f6',
	calm: '#22c55e',
	body: '#f97316',
	order: '#eab308',
};

export interface DomainInfo {
	slug: string;
	label?: string;
	/** OpenRift's emblem (`glyphUrl('domain_<slug>')`), or null: the name is printed instead. */
	icon?: string | null;
}

export interface RuneSliderProps {
	deck: Deck;
	idx: DeckRuleIndexes;
	shared: boolean;
	domains: DomainInfo[];
	onSet(domain: string, target: number): void;
}

const hue = (domain: string | undefined) => (domain ? DOMAIN_COLORS[domain] : undefined) ?? '#98a3af';

export function RuneSlider({ deck, idx, shared, domains, onSet }: RuneSliderProps) {
	const colors = [...new Set(legendDomains(deck, idx) ?? [])];
	if (colors.length === 0) return null;
	const entry = (domain: string) => domains.find((d) => d.slug === domain);
	const label = (domain: string) => entry(domain)?.label ?? domain;
	const total = DECK_RULES.runeSize;
	const counts = colors.map((domain) => runeCopiesFor(deck, idx, domain));
	const interactive = colors.length === 2 && !shared;
	const [left, right] = colors;
	const [leftCount = 0, rightCount = 0] = counts;
	const pos = right ? (Math.min(total, leftCount) / total) * 100 : 100;
	const trackStyle = { '--dot': hue(left), '--dot-b': hue(right), '--pos': `${pos}%` } as CSSProperties;

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

	const end = (domain: string, count: number | undefined) => (
		<span data-slider-end={domain} className="rune-slider-end tnum">
			<DomainEmblem src={entry(domain)?.icon ?? null} label={label(domain)} size={24} className="rune-slider-emblem" />
			<span className="rune-slider-count">{count}</span>
		</span>
	);

	return (
		<div data-rune-slider="" className="rune-slider">
			{left && end(left, counts[0])}
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
					style={trackStyle}
					onChange={(e) => move(Number(e.currentTarget.value))}
				/>
			) : (
				<div aria-hidden="true" className="rune-range rune-range-static" style={trackStyle} />
			)}
			{right && end(right, counts[1])}
		</div>
	);
}
