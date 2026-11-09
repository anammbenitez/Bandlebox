// Card text as React: the catalog's small markup language (keyword labels,
// game symbols, italics, line breaks, pointed labels) rendered from the
// tokenizer in domain/card-text.ts. The markup is the same as the HTML
// renderer's, so styles and screen readers see one thing on every surface
// (card-text-rendering spec). Static: it needs no client JavaScript.
import type { CSSProperties, ReactNode } from 'react';
import { glyphSpokenName, tokenizeCardText, type CardTextToken } from '../../domain/card-text.ts';
import { glyphUrl } from '../../domain/glyphs.ts';
import { keywordChipStyle, type KeywordChipStyle } from '../../domain/keyword-styles.ts';
import { Glyph } from '../atoms/Glyph.tsx';

export interface CardTextOptions {
	resolveGlyph?: (name: string) => string | undefined;
	resolveKeyword?: (name: string) => KeywordChipStyle;
}

const DEFAULTS: Required<CardTextOptions> = { resolveGlyph: glyphUrl, resolveKeyword: keywordChipStyle };

type KeywordToken = Extract<CardTextToken, { type: 'keyword' }>;

function points(token: KeywordToken): 'both' | 'left' | 'right' | undefined {
	if (token.pointedLeft) return token.pointedRight ? 'both' : 'left';
	return token.pointedRight ? 'right' : undefined;
}

function GlyphToken({ name, options }: { name: string; options: Required<CardTextOptions> }) {
	const energy = /^energy_?(\d+)$/u.exec(name);
	if (energy) {
		const level = energy[1] ?? '';
		return (
			<span className="kw-energy" role="img" aria-label={`${level} energy`}>
				<span aria-hidden="true">{level}</span>
			</span>
		);
	}
	const spoken = glyphSpokenName(name);
	const url = options.resolveGlyph(name);
	return url ? <Glyph src={url} name={spoken} /> : <span className="kw-glyph-text">{spoken}</span>;
}

function KeywordLabel({ token, options }: { token: KeywordToken; options: Required<CardTextOptions> }) {
	const style = options.resolveKeyword(token.name);
	const colors = { '--kw-color': style.color, '--kw-ink': style.ink } as CSSProperties;
	return (
		<span className="kw" data-points={points(token)} style={colors}>
			<Tokens tokens={token.children} options={options} />
		</span>
	);
}

function Tokens({ tokens, options }: { tokens: CardTextToken[]; options: Required<CardTextOptions> }): ReactNode {
	return tokens.map((token, i) => {
		switch (token.type) {
			case 'text':
				return token.value;
			case 'glyph':
				return <GlyphToken key={i} name={token.name} options={options} />;
			case 'keyword':
				return <KeywordLabel key={i} token={token} options={options} />;
			case 'paren':
				return (
					<em key={i}>
						(<Tokens tokens={token.children} options={options} />)
					</em>
				);
			case 'italic':
				return (
					<em key={i}>
						<Tokens tokens={token.children} options={options} />
					</em>
				);
			case 'newline':
				return <br key={i} />;
		}
	});
}

/** The bare tokens, for a host element that is not the `.card-text` span. */
export function CardTextContent({ text, ...options }: { text: string } & CardTextOptions) {
	return <Tokens tokens={tokenizeCardText(text)} options={{ ...DEFAULTS, ...options }} />;
}

/** One card-text value (rules, effect, flavor, errata) in its `.card-text` span. */
export function CardText({ text, ...options }: { text: string } & CardTextOptions) {
	return (
		<span className="card-text">
			<CardTextContent text={text} {...options} />
		</span>
	);
}

/** One keyword alone, as the same label card text uses. */
export function KeywordChip({ name, ...options }: { name: string } & CardTextOptions) {
	const token: KeywordToken = { type: 'keyword', name, children: [{ type: 'text', value: name }] };
	return <KeywordLabel token={token} options={{ ...DEFAULTS, ...options }} />;
}
