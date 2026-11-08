/// <reference types="vite/client" />

// src/lib/glyphs.ts — card symbol artwork for card text.
//
// The SVG files are a local cache written by `npm run refresh` into
// data/glyphs/ (git-ignored; see data/glyphs/NOTICE.md). Vite imports them at
// build time and emits hashed assets, so card detail pages read the symbols
// offline and the repository never carries Riot-owned artwork.
//
// Glyph names use underscores in card text (`rune_fury`) and hyphens in file
// names (`rune-fury.svg`). A name with no file resolves to undefined and the
// renderer falls back to readable text.
//
// The cache also holds the domain emblems as `domain-{slug}` (`domain_fury`),
// WebP for most and SVG for colorless; the extension is not part of the name.

const FILES = import.meta.glob('../../data/glyphs/*.{svg,webp}', {
	eager: true,
	query: '?url',
	import: 'default',
}) as Record<string, string>;

const URL_BY_NAME = new Map<string, string>();
for (const [file, url] of Object.entries(FILES)) {
	const name = file.split('/').pop()?.replace(/\.(svg|webp)$/u, '');
	if (name) URL_BY_NAME.set(name, url);
}

/** Resolves a card-text glyph name to its asset URL, or undefined when absent. */
export function glyphUrl(name: string): string | undefined {
	return URL_BY_NAME.get(name.replaceAll('_', '-'));
}
