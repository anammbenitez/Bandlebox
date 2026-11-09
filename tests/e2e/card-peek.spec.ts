// openspec/specs/card-peek
import { test, expect, type Page } from './fixtures';
import { CHAMPION, CHAMPION_NAME, emptyDeck, LEGEND, seedDecks } from './decks';

const DWELL = 500;
const browser = (page: Page) => page.getByRole('region', { name: 'Card browser' });
const peek = (page: Page) => page.getByRole('group', { name: 'Card details' });
const face = (page: Page, slug: string) => browser(page).locator(`li[data-slug="${slug}"]`);

/** Rests the pointer on the upper part of a face (clear of its copy controls). */
async function restOn(page: Page, slug: string): Promise<{ x: number; y: number }> {
	const box = (await face(page, slug).boundingBox())!;
	const point = { x: box.x + box.width / 2, y: box.y + box.height * 0.3 };
	await page.mouse.move(point.x - 30, point.y);
	await page.mouse.move(point.x, point.y, { steps: 4 });
	return point;
}

test.beforeEach(async ({ page }) => {
	await seedDecks(page, [emptyDeck('x', 'Fresh Fox', LEGEND)]);
	await page.goto('/decks/build#d/x');
	await browser(page).getByRole('searchbox').fill(CHAMPION_NAME);
	await expect(face(page, CHAMPION)).toBeVisible();
});

test('opens only after the pointer rests, with the card facts in fixed order', async ({ page }) => {
	await restOn(page, CHAMPION);
	await page.waitForTimeout(DWELL / 3);
	await expect(peek(page)).toBeHidden();
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await expect(peek(page).getByRole('heading', { name: CHAMPION_NAME })).toBeVisible();
	await expect(peek(page).getByRole('list', { name: 'Domains' })).toBeVisible();
	const terms = await peek(page).getByRole('term').allTextContents();
	expect(terms.map((t: string) => t.trim())).toEqual(['Energy', 'Power', 'Might']);
	const more = peek(page).getByRole('link', { name: 'See more' });
	await expect(more).toHaveAttribute('href', new RegExp(`^/cards/${CHAMPION}\\?from=`));
});

test('a pointer that keeps moving gets no peek', async ({ page }) => {
	const p = await restOn(page, CHAMPION);
	for (let i = 0; i < 8; i++) {
		await page.mouse.move(p.x + (i % 2 ? 12 : -12), p.y + 3);
		await page.waitForTimeout(150);
	}
	await expect(peek(page)).toBeHidden();
});

test('pressing on the face closes the peek', async ({ page }) => {
	await restOn(page, CHAMPION);
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await page.mouse.down();
	await expect(peek(page)).toBeHidden();
	await page.mouse.up();
});

test('a key press closes it, and Escape too', async ({ page }) => {
	await restOn(page, CHAMPION);
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await page.keyboard.press('Shift');
	await expect(peek(page)).toBeHidden();
	await page.mouse.move(1, 1);
	await restOn(page, CHAMPION);
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await page.keyboard.press('Escape');
	await expect(peek(page)).toBeHidden();
});

test('scrolling closes it', async ({ page }) => {
	await browser(page).getByRole('searchbox').fill('');
	const first = browser(page).locator('li[data-slug]').first();
	const slug = (await first.getAttribute('data-slug'))!;
	await restOn(page, slug);
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await page.mouse.wheel(0, 200);
	await expect(peek(page)).toBeHidden();
});

test('no peek while resting on the copy controls', async ({ page }) => {
	const add = face(page, CHAMPION).getByRole('button', { name: /^Add copy to/ });
	await add.hover();
	await page.waitForTimeout(DWELL * 2.5);
	await expect(peek(page)).toBeHidden();
});

test('keyboard focus on a face opens its peek after the dwell', async ({ page }) => {
	await page.mouse.move(1, 1);
	await browser(page).getByRole('searchbox').focus();
	let tries = 0;
	while (tries++ < 6) {
		await page.keyboard.press('Tab');
		const focused = await page.evaluate(() => document.activeElement?.closest('li[data-slug]')?.getAttribute('data-slug') ?? '');
		if (focused === CHAMPION) break;
	}
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await expect(peek(page).getByRole('heading', { name: CHAMPION_NAME })).toBeVisible();
});

test('a banned card shows the Banned marker', async ({ page }) => {
	await browser(page).getByRole('button', { name: /Filters/ }).click();
	await page.getByRole('group', { name: 'Card filters' }).getByRole('button', { name: 'Reset' }).click();
	await page.keyboard.press('Escape');
	await browser(page).getByRole('searchbox').fill('Called Shot');
	const slug = 'called-shot';
	await expect(face(page, slug)).toBeVisible();
	await restOn(page, slug);
	await expect(peek(page)).toBeVisible({ timeout: 3000 });
	await expect(peek(page).getByText(/^Banned/)).toBeVisible();
});

test('card faces carry no native tooltip over the art', async ({ page }) => {
	const art = face(page, CHAMPION).getByRole('link');
	await expect(art).not.toHaveAttribute('title', /.+/);
	await expect(face(page, CHAMPION)).not.toHaveAttribute('title', /.+/);
});
