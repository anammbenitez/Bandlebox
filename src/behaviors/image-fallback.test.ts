import { beforeEach, describe, expect, it } from 'vitest';
import { installImageFallback } from './image-fallback.ts';

function fail(img: HTMLImageElement): void {
	img.dispatchEvent(new Event('error')); // image errors do not bubble; capture still sees them
}

describe('installImageFallback', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		delete (window as Window & { __cardImageFallback?: boolean }).__cardImageFallback;
	});

	it('walks the chain one failure at a time, then removes the image', () => {
		installImageFallback(document);
		document.body.innerHTML = '<div><img src="https://x/a-full.webp" data-fallback="https://x/a-400w.webp https://x/a-240w.webp"></div>';
		const img = document.querySelector('img')!;
		fail(img);
		expect(img.getAttribute('src')).toBe('https://x/a-400w.webp');
		expect(img.getAttribute('data-fallback')).toBe('https://x/a-240w.webp');
		fail(img);
		expect(img.getAttribute('src')).toBe('https://x/a-240w.webp');
		expect(img.isConnected).toBe(true);
		fail(img);
		expect(img.isConnected).toBe(false);
	});

	it('removes at once when nothing smaller exists', () => {
		installImageFallback(document);
		document.body.innerHTML = '<img src="https://x/a-240w.webp" data-fallback="">';
		const img = document.querySelector('img')!;
		fail(img);
		expect(img.isConnected).toBe(false);
	});

	it('leaves images without a chain alone', () => {
		installImageFallback(document);
		document.body.innerHTML = '<img src="https://x/glyph.svg">';
		const img = document.querySelector('img')!;
		fail(img);
		expect(img.isConnected).toBe(true);
	});

	it('installs once per window', () => {
		installImageFallback(document);
		installImageFallback(document);
		document.body.innerHTML = '<img src="https://x/a-400w.webp" data-fallback="https://x/a-240w.webp">';
		const img = document.querySelector('img')!;
		fail(img);
		expect(img.getAttribute('src')).toBe('https://x/a-240w.webp'); // one step, not two
	});

	it('its source runs on its own (Base.astro inlines it)', () => {
		const run = new Function('document', `(${installImageFallback.toString()})(document)`);
		run(document);
		document.body.innerHTML = '<img src="https://x/a-400w.webp" data-fallback="https://x/a-240w.webp">';
		const img = document.querySelector('img')!;
		fail(img);
		expect(img.getAttribute('src')).toBe('https://x/a-240w.webp');
	});
});
