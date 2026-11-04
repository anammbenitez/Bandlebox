// src/lib/keyword-styles.ts — keyword label colors.
//
// The catalog snapshot carries keyword names and flags but no colors; these
// values are the card game's keyword palette as published by OpenRift's site
// data (the same categories the printed cards use). This is an app-owned
// constant table, following the same pattern as DOMAIN_COLORS in
// src/scripts/deck-builder.ts: a keyword introduced by a later refresh renders
// in the neutral fallback instead of breaking, and the gap is easy to spot.
//
// `ink` is the label text color: dark ink on the olive band, white elsewhere.

export interface KeywordChipStyle {
	color: string;
	ink: string;
}

interface KeywordEntry {
	color: string;
	darkText: boolean;
}

const KEYWORDS: Record<string, KeywordEntry> = {
	Accelerate: { color: '#24705f', darkText: false },
	Action: { color: '#24705f', darkText: false },
	Add: { color: '#707070', darkText: false },
	Ambush: { color: '#24705f', darkText: false },
	Assault: { color: '#cd346f', darkText: false },
	Backline: { color: '#cd346f', darkText: false },
	Buff: { color: '#707070', darkText: false },
	Burn: { color: '#707070', darkText: false },
	Deathknell: { color: '#95b229', darkText: true },
	Deflect: { color: '#95b229', darkText: true },
	Deploy: { color: '#24705f', darkText: false },
	Disarm: { color: '#cd346f', darkText: false },
	Empower: { color: '#707070', darkText: false },
	Empowered: { color: '#95b229', darkText: true },
	Equip: { color: '#707070', darkText: false },
	Flow: { color: '#24705f', darkText: false },
	Ganking: { color: '#95b229', darkText: true },
	Hidden: { color: '#24705f', darkText: false },
	Hunt: { color: '#95b229', darkText: true },
	Legion: { color: '#24705f', darkText: false },
	Level: { color: '#95b229', darkText: true },
	Mighty: { color: '#707070', darkText: false },
	Predict: { color: '#707070', darkText: false },
	'Quick-Draw': { color: '#24705f', darkText: false },
	Reaction: { color: '#24705f', darkText: false },
	Repeat: { color: '#24705f', darkText: false },
	Shield: { color: '#cd346f', darkText: false },
	'Show Off': { color: '#24705f', darkText: false },
	Stun: { color: '#707070', darkText: false },
	Tank: { color: '#cd346f', darkText: false },
	Temporary: { color: '#95b229', darkText: true },
	Unique: { color: '#707070', darkText: false },
	Vision: { color: '#707070', darkText: false },
	Weaponmaster: { color: '#707070', darkText: false },
};

const FALLBACK: KeywordChipStyle = { color: '#707070', ink: '#ffffff' };

/** Resolves a keyword label's colors. `Assault 3` uses the `Assault` entry. */
export function keywordChipStyle(name: string): KeywordChipStyle {
	const base = name.trim().replace(/\s+\d+$/u, '');
	const entry = KEYWORDS[base];
	if (!entry) return FALLBACK;
	return { color: entry.color, ink: entry.darkText ? '#0b0e12' : '#ffffff' };
}

/** Every known keyword, for tooling and verification. */
export const KNOWN_KEYWORDS = Object.keys(KEYWORDS);
