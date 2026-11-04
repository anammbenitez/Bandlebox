// src/lib/card-text.ts — Riftbound card-text markup: tokenizer + HTML renderer.
//
// The catalog stores card text as a small markup language (OpenRift-owned
// content, rendered locally):
//   [Keyword]        keyword label, optionally with glyphs inside the brackets
//   :rb_might:       inline game symbol (might, exhaust, rune_*, energy_N)
//   _(...)_          italic reminder text
//   (...)            parenthetical reminder text (rendered italic)
//   [>] / [>>]       shape markers that point the adjacent keyword label
//   \n               hard line break
//
// Token order is load-bearing: glyphs must precede italics (an italic run can
// contain glyphs), and parens must precede italics. The renderer keeps text
// escaping in one place because the input is third-party content.
//
// This module is deliberately free of Vite-only imports so `scripts/
// verify-card-text.mjs` can run it under plain Node. Glyph URLs are injected
// by the caller (see src/lib/glyphs.ts).

import { keywordChipStyle, type KeywordChipStyle } from './keyword-styles.ts';

const TOKEN_PATTERN =
	/:rb_(?<glyph>\w+):|\[(?<keyword>[^\]]+)\]|\((?<paren>[^)]+)\)|_(?<italic>(?::rb_\w+:|[^_])+)_|\n/gu;

export type CardTextToken =
	| { type: 'text'; value: string }
	| { type: 'glyph'; name: string }
	| {
			type: 'keyword';
			name: string;
			children: CardTextToken[];
			pointedRight?: boolean;
			pointedLeft?: boolean;
	  }
	| { type: 'paren'; children: CardTextToken[] }
	| { type: 'italic'; children: CardTextToken[] }
	| { type: 'newline' };

export interface RenderOptions {
	/** Resolves a glyph name (`might`, `rune_fury`) to an asset URL. */
	resolveGlyph?: (name: string) => string | undefined;
	/** Resolves a keyword name to its label colors; defaults to the neutral style. */
	resolveKeyword?: (name: string) => KeywordChipStyle;
}

/** Tokenizes card-text markup. Never throws on unknown syntax: it stays text. */
export function tokenizeCardText(text: string): CardTextToken[] {
	const tokens: CardTextToken[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(TOKEN_PATTERN)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			tokens.push({ type: 'text', value: text.slice(lastIndex, index) });
		}

		const groups = match.groups ?? {};
		if (groups.glyph) {
			tokens.push({ type: 'glyph', name: groups.glyph });
		} else if (groups.keyword) {
			const raw = groups.keyword;
			tokens.push({
				type: 'keyword',
				name: raw.replaceAll(/:rb_\w+:/gu, '').trim(),
				children: tokenizeCardText(raw),
			});
		} else if (groups.paren) {
			tokens.push({ type: 'paren', children: tokenizeCardText(groups.paren) });
		} else if (groups.italic) {
			tokens.push({ type: 'italic', children: tokenizeCardText(groups.italic) });
		} else {
			tokens.push({ type: 'newline' });
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < text.length) {
		tokens.push({ type: 'text', value: text.slice(lastIndex) });
	}

	// Fold [>] / [>>] into the label they decorate, then drop any marker that
	// had no neighbour to attach to, so a marker never renders as a label.
	for (let i = tokens.length - 1; i >= 0; i--) {
		const token = tokens[i];
		if (token?.type !== 'keyword') continue;
		const previous = tokens[i - 1];
		const next = tokens[i + 1];
		if (token.name === '>' && previous?.type === 'keyword') {
			previous.pointedRight = true;
			tokens.splice(i, 1);
		} else if (token.name === '>>' && next?.type === 'keyword') {
			next.pointedLeft = true;
			tokens.splice(i, 1);
		}
	}

	return tokens.filter((token) => !(token.type === 'keyword' && (token.name === '>' || token.name === '>>')));
}

/** Renders card-text markup to static HTML. Text and attribute values are escaped. */
export function renderCardTextHtml(text: string, options: RenderOptions = {}): string {
	return renderTokens(tokenizeCardText(text), options);
}

/** Renders one keyword as the same label used inside card text. */
export function renderKeywordHtml(name: string, options: RenderOptions = {}): string {
	return renderKeyword({ type: 'keyword', name, children: [{ type: 'text', value: name }] }, options);
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

/** Escapes text for HTML content and quoted attribute values. */
export function escapeCardTextHtml(value: string): string {
	return value.replace(/[&<>"']/gu, (char) => HTML_ESCAPES[char] ?? char);
}

function renderTokens(tokens: CardTextToken[], options: RenderOptions): string {
	let html = '';
	for (const token of tokens) {
		switch (token.type) {
			case 'text':
				html += escapeCardTextHtml(token.value);
				break;
			case 'glyph':
				html += renderGlyph(token.name, options);
				break;
			case 'keyword':
				html += renderKeyword(token, options);
				break;
			case 'paren':
				html += `<em>(${renderTokens(token.children, options)})</em>`;
				break;
			case 'italic':
				html += `<em>${renderTokens(token.children, options)}</em>`;
				break;
			case 'newline':
				html += '<br>';
				break;
		}
	}
	return html;
}

function renderKeyword(
	keyword: Extract<CardTextToken, { type: 'keyword' }>,
	options: RenderOptions,
): string {
	const style = (options.resolveKeyword ?? keywordChipStyle)(keyword.name);
	const points = keyword.pointedLeft
		? keyword.pointedRight
			? ' data-points="both"'
			: ' data-points="left"'
		: keyword.pointedRight
			? ' data-points="right"'
			: '';
	const colors = `--kw-color:${style.color};--kw-ink:${style.ink}`;
	return `<span class="kw"${points} style="${colors}">${renderTokens(keyword.children, options)}</span>`;
}

function renderGlyph(name: string, options: RenderOptions): string {
	const energy = /^energy_?(\d+)$/u.exec(name);
	if (energy) {
		const level = energy[1] ?? '';
		return `<span class="kw-energy" role="img" aria-label="${level} energy"><span aria-hidden="true">${level}</span></span>`;
	}

	const spoken = glyphSpokenName(name);
	const url = options.resolveGlyph?.(name);
	if (!url) return `<span class="kw-glyph-text">${escapeCardTextHtml(spoken)}</span>`;
	return `<img class="kw-glyph" src="${escapeCardTextHtml(url)}" alt="${escapeCardTextHtml(spoken)}" loading="lazy" decoding="async">`;
}

/** Human-readable name for a symbol, used by screen readers and missing-glyph fallback. */
export function glyphSpokenName(name: string): string {
	if (name === 'might') return 'might';
	if (name === 'exhaust') return 'exhaust';
	const rune = /^rune_(.+)$/u.exec(name);
	if (rune?.[1]) return rune[1] === 'rainbow' ? 'rainbow rune' : `${rune[1]} rune`;
	return name.replaceAll('_', ' ');
}
