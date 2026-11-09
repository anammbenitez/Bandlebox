import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { imageUrl } from '../../domain/card-image.ts';
import { Button, type ButtonVariant } from './Button.tsx';
import { CardImage } from './CardImage.tsx';
import { Chip } from './Chip.tsx';
import { DomainEmblem } from './DomainEmblem.tsx';
import { SelectField, TextField } from './Field.tsx';
import { Glyph } from './Glyph.tsx';

const ID = '03678a34-c684-4954-a811-e8462ab2a281';

describe('Button', () => {
	const roles: ButtonVariant[] = ['default', 'primary', 'ghost', 'link', 'danger'];

	it.each(roles)('%s renders a named button with its role marker', (variant) => {
		render(<Button variant={variant}>Save</Button>);
		const btn = screen.getByRole('button', { name: 'Save' });
		expect(btn).toHaveClass('btn');
		expect(btn).toHaveAttribute('type', 'button');
		if (variant === 'default') expect(btn).not.toHaveAttribute('data-variant');
		else expect(btn).toHaveAttribute('data-variant', variant);
	});

	it('small size and extra classes', () => {
		render(
			<Button size="sm" className="mt-2">
				Reset
			</Button>,
		);
		const btn = screen.getByRole('button', { name: 'Reset' });
		expect(btn).toHaveAttribute('data-size', 'sm');
		expect(btn).toHaveClass('btn', 'mt-2');
	});

	it('a toggle exposes its pressed state; a plain button does not', () => {
		render(
			<>
				<Button pressed>On</Button>
				<Button pressed={false}>Off</Button>
				<Button>Plain</Button>
			</>,
		);
		expect(screen.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByRole('button', { name: 'Plain' })).not.toHaveAttribute('aria-pressed');
	});

	it('with an href it is a link that looks like the button', () => {
		render(
			<Button href="/decks" variant="ghost">
				All decks
			</Button>,
		);
		const link = screen.getByRole('link', { name: 'All decks' });
		expect(link).toHaveAttribute('href', '/decks');
		expect(link).toHaveClass('btn');
		expect(link).toHaveAttribute('data-variant', 'ghost');
	});
});

describe('Chip', () => {
	it('is a toggle with an optional emblem face', () => {
		render(
			<Chip selected emblem title="Calm cards">
				<img alt="Calm" src="/x.webp" />
			</Chip>,
		);
		const chip = screen.getByRole('button', { name: 'Calm' });
		expect(chip).toHaveClass('pill');
		expect(chip).toHaveAttribute('aria-pressed', 'true');
		expect(chip).toHaveAttribute('data-emblem');
	});
});

describe('fields', () => {
	it('text and select share the field look', () => {
		render(
			<>
				<TextField aria-label="Deck name" />
				<SelectField aria-label="Type">
					<option value="">Any type</option>
				</SelectField>
			</>,
		);
		expect(screen.getByRole('textbox', { name: 'Deck name' })).toHaveClass('field');
		expect(screen.getByRole('combobox', { name: 'Type' })).toHaveClass('field');
	});
});

describe('Glyph and DomainEmblem', () => {
	it('a glyph is read by its name', () => {
		render(<Glyph src="/g/might.svg" name="might" />);
		expect(screen.getByRole('img', { name: 'might' })).toHaveClass('kw-glyph');
	});

	it('an emblem is the domain image, or its name when there is none', () => {
		render(
			<>
				<DomainEmblem src="/g/calm.webp" label="Calm" />
				<DomainEmblem src={null} label="Colorless" />
			</>,
		);
		expect(screen.getByRole('img', { name: 'Calm' })).toHaveAttribute('width', '16');
		expect(screen.getByText('Colorless')).toBeInTheDocument();
	});
});

describe('CardImage', () => {
	it.each([
		['hero', 'full', ['400w', '240w'], 744, 1039],
		['tile', '400w', ['240w'], 400, 559],
		['thumb', '240w', [], 240, 335],
	] as const)('%s: %s first, then %j', (role, first, rest, width, height) => {
		render(<CardImage imageId={ID} role={role} alt="Abandon card art" />);
		const img = screen.getByRole('img', { name: 'Abandon card art' });
		expect(img).toHaveAttribute('src', imageUrl(ID, first));
		expect(img).toHaveAttribute('width', String(width));
		expect(img).toHaveAttribute('height', String(height));
		expect(img).toHaveAttribute('data-fallback', rest.map((v) => imageUrl(ID, v)).join(' '));
	});

	it('battlefield art takes landscape dimensions', () => {
		render(<CardImage imageId={ID} role="tile" rotate alt="field" />);
		const img = screen.getByRole('img', { name: 'field' });
		expect(img).toHaveAttribute('width', '559');
		expect(img).toHaveAttribute('height', '400');
	});
});
