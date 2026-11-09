// Post-build guard (openspec change migrate-to-react, design D3): the catalog
// snapshot is build-time data. If any client bundle in dist/_astro contains a
// card's printed text, something imported src/server (or data/) into code
// that ships to the browser. Fails the build when that happens.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'dist/_astro';
if (!existsSync('data/catalog.json') || !existsSync(OUT)) {
	console.log('bundle check skipped (no snapshot or no build output)');
	process.exit(0);
}

const snapshot = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
// A few long printed texts: unique enough never to appear by accident.
const sentinels = Object.values(snapshot.printings)
	.map((p) => p.printedRulesText ?? '')
	.filter((text) => text.length > 120)
	.slice(0, 5)
	.map((text) => text.slice(0, 80));

const leaks = [];
for (const name of readdirSync(OUT)) {
	if (!/\.(js|mjs|css)$/.test(name)) continue;
	const body = readFileSync(join(OUT, name), 'utf8');
	if (sentinels.some((s) => body.includes(s) || body.includes(JSON.stringify(s).slice(1, -1)))) leaks.push(name);
}

if (leaks.length) {
	console.error(`catalog data found in client bundles (something imports src/server or data/ into browser code):\n  ${leaks.join('\n  ')}`);
	process.exit(1);
}
console.log(`bundle check ok (${sentinels.length} sentinels, no catalog text in ${OUT})`);
