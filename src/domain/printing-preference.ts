// Which printing's art a card shows across the app. The catalog is static, so
// the choice is the browser's: one small localStorage entry, slug -> image id,
// read by every card face. No DOM beyond globalThis.localStorage; a storage
// that throws just means nothing is remembered.

const STORAGE_KEY = 'riftbound-printing-preference';

type Preferences = Record<string, string>;
type Listener = () => void;

const listeners = new Set<Listener>();
let cache: Preferences | null = null;

function storage(): Storage | null {
	try {
		return (globalThis.localStorage as Storage | undefined) ?? null;
	} catch {
		return null;
	}
}

function read(): Preferences {
	if (cache) return cache;
	let parsed: Preferences = {};
	try {
		const raw = storage()?.getItem(STORAGE_KEY);
		const value: unknown = raw ? JSON.parse(raw) : {};
		if (value && typeof value === 'object') {
			for (const [slug, id] of Object.entries(value)) if (typeof id === 'string') parsed[slug] = id;
		}
	} catch {
		parsed = {};
	}
	cache = parsed;
	return parsed;
}

/** The image id chosen for a card, or null for "the catalog's default". */
export function getPreferredImage(slug: string): string | null {
	return read()[slug] ?? null;
}

/** Remember a printing's art for the card; null forgets it. */
export function setPreferredImage(slug: string, imageId: string | null): void {
	const next = { ...read() };
	if (imageId) next[slug] = imageId;
	else delete next[slug];
	cache = next;
	try {
		storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// kept for this page only
	}
	for (const listener of listeners) listener();
}

export function subscribePreferences(listener: Listener): () => void {
	listeners.add(listener);
	const onStorage = (event: StorageEvent) => {
		if (event.key !== STORAGE_KEY) return;
		cache = null;
		listener();
	};
	globalThis.addEventListener?.('storage', onStorage);
	return () => {
		listeners.delete(listener);
		globalThis.removeEventListener?.('storage', onStorage);
	};
}
