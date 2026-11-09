// openspec/specs/site-navigation
import { test, expect } from './fixtures';

const PAGES = [
	{ path: '/', title: 'Browse cards — BandleBox', current: 'Browse cards' },
	{ path: '/decks', title: /BandleBox/, current: 'Decks' },
	{ path: '/decks/build', title: /BandleBox/, current: 'Decks' },
	{ path: '/cards/ahri-alluring', title: 'Ahri, Alluring — BandleBox', current: null },
];

for (const p of PAGES) {
	test(`header on ${p.path}: brand, links in order, current marker, title`, async ({ page }) => {
		await page.goto(p.path);
		await expect(page).toHaveTitle(p.title);
		const nav = page.getByRole('navigation').first();
		const brand = nav.getByRole('link', { name: 'BandleBox — home' });
		await expect(brand).toBeVisible();
		await expect(brand).toHaveAttribute('href', '/');
		await expect(brand).toContainText('BandleBox');
		await expect(nav.getByRole('link')).toHaveText(['BandleBox', 'Decks', 'Browse cards']);
		const current = nav.locator('[aria-current="page"]');
		if (p.current) {
			await expect(current).toHaveCount(1);
			await expect(current).toHaveText(p.current);
		} else {
			await expect(current).toHaveCount(0);
		}
	});
}

test('header stays fixed while the page scrolls', async ({ page }) => {
	await page.goto('/');
	const decks = page.getByRole('navigation').first().getByRole('link', { name: 'Decks' });
	const before = await decks.boundingBox();
	await page.mouse.wheel(0, 2500);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
	const after = await decks.boundingBox();
	expect(after?.y).toBe(before?.y);
	await expect(decks).toBeInViewport();
});

test('on a phone the nav stays usable without horizontal scroll', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const nav = page.getByRole('navigation').first();
	for (const name of ['BandleBox — home', 'Decks', 'Browse cards']) {
		await expect(nav.getByRole('link', { name, exact: true })).toBeInViewport();
	}
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(0);
});

test('footer credits OpenRift and Riot Games', async ({ page }) => {
	await page.goto('/');
	const footer = page.getByRole('contentinfo');
	await expect(footer).toContainText('Riot Games');
	await expect(footer.getByRole('link', { name: 'OpenRift' })).toHaveAttribute('href', 'https://openrift.app');
});

test('the header persists across navigation and only moves its current marker', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => {
		(document.querySelector('.site-header') as HTMLElement & { stamp?: number }).stamp = 42;
	});
	const nav = page.getByRole('navigation').first();
	await nav.getByRole('link', { name: 'Decks' }).click();
	await expect(page).toHaveURL(/\/decks$/);
	await expect(nav.locator('[aria-current="page"]')).toHaveText('Decks');
	await page.goBack();
	await nav.getByRole('link', { name: 'Decks' }).click();
	await nav.getByRole('link', { name: 'Browse cards' }).click();
	await expect(nav.locator('[aria-current="page"]')).toHaveText('Browse cards');
	const stamp = await page.evaluate(() => (document.querySelector('.site-header') as HTMLElement & { stamp?: number }).stamp);
	expect(stamp).toBe(42);
});
