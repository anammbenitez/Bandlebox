// A game symbol inside card text (rune, might, energy…). Always carries a
// spoken name: a screen reader hears "might", not an image (card-text-rendering
// spec, "Rendered card text is static and accessible").
export interface GlyphProps {
	src: string;
	/** What the symbol is called, read aloud. */
	name: string;
}

export function Glyph({ src, name }: GlyphProps) {
	return <img className="kw-glyph" src={src} alt={name} loading="lazy" decoding="async" />;
}
