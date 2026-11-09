import { test, expect } from './fixtures';

test('home page loads and card art never reaches the network', async ({ page, images }) => {
	const external: string[] = [];
	page.on('requestfinished', (req) => {
		if (req.url().startsWith('https://openrift.app/')) external.push(req.url());
	});
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1, name: 'Browse cards' })).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect(images.requested.length).toBeGreaterThan(0);
	// Fulfilled routes never hit the network; anything here would be a leak.
	for (const url of external) expect(images.requested).toContain(url);
});
