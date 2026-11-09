// Ported from scripts/verify-deck-core.mjs (openspec change migrate-to-react, task 3.2).
// Assertions are kept verbatim; only the harness moved to Vitest.
// @vitest-environment node
import { it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const fail = (msg) => {
	throw new Error(msg);
};

/* --- 1.2 deck-store ------------------------------------------------------- */

function stubStorage({
	getThrows = false,
	setThrows = false,
	store = new Map(),
} = {}) {
	return {
		getItem(key) {
			if (getThrows) throw new Error('storage blocked');
			return store.get(key) ?? null;
		},
		setItem(key, value) {
			if (setThrows) throw new Error('storage blocked');
			store.set(key, String(value));
		},
		removeItem(key) {
			store.delete(key);
		},
		clear() {
			store.clear();
		},
	};
}

const MODULES = {
	'../src/domain/deck-store.ts': () => import('./deck-store.ts'),
	'../src/domain/deck-rules.ts': () => import('./deck-rules.ts'),
	'../src/domain/deck.ts': () => import('./deck.ts'),
	'../src/domain/deck-share.ts': () => import('./deck-share.ts'),
};

/** A fresh module instance (the store keeps state per instance). */
async function freshModule(relative, query = '') {
	if (query) vi.resetModules();
	return await MODULES[relative]();
}

// healthy storage: create / list / rename / remove / id stability
it('healthy storage: create / list / rename / remove / id stability', async () => {
	const store = stubStorage();
	globalThis.localStorage = store;
	const ds = await freshModule('../src/domain/deck-store.ts', '?case=legacy');
	const deck = ds.addDeck('Testing');
	assert.ok(deck.id);
	assert.ok(store.getItem('riftbound-deck-library'));
});

// addDeck with a legend slug seeds the Legend zone (modal creation path)
it('addDeck with a legend slug seeds the Legend zone (modal creation path)', async () => {
	const store = stubStorage();
	globalThis.localStorage = store;
	const ds = await freshModule('../src/domain/deck-store.ts', '?case=legend');
	const deck = ds.addDeck('Poro Swarm', 'nine-tailed-fox');
	assert.deepEqual(deck.legend, [{ card: 'nine-tailed-fox', qty: 1 }], 'legend pre-seeded at creation');
	assert.deepEqual(ds.getDeck(deck.id).legend, [{ card: 'nine-tailed-fox', qty: 1 }], 'seed persists');
	assert.equal(deck.main.length, 0, 'rest of the deck stays empty');
});

// healthy storage: create / list / rename / remove / id stability
it('healthy storage: create / list / rename / remove / id stability', async () => {
	const store = stubStorage();
	globalThis.localStorage = store;
	const ds = await freshModule('../src/domain/deck-store.ts', '?case=healthy');
	const deck = ds.addDeck('Testing');
	assert.equal(deck.name, 'Testing');
	assert.ok(deck.id);
	assert.equal(ds.listDecks().length, 1);
	const renamed = ds.renameDeck(deck.id, 'Renamed');
	assert.equal(renamed.name, 'Renamed');
	assert.equal(ds.getDeck(deck.id).name, 'Renamed', 'same identity survives rename');
	ds.saveDeck({ ...ds.getDeck(deck.id), main: [{ card: 'x', qty: 2 }] });
	assert.equal(ds.getDeck(deck.id).main[0].qty, 2, 'persisted payload lookup callback verify');
	ds.removeDeck(deck.id);
	assert.equal(ds.listDecks().length, 0);
	assert.ok(store.getItem('riftbound-deck-library'), 'state was written back to storage');
	assert.equal(ds.takeStorageProblem(), null, 'healthy storage reports no warning');
});

// storage throwing on read: in-memory fallback + one-shot warned state
it('storage throwing on read: in-memory fallback + one-shot warned state', async () => {
	globalThis.localStorage = stubStorage({ getThrows: true });
	const ds = await freshModule('../src/domain/deck-store.ts', '?case=get-unsafe');
	const deck = ds.addDeck('Session');
	assert.equal(ds.listDecks().length, 1, 'deck usable without storage');
	assert.ok(ds.storageUnavailable(), 'unavailable flag set');
	const warned = ds.takeStorageProblem();
	assert.ok(warned && warned.length > 0, 'first call warns');
	assert.equal(ds.takeStorageProblem(), null, 'warning shown once');
	assert.equal(ds.getDeck(deck.id).name, 'Session');
});

// storage throwing on write: first read may succeed, mutation degrades
it('storage throwing on write: first read may succeed, mutation degrades', async () => {
	const map = new Map();
	const ds = await freshModule('../src/domain/deck-store.ts', '?case=set-unsafe');
	globalThis.localStorage = stubStorage({ setThrows: true, store: map });
	ds.addDeck('Fragile');
	assert.equal(ds.listDecks().length, 1, 'memory keeps the deck');
	assert.ok(map.size === 0, 'storage never accepted the write');
	assert.ok(ds.takeStorageProblem(), 'write failure warns');
});

// corrupt stored data: warn, but start empty instead of crashing
it('corrupt stored data: warn, but start empty instead of crashing', async () => {
	const store = stubStorage();
	globalThis.localStorage = store;
	store.setItem('riftbound-deck-library', '{not json');
	const ds = await freshModule('../src/domain/deck-store.ts', '?case=corrupt');
	assert.equal(ds.listDecks().length, 0);
	ds.addDeck('Fresh');
	assert.equal(ds.listDecks().length, 1, 'library usable after corrupt state');
});

const HAS_DATA = existsSync('data/index.json') && existsSync('data/catalog.json');

if (!HAS_DATA) {
	it.skip('needs the local snapshot (npm run refresh)', () => {});
} else {
const indexData = JSON.parse(readFileSync('data/index.json', 'utf8'));
const snapshotData = JSON.parse(readFileSync('data/catalog.json', 'utf8'));

/* --- 2.1 / 2.2 / 2.3 deck-rules against the real snapshot ------------------ */


const rulesMod = await freshModule('../src/domain/deck-rules.ts');
const deckMod = await freshModule('../src/domain/deck.ts');
const shareMod = await freshModule('../src/domain/deck-share.ts');

const idx = rulesMod.buildDeckRuleIndexes(snapshotData, indexData);
const byName = (name) => indexData.cards.find((c) => c.name === name);
const slugOf = (name) => {
	const card = byName(name);
	if (!card) fail(`fixture card not found: ${name}`);
	return card.slug;
};

// Constructed-banned card, whatever its exact name is in the snapshot
const slugById = new Map(indexData.cards.map((c) => [c.cardId, c.slug]));
const isConstructedBan = (ban) =>
	typeof ban === 'string' ? ban === 'standard' : ban?.formatId === 'standard' || ban?.formatName === 'Constructed';
const bannedEntry = Object.entries(snapshotData.cards).find(([, card]) => (card.bans ?? []).some(isConstructedBan));
if (!bannedEntry) fail('no constructed-banned card found in the snapshot');
const BANNED_SLUG = slugById.get(bannedEntry[0]);
const BANNED_NAME = indexData.cards.find((c) => c.slug === BANNED_SLUG).name;

// banned: Aspirant's Climb (or whatever Constructed ban comes first)
assert.equal(idx.cards[BANNED_SLUG].banned, true, 'banned card flagged as banned');
// copy override: Spiderling limit 0
it('copy override: Spiderling limit 0', async () => {
	const spiderling = Object.values(snapshotData.cards).find((c) => c.name === 'Spiderling');
	assert.equal(spiderling.maxCopiesOverride, 0, 'override survives index build');
});
// classification from superTypes
assert.equal(
	idx.cards[slugOf('Ahri, Alluring')].superTypes.includes('champion'),
	true,
	'champion classified from superTypes',
);
assert.equal(idx.cards[slugOf('Fox-Fire')].superTypes.includes('signature'), true, 'signature classified');
assert.equal(idx.cards[slugOf('Nine-Tailed Fox')].types.includes('legend'), true, 'legend classified');

// synthetic deck helpers
const LEGEND_SLUG = slugOf('Nine-Tailed Fox'); // calm + mind
const CHAMPION_SLUG = slugOf('Ahri, Alluring'); // calm, champion tag Ahri

const pool = indexData.cards
	.map((c) => c.slug)
	.filter((slug) => {
		const info = idx.cards[slug];
		if (!info) return false;
		if (slug === LEGEND_SLUG || slug === CHAMPION_SLUG) return false;
		if (info.types.includes('legend') || info.types.includes('rune') || info.types.includes('battlefield')) return false;
		if (!info.types.some((t) => ['unit', 'spell', 'gear'].includes(t))) return false;
		if (info.maxCopiesOverride != null) return false; // keep pool strictly over the default limit
		if (idx.cards[slug].banned) return false;
		return info.domains.every((d) => d === 'calm' || d === 'mind');
	});
if (pool.length < 45) fail(`fixture pool too small: ${pool.length}`);
assert.equal(pool.every((slug) => idx.cards[slug]), true, 'pool resolvable');

// three legal, distinct battlefields straight from the snapshot
const BATTLEFIELD_SLUGS = indexData.cards
	.filter((c) => {
		const info = idx.cards[c.slug];
		return info?.types.includes('battlefield') && !info.banned;
	})
	.slice(0, 3)
	.map((c) => c.slug);
if (BATTLEFIELD_SLUGS.length < 3) fail('not enough unlisted battlefields');

// the neutral-domain generic card (real data; fixtures add its own record too)
const NEUTRAL_SLUG = slugOf('Neeko, Blending In');

function filled() {
	// 1 champion + 39 others = 40. Copy limits respected by construction.
	const slots = [
		{ card: CHAMPION_SLUG, qty: 1 },
		...pool.slice(0, 39).map((slug) => ({ card: slug, qty: 1 })),
	];
	return [
		slots,
		{
			id: 'fixture',
			name: 'Fixture',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
			schemaVersion: 1,
			legend: [{ card: LEGEND_SLUG, qty: 1 }],
			battlefields: BATTLEFIELD_SLUGS.map((s) => ({ card: s, qty: 1 })),
			main: slots,
			rune: [],
			side: [],
		},
	];
}

function completed(extra = {}) {
	const [slots, deck] = filled();
	return { slots, deck: { ...deck, ...extra } };
}

function ruleOf(report, id) {
	return report.rules.find((r) => r.id === id);
}

// fully legal synthetic deck
it('fully legal synthetic deck', async () => {
	const { deck } = completed({
		rune: [
			{ card: slugOf('Calm Rune'), qty: 6 },
			{ card: slugOf('Mind Rune'), qty: 6 },
		],
	});	const report = rulesMod.validate(deck, idx);
	assert.equal(ruleOf(report, 'domain-identity').status, 'pass');
	assert.equal(ruleOf(report, 'champion-unit').status, 'pass');
	for (const rule of report.rules) {
		if (rule.status !== 'pass') fail(`legal deck failed rule ${rule.id}: ${rule.detail} :: ${JSON.stringify(rule.failures)}`);
	}
	assert.equal(report.legal, true, 'synthetic full deck validates legal');
});

// 39 and 41 cards fail main-size with counts in detail
it('39 and 41 cards fail main-size with counts in detail', async () => {
	for (const [, n] of [[39, 0], [41, 2]]) {
		const { slots, deck } = completed();
		const trimmed = n === 0 ? slots.slice(0, -1) : [...slots, { card: pool[40], qty: 1 }];
		const report = rulesMod.validate({ ...deck, main: trimmed }, idx);
		assert.equal(ruleOf(report, 'main-size').status, 'fail');
		assert.equal(ruleOf(report, 'main-size').detail, `${trimmed.reduce((s, x) => s + x.qty, 0)} of 40`);
		assert.equal(report.legal, false);
	}
});

// duplicate battlefield fails distinctness
it('duplicate battlefield fails distinctness', async () => {
	const { deck } = completed();
	const bf = [{ card: BATTLEFIELD_SLUGS[0], qty: 1 }, { card: BATTLEFIELD_SLUGS[0], qty: 1 }, { card: BATTLEFIELD_SLUGS[1], qty: 1 }];
	const report = rulesMod.validate({ ...deck, battlefields: bf }, idx);
	assert.equal(ruleOf(report, 'battlefield-count').status, 'fail');
	assert.match(ruleOf(report, 'battlefield-count').detail, /more than once/);
});

// 4th copy over the name limit
it('4th copy over the name limit', async () => {
	const { slots, deck } = completed();
	const with4 = [...slots.slice(1), { card: slots[1].card, qty: 4 }];
	const report = rulesMod.validate({ ...deck, main: with4 }, idx);
	assert.equal(ruleOf(report, 'copy-limit').status, 'fail');
	assert.match(ruleOf(report, 'copy-limit').failures[0], new RegExp(idx.names[slots[1].card]));
});

// limit-0 card (Spiderling) exceeds its override
it('limit-0 card (Spiderling) exceeds its override', async () => {
	const { slots, deck } = completed();
	const with0 = [...slots.slice(1), { card: slugOf('Spiderling'), qty: 1 }];
	const report = rulesMod.validate({ ...deck, main: with0 }, idx);
	assert.equal(ruleOf(report, 'copy-limit').status, 'fail');
	assert.match(ruleOf(report, 'copy-limit').failures[0], /Spiderling \(limit 0, has 1\)/);
	assert.match(ruleOf(report, 'copy-limit').failures[0], new RegExp('Spiderling'));
});

// off-color card fails domain identity, named
it('off-color card fails domain identity, named', async () => {
	const { deck } = completed();
	const fury = indexData.cards.find((c) => {
		const info = idx.cards[c.slug];
		return info && info.types.includes('unit') && info.domains.includes('fury');
	});
	if (!fury) fail('no fury unit found for the off-color fixture');
	const report = rulesMod.validate({ ...deck, main: [...deck.main.slice(1), { card: fury.slug, qty: 1 }] }, idx);
	assert.equal(ruleOf(report, 'domain-identity').status, 'fail');
	assert.ok(ruleOf(report, 'domain-identity').failures.some((f) => f === fury.name), `failure named ${fury.name}`);
});

// signature quantity over cap (4 Fox-Fire copies: same Ahri tag)
it('signature quantity over cap (4 Fox-Fire copies: same Ahri tag)', async () => {
	const { slots, deck } = completed();
	const withSig = [...slots.slice(1), { card: slugOf('Fox-Fire'), qty: 4 }];
	const report = rulesMod.validate({ ...deck, main: withSig }, idx);
	assert.equal(ruleOf(report, 'signature-cap').status, 'fail');
	assert.match(ruleOf(report, 'signature-cap').detail, /signature/i);
});

// no legend: domain + champion rules pend, not fail; deck not legal
it('no legend: domain + champion rules pend, not fail; deck not legal', async () => {
	const { deck } = completed();
	const legendLess = { ...deck, legend: [] };
	const report = rulesMod.validate(legendLess, idx);
	assert.equal(ruleOf(report, 'domain-identity').status, 'pending', 'domain pends without legend');
	assert.match(ruleOf(report, 'domain-identity').detail, /Legend/);
	assert.equal(ruleOf(report, 'champion-unit').status, 'pending', 'champion pends without legend');
	assert.equal(
		ruleOf(report, 'domain-identity').failures.length,
		0,
		'pending does not mass-fail cards',
	);
	assert.equal(report.legal, false);
});

// banned card named in the failure
it('banned card named in the failure', async () => {
	const { deck } = completed();
	const report = rulesMod.validate(
		{ ...deck, side: [{ card: BANNED_SLUG, qty: 2 }] },
		idx,
	);
	assert.equal(ruleOf(report, 'bans').status, 'fail');
	assert.match(ruleOf(report, 'bans').failures[0], new RegExp(BANNED_NAME));
});

// card missing from this snapshot fails known-cards, not domain (unclassifiable -> fail)
it('card missing from this snapshot fails known-cards, not domain (unclassifiable -> fail)', async () => {
	const { deck } = completed();
	const report = rulesMod.validate({ ...deck, side: [{ card: 'ghost-card', qty: 1 }] }, idx);
	assert.equal(ruleOf(report, 'known-cards').status, 'fail');
	assert.match(ruleOf(report, 'known-cards').failures[0], /ghost-card/);
	assert.equal(report.legal, false);
});

// 12x one rune is a legal ratio: copy-limit passes, rune-size passes
it('12x one rune is a legal ratio: copy-limit passes, rune-size passes', async () => {
	const calmRune = slugOf('Calm Rune');
	const { deck } = completed({ rune: [{ card: calmRune, qty: 12 }] });
	const report = rulesMod.validate(deck, idx);
	assert.equal(ruleOf(report, 'copy-limit').status, 'pass', 'rune ratio is uncapped');
	assert.equal(ruleOf(report, 'rune-size').status, 'pass', 'twelve runes meet the rune deck size');
});

// doubled legend slot: legend rule fails naming the card, deck not legal
it('doubled legend slot: legend rule fails naming the card, deck not legal', async () => {
	const { deck } = completed();
	const doubled = { ...deck, legend: [{ card: LEGEND_SLUG, qty: 2 }] };
	const report = rulesMod.validate(doubled, idx);
	assert.equal(ruleOf(report, 'legend-count').status, 'fail', 'legend rule counts copies');
	assert.match(ruleOf(report, 'legend-count').failures[0], new RegExp(idx.names[LEGEND_SLUG]));
	assert.equal(report.legal, false);
});

// doubled battlefield slot: battlefield rule fails naming the card
it('doubled battlefield slot: battlefield rule fails naming the card', async () => {
	const { deck } = completed();
	const doubled = [
		...deck.battlefields.slice(0, 2),
		{ card: deck.battlefields[2].card, qty: 2 },
	];
	const report = rulesMod.validate({ ...deck, battlefields: doubled }, idx);
	assert.equal(ruleOf(report, 'battlefield-count').status, 'fail', 'battlefield rule counts copies');
	assert.match(ruleOf(report, 'battlefield-count').detail, /one copy each/);
	assert.match(ruleOf(report, 'battlefield-count').failures[0], new RegExp(idx.names[doubled[2].card]));
	assert.equal(report.legal, false);
});

// neutral-domain card passes domain identity in every deck (Neeko case)
it('neutral-domain card passes domain identity in every deck (Neeko case)', async () => {
	const { deck } = completed();
	const idx2 = {
		...idx,
		cards: { ...idx.cards, [NEUTRAL_SLUG]: { types: ['unit'], superTypes: [], domains: ['neutral'], tags: [], maxCopiesOverride: null, banned: false } },
		names: { ...idx.names, [NEUTRAL_SLUG]: 'Neeko, Blending In' },
	};
	const report = rulesMod.validate({ ...deck, side: [{ card: NEUTRAL_SLUG, qty: 1 }] }, idx2);
	assert.equal(ruleOf(report, 'domain-identity').status, 'pass', 'neutral domain legal everywhere');
	assert.equal(ruleOf(report, 'domain-identity').failures.length, 0);
});

// slug with no domain data fails the domain rule explicitly
it('slug with no domain data fails the domain rule explicitly', async () => {
	const { deck } = completed();
	const ghost = 'ghost-card';
	const idx2 = {
		...idx,
		cards: { ...idx.cards, [ghost]: { types: ['unit'], superTypes: [], domains: [], tags: [], maxCopiesOverride: null, banned: false } },
		names: { ...idx.names, [ghost]: 'Ghost' },
	};
	const report = rulesMod.validate({ ...deck, side: [{ card: ghost, qty: 1 }] }, idx2);
	assert.equal(ruleOf(report, 'domain-identity').status, 'fail', 'missing domains fail, no silent pass');
});

/* --- 3.1 / 3.2 deck-share round trip -------------------------------------- */

it('verify-deck-core.mjs scenario 23', async () => {
	const { deck } = completed({
		rune: [
			{ card: slugOf('Calm Rune'), qty: 7 },
			{ card: slugOf('Mind Rune'), qty: 5 },
		],
		side: [{ card: slugOf('Fox-Fire'), qty: 1 }],
		name: 'Round Trip',
	});
	const payload = await shareMod.encodeDeck(deck);
	assert.match(payload[0], /d|b/, `payload carries a scheme prefix: ${payload[0]}`);
	assert.ok(payload.length > 2);

	const round = await shareMod.decodeDeck(payload);
	assert.equal(round.broken, false);
	assert.equal(round.deck.name, 'Round Trip');
	for (const section of deckMod.SECTION_KEYS) {
		assert.deepEqual(round.deck[section], deck[section], `${section} round-trips`);
	}
	assert.deepEqual(round.deck, { ...deck, id: '', createdAt: round.deck.createdAt, updatedAt: round.deck.updatedAt });
});

// unknown slug survives a decode and is reported by the checker
it('unknown slug survives a decode and is reported by the checker', async () => {
	const raw = {
		v: 1,
		n: 'Keeps Going',
		s: {
			m: [['definitely-not-a-card-xyz', 2], [CHAMPION_SLUG, 3]],
			l: [[LEGEND_SLUG, 1]],
		},
	};
	const payload = 'b' + Buffer.from(JSON.stringify(raw)).toString('base64url');
	const { deck } = await shareMod.decodeDeck(payload);
	assert.equal(deck.main.length, 2, 'unknown card keeps its row');
	assert.equal(deck.legend.length, 1, 'other sections unaffected');
	const report = rulesMod.validate(deck, idx);
	assert.equal(ruleOf(report, 'known-cards').status, 'fail');
});

// hand-mutated garbage: broken flag, no crash
it('hand-mutated garbage: broken flag, no crash', async () => {
	const out = await shareMod.decodeDeck('d@@@not-anything@@@');
	assert.equal(out.broken, true);
	assert.equal(out.deck.main.length, 0);
});
it('verify-deck-core.mjs scenario 26', async () => {
	const out = await shareMod.decodeDeck('xwhatever');
	assert.equal(out.broken, true);
});

/* --- champion pick (planned change 4.1 / 4.5: decks remember their pick) -- */

const CHAMPION = CHAMPION_SLUG;
it('verify-deck-core.mjs scenario 27', async () => {
	const { deck } = completed({ main: [{ card: CHAMPION, qty: 3 }], name: 'Championed' });
	deck.champion = CHAMPION;
	const payload = await shareMod.encodeDeck(deck);
	const round = await shareMod.decodeDeck(payload);
	assert.equal(round.broken, false);
	assert.equal(round.deck.champion, CHAMPION, 'champion pick round-trips');
	assert.equal(round.deck.main.find((s) => s.card === CHAMPION)?.qty, 3, 'champion playset counts in the main deck exactly once');
	assert.equal(round.deck.main.length, 1, 'no doubled champion rows');
});

// legacy payload without the field: empty zone, deck intact
it('legacy payload without the field: empty zone, deck intact', async () => {
	const raw = { v: 1, n: 'Legacy', s: { m: [[CHAMPION_SLUG, 1]], l: [[LEGEND_SLUG, 1]] } };
	const payload = 'b' + Buffer.from(JSON.stringify(raw)).toString('base64url');
	const { deck } = await shareMod.decodeDeck(payload);
	assert.equal(deck.champion, undefined, 'absent champion field opens with an empty zone');
	assert.equal(deck.main.length, 1);
});

// stale pick (unknown slug) keeps the deck open without failing the parse
it('stale pick (unknown slug) keeps the deck open without failing the parse', async () => {
	const raw = { v: 1, n: 'Stale Pick', c: 'ghost-champion-xyz', s: { l: [[LEGEND_SLUG, 1]] } };
	const payload = 'b' + Buffer.from(JSON.stringify(raw)).toString('base64url');
	const { deck, broken } = await shareMod.decodeDeck(payload);
	assert.equal(broken, false, 'stale pick does not break the payload');
	assert.equal(deck.champion, 'ghost-champion-xyz', 'stale pick is carried, not dropped');
});

/* --- shared domain / champion-tag decisions (card peek reads the same ones) -- */

it('verify-deck-core.mjs scenario 30', async () => {
	const info = (domains, extra = {}) => ({
		types: ['unit'],
		superTypes: [],
		domains,
		tags: [],
		maxCopiesOverride: null,
		banned: false,
		...extra,
	});
	const legendColors = ['calm', 'mind'];

	assert.equal(rulesMod.domainVerdict(info(['calm']), legendColors), 'fits', 'one matching color fits');
	assert.equal(rulesMod.domainVerdict(info(['calm', 'mind']), legendColors), 'fits', 'both colors fit');
	assert.equal(rulesMod.domainVerdict(info(['fury']), legendColors), 'off', 'a foreign color is off');
	assert.equal(rulesMod.domainVerdict(info(['calm', 'fury']), legendColors), 'off', 'any foreign domain makes it off');
	assert.equal(rulesMod.domainVerdict(info(['neutral']), legendColors), 'fits', 'neutral fits every Legend');
	assert.equal(rulesMod.domainVerdict(info(['neutral']), []), 'fits', 'neutral fits even an empty color set');
	assert.equal(rulesMod.domainVerdict(info([]), legendColors), 'unclassified', 'no domain data is unclassified');
	assert.equal(
		rulesMod.domainVerdict(info(['calm']), new Set(legendColors)),
		rulesMod.domainVerdict(info(['calm']), legendColors),
		'a Set and an array of colors give the same answer',
	);
	// real data: the fixture champion (calm) sits inside the fixture Legend's colors
	assert.equal(rulesMod.domainVerdict(idx.cards[CHAMPION_SLUG], idx.cards[LEGEND_SLUG].domains), 'fits');

	const legend = (tags) => info([], { types: ['legend'], tags });
	assert.equal(rulesMod.legendChampionTag(legend(['Zzz', 'Ahri']), ['Ahri']), 'Ahri', 'first tag that appears on a champion');
	assert.equal(rulesMod.legendChampionTag(legend(['Mystery', 'Other']), []), 'Mystery', 'falls back to the first tag');
	assert.equal(rulesMod.legendChampionTag(legend([]), ['Ahri']), undefined, 'no tags, no champion tag');
	assert.equal(rulesMod.legendChampionTag(undefined, ['Ahri']), undefined, 'no Legend, no champion tag');
	assert.ok(
		idx.cards[CHAMPION_SLUG].tags.includes(rulesMod.legendChampionTag(idx.cards[LEGEND_SLUG], idx.championTags)),
		'the fixture Legend resolves to a tag its champion carries',
	);
});

/* --- deck name rules (spec: deck names stay valid when renamed) ---------------- */

it('verify-deck-core.mjs scenario 31', async () => {
	const { cleanDeckName, DECK_NAME_MAX } = deckMod;
	assert.equal(DECK_NAME_MAX, 80, 'same limit as the creation modal');
	assert.equal(cleanDeckName('  Poro Swarm  '), 'Poro Swarm', 'surrounding whitespace is trimmed');
	assert.equal(cleanDeckName('Poro  Swarm'), 'Poro  Swarm', 'inner spaces are kept');
	assert.equal(cleanDeckName(''), '', 'empty stays empty');
	assert.equal(cleanDeckName(' \t\n '), '', 'whitespace-only is blank');
	assert.equal(cleanDeckName('a'.repeat(80)), 'a'.repeat(80), '80 characters are kept');
	assert.equal(cleanDeckName('a'.repeat(81)), 'a'.repeat(80), '81 characters are clamped');
	assert.equal(cleanDeckName('a'.repeat(79) + ' b'), 'a'.repeat(79), 'a clamp that ends on a space is trimmed');
});
}
