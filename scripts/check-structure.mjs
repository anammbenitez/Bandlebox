// Structure rules ESLint cannot see (openspec change migrate-to-react, design
// D2): `.astro` files live only in src/pages and src/layouts, and there are no
// barrel index files (react-best-practices: bundle-barrel-imports).
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = 'src';
const ASTRO_HOMES = ['pages', 'layouts'];
const problems = [];

function walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			walk(path);
			continue;
		}
		const rel = relative(ROOT, path).split(sep).join('/');
		if (name.endsWith('.astro') && !ASTRO_HOMES.includes(rel.split('/')[0])) {
			problems.push(`${path}: .astro files belong in src/pages or src/layouts; UI is React (.tsx)`);
		}
		if (/^index\.(ts|tsx|js)$/.test(name)) {
			problems.push(`${path}: no barrel files; import modules directly`);
		}
	}
}

walk(ROOT);
if (problems.length) {
	for (const p of problems) console.error(p);
	process.exit(1);
}
console.log('structure ok');
