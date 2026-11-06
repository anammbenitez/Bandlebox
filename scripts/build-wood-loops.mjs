// Builds the seamless, straightened branch strip the site header repeats along
// its underside (src/assets/wood/edge_bottom_loop.png).
//
// The ChatGPT branch pack ships each edge as one finite strip whose branch
// wanders up and down and whose two ends do not match, so tiling it shows a
// kink every period, stretching it smears the leaves, and the far end of a
// repeated strip lands at an arbitrary height against its corner. Two steps fix
// that:
//   1. Straighten: every column (row, for the side strips) is shifted so the
//      branch's centre sits on one constant line. Leaves ride along. Corners are
//      placed against that line, so a strip meets its corner at any phase.
//   2. Mirror: the strip is joined to its own mirror image. A|A' meets on A's
//      right end and A'|A on A's left end, so the pair repeats with no seam.
//
// Usage: node scripts/build-wood-loops.mjs [packDir]
//   packDir defaults to the pack's folder on the designer's Desktop; the four
//   edge_*.png files are the only inputs. Output goes to src/assets/wood/.
// Prints the strip's branch line (source px); `.site-header::after` is placed from it.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = process.argv[2] ?? path.join(os.homedir(), 'Desktop', 'ASSETS', 'bandlebox_branch_assets');
const out = path.join(root, 'src', 'assets', 'wood');

// Branch line each strip is straightened onto, in source px from the strip's
// top (horizontal strips) or left (vertical strips).
const TARGET = { top: 86, bottom: 93, left: 93, right: 131 };

const isBrown = (d, i) => d[i + 3] > 200 && d[i] > d[i + 1] * 1.08 && d[i] > d[i + 2] * 1.35;
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

async function straighten(name, horizontal) {
	const { data, info } = await sharp(path.join(pack, `edge_${name}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const { width: w, height: h } = info;
	const lines = horizontal ? w : h; // one scan line per column (row)
	const span = horizontal ? h : w;
	const at = (line, pos) => (horizontal ? (pos * w + line) * 4 : (line * w + pos) * 4);

	// 1. branch centre per scan line (brown pixels only; NaN where none)
	const centre = new Array(lines).fill(NaN);
	for (let l = 0; l < lines; l++) {
		let sum = 0, n = 0;
		for (let p = 0; p < span; p++) if (isBrown(data, at(l, p))) { sum += p; n++; }
		if (n >= 4) centre[l] = sum / n;
	}
	// 2. fill gaps, then smooth hard so only the wander (not the bark grain) is removed
	const known = centre.map((v, i) => [v, i]).filter(([v]) => !Number.isNaN(v));
	const filled = centre.map((v, i) => {
		if (!Number.isNaN(v)) return v;
		const prev = known.filter(([, j]) => j < i).pop() ?? known[0];
		const next = known.find(([, j]) => j > i) ?? known[known.length - 1];
		return prev[1] === next[1] ? prev[0] : prev[0] + ((next[0] - prev[0]) * (i - prev[1])) / (next[1] - prev[1]);
	});
	const R = 18;
	const smooth = filled.map((_, i) => {
		const win = [];
		for (let k = Math.max(0, i - R); k <= Math.min(lines - 1, i + R); k++) win.push(filled[k]);
		return median(win);
	});
	const smooth2 = smooth.map((_, i) => {
		let s = 0, n = 0;
		for (let k = Math.max(0, i - R); k <= Math.min(lines - 1, i + R); k++) { s += smooth[k]; n++; }
		return s / n;
	});
	// 3. shift each scan line so its centre lands on the target
	const target = TARGET[name];
	const res = Buffer.alloc(data.length);
	for (let l = 0; l < lines; l++) {
		const shift = Math.round(smooth2[l] - target); // dest p takes source p + shift
		for (let p = 0; p < span; p++) {
			const sp = p + shift;
			if (sp < 0 || sp >= span) continue;
			const s = at(l, sp), d = at(l, p);
			res[d] = data[s]; res[d + 1] = data[s + 1]; res[d + 2] = data[s + 2]; res[d + 3] = data[s + 3];
		}
	}
	return sharp(res, { raw: { width: w, height: h, channels: 4 } });
}

async function loop(name, horizontal) {
	const base = await (await straighten(name, horizontal)).png().toBuffer();
	const { width, height } = await sharp(base).metadata();
	const mirrored = await (horizontal ? sharp(base).flop() : sharp(base).flip()).toBuffer();
	const canvas = {
		width: horizontal ? width * 2 : width,
		height: horizontal ? height : height * 2,
		channels: 4,
		background: { r: 0, g: 0, b: 0, alpha: 0 },
	};
	await sharp({ create: canvas })
		.composite([
			{ input: base, left: 0, top: 0 },
			{ input: mirrored, left: horizontal ? width : 0, top: horizontal ? 0 : height },
		])
		.png({ compressionLevel: 9 })
		.toFile(path.join(out, `edge_${name}_loop.png`));
	console.log(`edge_${name}_loop.png  ${canvas.width}x${canvas.height}  line @ ${TARGET[name]} (source ${width}x${height})`);
}

await loop('bottom', true);
