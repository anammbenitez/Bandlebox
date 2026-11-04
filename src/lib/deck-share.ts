// Shareable deck URLs (design.md D5). The deck serializes compactly as
// [slug, qty] pairs, gets deflated through the native CompressionStream when
// available, and lands base64url-encoded for a URL hash with a one-character
// scheme prefix. Payloads stay server-less: anyone opening the URL gets the
// deck from the hash alone. Node-safe (global CompressionStream) so the
// round-trip is script-verifiable.

import { DECK_SCHEMA_VERSION, type Deck, type DeckSlot, type SectionKey } from './deck.ts';

/** Compact section keys: legend / battlefields / main / rune / side. */
type SectionCode = 'l' | 'b' | 'm' | 'r' | 'y';

const CODE_BY_SECTION: Record<SectionKey, SectionCode> = { legend: 'l', battlefields: 'b', main: 'm', rune: 'r', side: 'y' };
const SECTION_BY_CODE: Record<SectionCode, SectionKey> = { l: 'legend', b: 'battlefields', m: 'main', r: 'rune', y: 'side' };

interface CompactDeck {
	v: number;
	/** Deck name. */
	n: string;
	/** Sections as [slug, qty] pairs. */
	s: Partial<Record<SectionCode, Array<[string, number]>>>;
}

const shareableSections: SectionKey[] = ['legend', 'battlefields', 'main', 'rune', 'side'];

function toPairs(slots: DeckSlot[]): Array<[string, number]> {
	return slots.map((s) => [s.card, s.qty] as [string, number]);
}

function compact(deck: Deck): CompactDeck {
	const s: CompactDeck['s'] = {};
	for (const key of shareableSections) s[CODE_BY_SECTION[key]] = toPairs(deck[key]);
	return { v: DECK_SCHEMA_VERSION, n: deck.name, s };
}

function fromCompact(raw: CompactDeck): Deck {
	const now = new Date().toISOString();
	const deck: Deck = {
		id: '',
		name: typeof raw.n === 'string' ? raw.n : 'Shared deck',
		createdAt: now,
		updatedAt: now,
		schemaVersion: DECK_SCHEMA_VERSION,
		legend: [],
		battlefields: [],
		main: [],
		rune: [],
		side: [],
	};
	for (const [code, key] of Object.entries(SECTION_BY_CODE) as Array<[string, SectionKey]>) {
		const pairs = raw.s?.[code];
		if (!Array.isArray(pairs)) continue;
		deck[key] = pairs
			.filter((p) => Array.isArray(p) && typeof p[0] === 'string' && typeof p[1] === 'number' && p[1] > 0)
			.map((p) => ({ card: p[0], qty: p[1] }));
	}
	return deck;
}

/* --- base64url helpers (byte-safe, URL hash friendly) --- */

function bytesToBase64url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(text: string): Uint8Array {
	const b64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

interface TextTransformStreamCtors {
	CompressionStream?: typeof CompressionStream;
	DecompressionStream?: typeof DecompressionStream;
}

const ctors: TextTransformStreamCtors = globalThis as unknown as TextTransformStreamCtors;

async function transformBytes(bytes: Uint8Array, format: string, compress: boolean): Promise<Uint8Array> {
	const Ctor = compress ? ctors.CompressionStream : ctors.DecompressionStream;
	if (!Ctor) throw new Error('no-comp');
	// Blob pipe (rather than a manual writer) keeps the await chain short:
	// every stage resolves once the data flows; no backpressure dance.
	const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new Ctor(format as CompressionFormat));
	const buffer = await new Response(stream).arrayBuffer();
	return new Uint8Array(buffer);
}

/** Encode a full deck into a hash payload: `d<base64url>` (deflate) or
 *  `b<base64url>` (plain JSON, when compression is unavailable). */
export async function encodeDeck(deck: Deck): Promise<string> {
	const json = JSON.stringify(compact(deck));
	if (ctors.CompressionStream) {
		try {
			const bytes = await transformBytes(new TextEncoder().encode(json), 'deflate', true);
			return 'd' + bytesToBase64url(bytes);
		} catch {
			// fall through to the uncompressed form
		}
	}
	return 'b' + bytesToBase64url(new TextEncoder().encode(json));
}

export interface DecodedDeck {
	deck: Deck;
	/** True when the payload could not be parsed at all: the caller then gets
	 *  an empty deck instead of throwing away unknown amounts of deck state. */
	broken: boolean;
}

/** Decode a produced payload back into a deck. Unknown slugs are kept in the
 *  deck itself (they fail validity later); structural garbage fails with
 *  `broken` instead of throwing away a deck full of other cards. */
export async function decodeDeck(payload: string): Promise<DecodedDeck> {
	const scheme = payload.charAt(0);
	const body = payload.slice(1);
	if (scheme !== 'd' && scheme !== 'b') return { deck: fromCompact({} as CompactDeck), broken: true };
	try {
		const bytes = base64urlToBytes(body);
		let json: string;
		if (scheme === 'b') {
			json = new TextDecoder().decode(bytes);
		} else {
			const rawBytes = await transformBytes(bytes, 'deflate', false);
			json = new TextDecoder().decode(rawBytes);
		}
		const raw = JSON.parse(json) as CompactDeck;
		return { deck: fromCompact(raw), broken: false };
	} catch (err) {
		console.warn('deck share decode failed', err);
		return { deck: fromCompact({} as CompactDeck), broken: true };
	}
}

/** True when the payload belongs to this app's share scheme. */
export function isSharePayload(hash: string): boolean {
	return hash.startsWith('#s/');
}

export function hashToPayload(hash: string): string {
	return hash.slice(3);
}
