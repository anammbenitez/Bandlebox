// Shared test fixture: every OpenRift card-image request is answered with one
// local placeholder, so the suite is offline, fast and pixel-stable. Tests can
// list image URLs to fail (404) to exercise the degrade-then-remove fallback.
import { test as base, expect, type Page } from '@playwright/test';

export type { Page };

// 4x4 opaque PNG in a light parchment tone, so art boxes show in screenshots; CSS scales it to every tile size.
const PLACEHOLDER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGOY1ZYFRwzEcQCDkhihc9PoyAAAAABJRU5ErkJggg==',
	'base64',
);

export interface ImageLog {
	/** Every OpenRift image URL the page asked for, in order. */
	requested: string[];
	/** URL substrings to answer with 404 instead of the placeholder. */
	failing: string[];
}

/** Waits until every Astro island on the page has hydrated (no-op without
 *  islands), so a test never types or scrolls into a page that is not live yet. */
export async function hydrated(page: Page): Promise<void> {
	await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
}

export const test = base.extend<{ images: ImageLog }>({
	page: async ({ page, javaScriptEnabled }, use) => {
		if (javaScriptEnabled === false) {
			await use(page); // nothing hydrates without JavaScript
			return;
		}
		for (const name of ['goto', 'reload', 'goBack'] as const) {
			const original = page[name].bind(page) as (...args: unknown[]) => Promise<unknown>;
			(page as unknown as Record<string, unknown>)[name] = async (...args: unknown[]) => {
				const response = await original(...args);
				if (!page.url().startsWith('about:')) await hydrated(page);
				return response;
			};
		}
		await use(page);
	},
	images: [
		async ({ page }, use) => {
			const log: ImageLog = { requested: [], failing: [] };
			await page.route(/^https:\/\/openrift\.app\//, (route) => {
				const url = route.request().url();
				log.requested.push(url);
				if (log.failing.some((part) => url.includes(part))) {
					return route.fulfill({ status: 404, body: '' });
				}
				return route.fulfill({ status: 200, contentType: 'image/png', body: PLACEHOLDER });
			});
			await use(log);
		},
		{ auto: true },
	],
});

export { expect };

/** Clears this origin's storage so each test starts with no saved decks. */
export async function freshStorage(page: Page): Promise<void> {
	await page.addInitScript(() => {
		if (!sessionStorage.getItem('__e2e_init')) {
			localStorage.clear();
			sessionStorage.setItem('__e2e_init', '1');
		}
	});
}
