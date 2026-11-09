// Visual parity baselines (design D10): each page at desktop and phone size.
// Card art is the fixture placeholder, so only the app's own pixels compare.
import { test, expect, type Page } from './fixtures';
import { emptyDeck, LEGEND, legalDeck, seedDecks } from './decks';

const VIEWPORTS = [
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'phone', width: 390, height: 844 },
];

async function settle(page: Page): Promise<void> {
	await page.mouse.move(0, 0);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(300);
}

for (const vp of VIEWPORTS) {
	test.describe(vp.name, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		test('catalog grid', async ({ page }) => {
			await page.goto('/');
			await settle(page);
			await expect(page).toHaveScreenshot(`grid-${vp.name}.png`);
		});

		test('card page', async ({ page }) => {
			await page.goto('/cards/kato-the-arm');
			await settle(page);
			await expect(page).toHaveScreenshot(`card-${vp.name}.png`);
		});

		test('library, empty', async ({ page }) => {
			await seedDecks(page, []);
			await page.goto('/decks');
			await settle(page);
			await expect(page).toHaveScreenshot(`library-empty-${vp.name}.png`);
		});

		test('library, two decks', async ({ page }) => {
			await seedDecks(page, [legalDeck('a', 'Fox Legal'), emptyDeck('b', 'Half Built', LEGEND)]);
			await page.goto('/decks');
			await settle(page);
			await expect(page).toHaveScreenshot(`library-two-${vp.name}.png`);
		});

		test('deck manager, empty deck', async ({ page }) => {
			await seedDecks(page, [emptyDeck('x', 'Fresh Fox', LEGEND)]);
			await page.goto('/decks/build#d/x');
			await settle(page);
			await expect(page).toHaveScreenshot(`build-empty-${vp.name}.png`);
		});

		test('deck manager, legal deck', async ({ page }) => {
			await seedDecks(page, [legalDeck('l')]);
			await page.goto('/decks/build#d/l');
			await settle(page);
			await expect(page).toHaveScreenshot(`build-legal-${vp.name}.png`);
		});
	});
}
