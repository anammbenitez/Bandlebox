// openspec/specs/card-catalog-browser + card-text-rendering
import { test, expect, type Page } from './fixtures';

const STEP = 60;
const tiles = (page: Page) => page.getByRole('main').getByRole('listitem').filter({ has: page.locator('a[href^="/cards/"]') });
const count = (page: Page) => page.getByText(/^Showing (all )?[\d,]+( of [\d,]+)? cards$/);
const typeSelect = (page: Page) => page.getByRole('combobox').filter({ hasText: 'All types' });
/** A tile inside the viewport now (Playwright's `visible` only means rendered,
 *  so clicking an off-screen tile would scroll the page there first). */
async function onScreenTile(page: Page) {
	const slug = await page.evaluate(() => {
		const li = [...document.querySelectorAll('#grid-list > li[data-slug]')].find((el) => {
			const r = el.getBoundingClientRect();
			return r.top >= 0 && r.bottom <= window.innerHeight;
		});
		return li?.getAttribute('data-slug') ?? '';
	});
	return page.locator(`#grid-list > li[data-slug="${slug}"]`);
}

test.describe('grid', () => {
	test('serves a static first window and the catalog lede', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Catalog of all the cards in the game.')).toBeVisible();
		await expect(tiles(page)).toHaveCount(STEP);
		await expect(count(page)).toHaveText(/^Showing all 1,\d{3} cards$/);
		await expect(tiles(page).first().getByRole('link')).toHaveAttribute('href', /^\/cards\/[a-z0-9-]+$/);
	});

	test('reveals more cards in fixed steps on scroll', async ({ page }) => {
		await page.goto('/');
		await expect(tiles(page)).toHaveCount(STEP);
		await tiles(page).last().scrollIntoViewIfNeeded();
		await expect.poll(async () => tiles(page).count()).toBeGreaterThanOrEqual(STEP * 2);
		expect((await tiles(page).count()) % STEP).toBe(0);
	});

	test('filters and search update immediately and live in the URL', async ({ page }) => {
		await page.goto('/');
		await typeSelect(page).selectOption('legend');
		await expect(page).toHaveURL(/[?&]type=legend/);
		await expect(count(page)).toHaveText(/^Showing \d+ of 1,\d{3} cards$/);
		await page.getByRole('searchbox').fill('ahri');
		await expect(page).toHaveURL(/q=ahri/);
		await typeSelect(page).selectOption('');
		await expect(page).not.toHaveURL(/type=/);
		await expect(count(page)).toHaveText(/^Showing \d+ of 1,\d{3} cards$/);
		const names = await tiles(page).getByRole('link').evaluateAll((els: Element[]) => els.map((e) => e.getAttribute('title') ?? ''));
		expect(names.length).toBeGreaterThan(0);
		for (const n of names) expect(n.toLowerCase()).toContain('ahri');
	});

	test('a filtered URL restores the same state on reload', async ({ page }) => {
		await page.goto('/?type=legend&q=ahri');
		await expect(page.getByRole('searchbox')).toHaveValue('ahri');
		await expect(typeSelect(page)).toHaveValue('legend');
		const before = await count(page).textContent();
		await page.reload();
		await expect(count(page)).toHaveText(before ?? '');
		await expect(page.getByRole('searchbox')).toHaveValue('ahri');
	});

	test('no matches shows the empty state, and clearing restores all', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('searchbox').fill('zzzz-no-such-card');
		await expect(page.getByText('No cards match the current filters.')).toBeVisible();
		await page.getByRole('button', { name: 'Clear filters' }).click();
		await expect(count(page)).toHaveText(/^Showing all/);
		await expect(page).toHaveURL(/\/$/);
	});

	test('back-to-top appears after one screenful and returns to the top', async ({ page }) => {
		await page.goto('/');
		const top = page.getByRole('button', { name: 'Back to top' });
		await expect(top).toBeHidden();
		await page.mouse.wheel(0, 2400);
		await expect(top).toBeVisible();
		await top.click();
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	});

	test('returning from a card restores filters and reveal depth', async ({ page }) => {
		await page.goto('/?type=unit');
		await tiles(page).last().scrollIntoViewIfNeeded();
		await expect.poll(async () => tiles(page).count()).toBeGreaterThan(STEP);
		await page.waitForTimeout(300);
		const depth = await tiles(page).count();
		await (await onScreenTile(page)).getByRole('link').click();
		await expect(page).toHaveURL(/\/cards\//);
		await page.goBack();
		await expect(typeSelect(page)).toHaveValue('unit');
		await expect.poll(async () => tiles(page).count()).toBeGreaterThanOrEqual(depth);
	});

	// The pre-React grid script saved the place (y=0) on load before restoring
	// it; the React grid saves only after restoring (task 6.2). An earlier
	// version of this test also clicked an off-screen tile, which scrolled.
	test('returning from a card restores the scroll position', async ({ page }) => {
		await page.goto('/?type=unit');
		await tiles(page).last().scrollIntoViewIfNeeded();
		await expect.poll(async () => tiles(page).count()).toBeGreaterThan(STEP);
		for (let i = 0; i < 6; i++) {
			await page.mouse.wheel(0, 500);
			await page.waitForTimeout(200);
		}
		const y = await page.evaluate(() => window.scrollY);
		const depth = await tiles(page).count();
		await (await onScreenTile(page)).getByRole('link').click();
		await expect(page).toHaveURL(/\/cards\//);
		await page.goBack();
		await expect(typeSelect(page)).toHaveValue('unit');
		await expect.poll(async () => tiles(page).count()).toBeGreaterThanOrEqual(depth);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 50);
	});

	test('tile art degrades from 400w to 240w when the larger file is missing', async ({ page, images }) => {
		images.failing.push('-400w.webp');
		await page.goto('/');
		await expect(tiles(page).first().getByRole('img')).toHaveAttribute('src', /-240w\.webp$/);
	});

	test('tile art is removed when no variant exists', async ({ page, images }) => {
		images.failing.push('-400w.webp', '-240w.webp');
		await page.goto('/');
		await expect(tiles(page).first().getByRole('img')).toHaveCount(0);
		await expect(tiles(page).first().getByText('no art')).toBeVisible();
	});
});

test.describe('card detail', () => {
	test('lists every printing with its attributes', async ({ page }) => {
		await page.goto('/cards/agony-s-embrace');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Agony.s Embrace$/);
		await expect(page.getByRole('heading', { level: 2, name: 'Printings' })).toBeVisible();
		await expect(page.getByText('4 printings in the snapshot')).toBeVisible();
		await expect(page.locator('section').getByRole('listitem')).toHaveCount(4);
	});

	test('the card name links to OpenRift', async ({ page }) => {
		await page.goto('/cards/ahri-alluring');
		await expect(page.getByRole('heading', { level: 1 }).getByRole('link')).toHaveAttribute('href', 'https://openrift.app/cards/ahri-alluring');
	});

	test('the Back button goes to the card grid by default', async ({ page }) => {
		await page.goto('/cards/ahri-alluring');
		await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
	});

	test('opened with a return address, Back leads to that page', async ({ page }) => {
		await page.goto('/cards/ahri-alluring?from=' + encodeURIComponent('/decks'));
		await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/decks');
	});

	test('Back is the previous page: after a click-through it restores that page through history', async ({ page }) => {
		await page.goto('/decks');
		await page.goto('/');
		const grid = page.url();
		await page.locator('a[href^="/cards/"]').first().click();
		await expect(page).toHaveURL(/\/cards\//);
		const before = await page.evaluate(() => history.length);
		await page.getByRole('link', { name: 'Back' }).click();
		await expect(page).toHaveURL(grid);
		expect(await page.evaluate(() => history.length)).toBe(before); // went back, pushed nothing
	});

	test('the card page has its wide side gutter and no page scroll on a desktop window', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/cards/ahri-alluring');
		expect(await page.locator('main#main').evaluate((el) => getComputedStyle(el).paddingLeft)).toBe('32px');
		expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBe(0);
	});

	test('an outside from= address is ignored', async ({ page }) => {
		await page.goto('/cards/ahri-alluring?from=' + encodeURIComponent('https://example.com/'));
		await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
	});

	test('shows errata as formatted content', async ({ page }) => {
		await page.goto('/cards/arise');
		await expect(page.getByText('Errata', { exact: true })).toBeVisible();
	});

	test('shows a ban notice for a banned card', async ({ page }) => {
		await page.goto('/cards/called-shot');
		await expect(page.getByText('Banned', { exact: true })).toBeVisible();
	});

	test('hero art degrades through its variants', async ({ page, images }) => {
		images.failing.push('-full.webp');
		await page.goto('/cards/ahri-alluring');
		await expect(page.getByRole('img', { name: /^Ahri, Alluring card art( \(|$)/ })).toHaveAttribute('src', /-400w\.webp$/);
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a card page and its card text are fully readable', async ({ page }) => {
		await page.goto('/cards/kato-the-arm');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kato the Arm');
		await expect(page.getByRole('main').getByText('Deflect', { exact: true }).first()).toBeVisible();
		await expect(page.getByRole('img', { name: 'might' }).first()).toBeAttached();
		await expect(page.getByRole('heading', { level: 2, name: 'Printings' })).toBeVisible();
	});

	test('the grid shows its static first window', async ({ page }) => {
		await page.goto('/');
		await expect(tiles(page)).toHaveCount(STEP);
	});
});
