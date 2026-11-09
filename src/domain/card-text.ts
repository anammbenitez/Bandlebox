// src/domain/card-text.ts — Riftbound card-text markup: the tokenizer.
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
// escaping to React: text goes through JSX, never through innerHTML.
//
// The React CardText molecule (src/ui/molecules/CardText.tsx) renders the
// tokens; this module is free of Vite-only imports so it runs under Vitest
// without a build. Glyph URLs are injected by the renderer (src/domain/glyphs.ts).

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

/** Human-readable name for a symbol, used by screen readers and missing-glyph fallback. */
export function glyphSpokenName(name: string): string {
	if (name === 'might') return 'might';
	if (name === 'exhaust') return 'exhaust';
	const rune = /^rune_(.+)$/u.exec(name);
	if (rune?.[1]) return rune[1] === 'rainbow' ? 'rainbow rune' : `${rune[1]} rune`;
	return name.replaceAll('_', ' ');
}
