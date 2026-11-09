// Added with the React islands (design D7, risks): pages that read browser
// state after hydration must not log hydration mismatches or other errors.
import { test, expect } from './fixtures';
import { emptyDeck, LEGEND, legalDeck, seedDecks } from './decks';

const PAGES = ['/', '/?type=legend&q=ahri&r=120', '/cards/kato-the-arm', '/decks', '/decks/build#d/l'];

for (const path of PAGES) {
	test(`no console errors on ${path}`, async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(msg.text());
		});
		page.on('pageerror', (err) => errors.push(err.message));
		await seedDecks(page, [legalDeck('l'), emptyDeck('x', 'Fresh Fox', LEGEND)]);
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		expect(errors).toEqual([]);
	});
}
