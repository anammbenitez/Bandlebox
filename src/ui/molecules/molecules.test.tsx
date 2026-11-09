// Molecule behavior. (While the HTML renderers still existed this file also
// compared the React DOM to theirs over every printed text in the snapshot;
// that comparison passed, and the renderers were retired in task 8.4.)
import { existsSync, readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cardStats } from '../../domain/card-stats.ts';
import { keywordChipStyle } from '../../domain/keyword-styles.ts';
import { CardText, KeywordChip } from './CardText.tsx';
import { EmptyState } from './EmptyState.tsx';
import { StatColumns } from './StatColumns.tsx';
import { VerdictBadge } from './VerdictBadge.tsx';

const GLYPHS = (name: string) => (name === 'unknown_thing' ? undefined : `/g/${name}.svg`);
const OPTIONS = { resolveGlyph: GLYPHS, resolveKeyword: keywordChipStyle };

describe('CardText', () => {
	it('keywords, symbols and energy are read by name', () => {
		render(<CardText text="[Reaction] Pay :rb_energy_2: and :rb_might:." {...OPTIONS} />);
		expect(screen.getByText('Reaction')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 'might' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '2 energy' })).toBeInTheDocument();
	});

	it('a keyword label carries its palette colors, a pointed one its direction', () => {
		const { container } = render(<CardText text="[Assault 3][>][Tank]" {...OPTIONS} />);
		const label = container.querySelector('.kw') as HTMLElement;
		expect(label.style.getPropertyValue('--kw-color')).toBe('#cd346f');
		expect(label).toHaveAttribute('data-points', 'right');
	});

	it('a symbol with no image falls back to its spoken name; an unknown one too', () => {
		const { container } = render(<CardText text="Unknown :rb_unknown_thing: here" {...OPTIONS} />);
		expect(container.querySelector('img')).toBeNull();
		expect(container.querySelector('.kw-glyph-text')).toHaveTextContent('unknown thing');
	});

	it('text is never injected as markup', () => {
		const { container } = render(<CardText text={'<img src=x onerror=alert(1)> & "q"'} {...OPTIONS} />);
		expect(container.querySelector('img')).toBeNull();
		expect(container).toHaveTextContent('<img src=x onerror=alert(1)> & "q"');
	});

	it('italic reminders and breaks render as such', () => {
		const { container } = render(<CardText text={'_(Reminder.)_\nNext line'} {...OPTIONS} />);
		expect(container.querySelector('em')).toHaveTextContent('(Reminder.)');
		expect(container.querySelector('br')).not.toBeNull();
	});

	it('a single keyword label', () => {
		render(<KeywordChip name="Tank" {...OPTIONS} />);
		expect(screen.getByText('Tank')).toHaveClass('kw');
	});

	const HAS_DATA = existsSync('data/catalog.json');
	it.runIf(HAS_DATA)('every printed text in the snapshot renders, with no markup left over', () => {
		const snapshot = JSON.parse(readFileSync('data/catalog.json', 'utf8')) as {
			printings: Record<string, { printedRulesText?: string | null; printedEffectText?: string | null; flavorText?: string | null }>;
		};
		let checked = 0;
		for (const printing of Object.values(snapshot.printings)) {
			for (const text of [printing.printedRulesText, printing.printedEffectText, printing.flavorText]) {
				if (!text) continue;
				const { container, unmount } = render(<CardText text={text} {...OPTIONS} />);
				expect(container.textContent).not.toMatch(/:rb_\w+:|_\(/);
				unmount();
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(1000);
	}, 60_000);
});

describe('StatColumns', () => {
	it('a unit with every figure shows Energy, Power, Might in that order', () => {
		const { container } = render(<StatColumns stats={cardStats({ might: 3, mightBonus: 1, energy: 2, power: 1, domains: ['fury'] })} {...OPTIONS} />);
		const places = [...container.querySelectorAll('.peek-stat')].map((el) => el.getAttribute('data-stat'));
		expect(places).toEqual(['energy', 'power', 'might']);
		expect(container.querySelector('[data-stat="might"] .peek-stat-note')).toHaveTextContent('+1');
		expect(container.querySelector('[data-stat="energy"]')).toHaveTextContent('2');
	});

	it('a card with no figures keeps all three places, each a dash heard as "none"', () => {
		const { container } = render(<StatColumns stats={[]} {...OPTIONS} />);
		const empty = container.querySelectorAll('.peek-stat[data-empty="true"]');
		expect(empty).toHaveLength(3);
		for (const place of empty) expect(place).toHaveTextContent('none');
	});
});

describe('VerdictBadge and EmptyState', () => {
	it('reads Legal / Not legal / dash', () => {
		render(
			<>
				<VerdictBadge legal />
				<VerdictBadge legal={false} kind="verdict" />
				<VerdictBadge legal={null} />
			</>,
		);
		expect(screen.getByText('Legal')).toHaveAttribute('data-legal', 'true');
		expect(screen.getByText('Not legal')).toHaveClass('verdict');
		expect(screen.getByText('—')).toHaveAttribute('data-legal', 'unknown');
	});

	it('an empty state can carry its way out', () => {
		render(<EmptyState action={<button type="button">Clear filters</button>}>No cards match.</EmptyState>);
		expect(screen.getByText('No cards match.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
	});
});
