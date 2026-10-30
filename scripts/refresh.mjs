// scripts/refresh.mjs — catalog snapshot + derived index builder.
//
// Fetches the OpenRift catalog (English only) into the local snapshot, with
// ETag-based conditional revalidation, then rebuilds the derived index.
//
// Data ownership: this script ONLY ever writes OpenRift-owned files inside
// data/ — catalog.json (the verbatim snapshot), etag.txt (revalidation key),
// and index.json (derived directly from the snapshot). It never creates,
// modifies, or deletes anything else; app-owned data (collections, decks —
// later phases) must live elsewhere or under different names.
//
// Card text and images in the snapshot are Riot Games / OpenRift content:
// used locally, never mirrored to other places or hosted publicly.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const BASE_URL = process.env.OPENRIFT_BASE ?? 'https://openrift.app';
const CATALOG_PATH = '/api/v1/catalog?langs=EN';
const LANGS = 'EN';
// TODO(user): put a real contact (email or repo/issue URL) here so OpenRift
// can warn us directly about breaking API changes.
const CONTACT = 'personal local tool';
const USER_AGENT = `RiftboundDeckManager/0.1 (${CONTACT})`;
const TIMEOUT_MS = 120_000;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const ETAG_FILE = path.join(DATA_DIR, 'etag.txt');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

class RefreshError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = 'RefreshError';
	}
}

/** @returns {Promise<string|null>} stored ETag, or null when empty/missing */
async function readStoredEtag() {
	try {
		return (await readFile(ETAG_FILE, 'utf8')).trim() || null;
	} catch {
		return null;
	}
}

async function snapshotExists() {
	try {
		return (await readFile(CATALOG_FILE, 'utf8')).trim().length > 0;
	} catch {
		return false;
	}
}

async function writeAtomic(file, body) {
	const tmp = `${file}.tmp`;
	await writeFile(tmp, body);
	await rename(tmp, file);
}

/**
 * Fetch the catalog honouring the stored ETag.
 * @returns {Promise<{status: number, etag: string|null, body: string|null, error: unknown}>}
 */
async function fetchCatalog(storedEtag) {
	try {
		/** @type {Record<string, string>} */
		const headers = { 'User-Agent': USER_AGENT, Accept: 'application/json' };
		if (storedEtag) headers['If-None-Match'] = storedEtag;

		const response = await fetch(`${BASE_URL}${CATALOG_PATH}`, {
			headers,
			redirect: 'follow',
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		const etag = response.headers.get('etag');

		if (response.status === 304) return { status: 304, etag: storedEtag, body: null, error: null };
		if (response.status !== 200) return { status: response.status, etag, body: null, error: null };
		return { status: 200, etag, body: await response.text(), error: null };
	} catch (err) {
		return { status: 0, etag: null, body: null, error: err };
	}
}

/** Validate the response shape before touching anything on disk. */
function validateSnapshot(snapshot) {
	if (!isPlainObject(snapshot)) {
		throw new RefreshError('Malformed response: top level is not a JSON object.');
	}
	for (const key of ['sets', 'cards', 'printings']) {
		// sets can arrive as an array or a map depending on API revision;
		// cards/printings are maps keyed by UUID.
		if (!(Array.isArray(snapshot[key]) || isPlainObject(snapshot[key]))) {
			throw new RefreshError(`Malformed response: "${key}" is missing or not a collection.`);
		}
	}
	for (const card of Object.values(snapshot.cards)) {
		if (!isPlainObject(card) || typeof card.slug !== 'string' || typeof card.name !== 'string') {
			throw new RefreshError('Malformed response: a card entry lacks slug/name.');
		}
	}
	for (const printing of Object.values(snapshot.printings)) {
		if (!isPlainObject(printing) || typeof printing.cardId !== 'string' || typeof printing.setId !== 'string') {
			throw new RefreshError('Malformed response: a printing entry lacks cardId/setId.');
		}
	}
	for (const set of Object.values(snapshot.sets)) {
		if (!isPlainObject(set) || typeof set.id !== 'string' || typeof set.slug !== 'string' || typeof set.name !== 'string') {
			throw new RefreshError('Malformed response: a set entry lacks id/slug/name.');
		}
	}
}

/**
 * Build the derived index (design D4): the phase-2 contract keyed on
 * cardId / printingId / set slug. `meta.langs` mirrors the ?langs= param.
 */
function buildIndex(snapshot, etag, fetchedAt) {
	const setsByUuid = new Map();
	for (const set of Object.values(snapshot.sets)) {
		setsByUuid.set(set.id, {
			// Releases is a map of language code -> { releasedAt, precision }.
			setId: set.id,
			slug: set.slug,
			name: set.name,
			setType: set.setType ?? null,
			releases: set.releases ?? {},
		});
	}

	const seenPrintingIds = new Set();
	const cards = Object.entries(snapshot.cards).map(([cardId, card]) => {
		const printings = [];
		for (const [printingId, printing] of Object.entries(snapshot.printings)) {
			if (printing.cardId !== cardId) continue;
			if (seenPrintingIds.has(printingId)) {
				throw new RefreshError(`Index build failed: printing ${printingId} matched twice.`);
			}
			seenPrintingIds.add(printingId);

			const set = setsByUuid.get(printing.setId);
			if (!set) {
				throw new RefreshError(`Index build failed: printing ${printingId} references unknown set ${printing.setId}.`);
			}

			// OpenRift embeds double-sided tokens fully in `side2` instead of
			// referencing a printing id; the counterpart's faceId is the most
			// stable identifier available for the back face.
			const side2PrintingId = printing.side2?.faceId ?? null;

			printings.push({
				printingId,
				setId: set.setId,
				setSlug: set.slug,
				language: printing.language ?? null,
				rarity: printing.rarity ?? null,
				finish: printing.finish ?? null,
				artVariant: printing.artVariant ?? null,
				imageIds: Array.isArray(printing.images) ? printing.images.filter((i) => typeof i?.imageId === 'string').map((i) => i.imageId) : [],
				side2PrintingId,
			});
		}

		printings.sort((a, b) => {
			const rank = (pid) => snapshot.printings[pid].canonicalRank ?? Number.MAX_SAFE_INTEGER;
			return rank(a.printingId) - rank(b.printingId);
		});

		return {
			cardId,
			slug: card.slug,
			name: card.name,
			types: Array.isArray(card.types) ? card.types : [],
			printings,
		};
	});

	if (seenPrintingIds.size !== Object.keys(snapshot.printings).length) {
		throw new RefreshError(
			`Index build failed: printing count mismatch (${seenPrintingIds.size} indexed vs ${Object.keys(snapshot.printings).length} in snapshot)`,
		);
	}

	return {
		meta: { fetchedAt, etag, langs: LANGS },
		sets: [...setsByUuid.values()],
		cards,
	};
}

async function refresh() {
	const storedEtag = await readStoredEtag();
	const haveSnapshot = await snapshotExists();

	const url = `${BASE_URL}${CATALOG_PATH}`;
	console.log(`[refresh] Fetching ${url}`);
	if (storedEtag && haveSnapshot) console.log('[refresh] Sending stored If-None-Match for conditional revalidation…');

	const result = await fetchCatalog(storedEtag && haveSnapshot ? storedEtag : null);

	if (result.status === 304) {
		console.log('[refresh] Up to date — server returned 304 Not Modified, snapshot untouched.');
		return 0;
	}

	if (result.status === 0) {
		const reason = result.error instanceof Error ? result.error.message : String(result.error);
		console.error(`[refresh] Network request failed (${reason}). Keeping the existing snapshot${haveSnapshot ? '' : ' (none yet)'}. Run again when online.`);
		return 1;
	}

	if (result.status !== 200) {
		console.error(`[refresh] Unexpected HTTP status ${result.status}. Keeping the existing snapshot${haveSnapshot ? '' : ' (none yet)'}.`);
		return 1;
	}

	let snapshot;
	try {
		snapshot = JSON.parse(result.body);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		console.error(`[refresh] Malformed response (unparseable JSON: ${reason}). Keeping the existing snapshot${haveSnapshot ? '' : ' (none yet)'}.`);
		return 1;
	}

	try {
		validateSnapshot(snapshot);
	} catch (err) {
		console.error(`[refresh] ${err instanceof Error ? err.message : String(err)} Keeping the existing snapshot${haveSnapshot ? '' : ' (none yet)'}.`);
		return 1;
	}

	// Build the whole new state in memory first so a failure here cannot leave
	// the snapshot updated while the index (or etag) stayed stale.
	const fetchedAt = new Date().toISOString();
	const index = buildIndex(snapshot, result.etag, fetchedAt);

	await mkdir(DATA_DIR, { recursive: true });
	await writeAtomic(CATALOG_FILE, result.body);
	if (result.etag) await writeAtomic(ETAG_FILE, `${result.etag}\n`);
	await writeAtomic(INDEX_FILE, JSON.stringify(index, null, 2));

	console.log(
		`[refresh] Snapshot updated: ${Object.keys(snapshot.cards).length} cards, ${Object.keys(snapshot.printings).length} printings, ${index.sets.length} sets (ETag ${result.etag ?? 'missing'}).`,
	);
	console.log(`[refresh] Derived index rebuilt -> data/index.json (+ data/etag.txt).`);
	return 0;
}

try {
	process.exitCode = await refresh();
} catch (err) {
	// Anything thrown outside the handled paths keeps previous files, too.
	const haveSnapshot = await snapshotExists();
	console.error(`[refresh] ${err instanceof Error ? err.message : String(err)} Keeping the existing snapshot${haveSnapshot ? '' : ' (none yet)'}.`);
	process.exitCode = 1;
}
