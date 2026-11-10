import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setPreferredImage } from '../../domain/printing-preference.ts';
import { CreateDeckDialog } from './CreateDeckDialog.tsx';
import { LegendArt, type LegendEntry } from './DeckTile.tsx';

const legend: LegendEntry = { slug: 'fox', name: 'Nine-Tailed Fox', tags: ['Ahri'], domains: ['calm'], imageId: 'default-art' };

afterEach(() => {
	act(() => setPreferredImage('fox', null));
});

const src = (container: HTMLElement) => container.querySelector('img')?.getAttribute('src') ?? '';

describe('a Legend in the deck library shows the art the player chose', () => {
	it('uses the catalog default until a printing is chosen', () => {
		const { container } = render(<LegendArt legend={legend} role="thumb" alt="" />);
		expect(src(container)).toContain('default-art');
	});

	it('uses the chosen printing, and follows a later choice', () => {
		const { container } = render(<LegendArt legend={legend} role="thumb" alt="" />);
		act(() => setPreferredImage('fox', 'chosen-art'));
		expect(src(container)).toContain('chosen-art');
		expect(src(container)).not.toContain('default-art');
		act(() => setPreferredImage('fox', null));
		expect(src(container)).toContain('default-art');
	});

	it('the New deck picker shows the chosen printing too', () => {
		act(() => setPreferredImage('fox', 'chosen-art'));
		const { container } = render(<CreateDeckDialog open legends={[legend]} onCancel={() => {}} onCreate={() => {}} />);
		const pick = container.querySelector('[data-legend-pick="fox"] img');
		expect(pick?.getAttribute('src')).toContain('chosen-art');
	});
});
