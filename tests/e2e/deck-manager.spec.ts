// openspec/specs/deck-manager + deck-legality (checklist)
import { test, expect, type Page } from './fixtures';
import { CHAMPION, CHAMPION_NAME, emptyDeck, LEGEND, LEGEND_NAME, legalDeck, seedDecks, slugOf, storedDecks } from './decks';

const browser = (page: Page) => page.getByRole('region', { name: 'Card browser' });
const deckPane = (page: Page) => page.getByRole('complementary', { name: 'Deck' });
const ledger = (page: Page, name: string) => page.getByRole('group', { name: 'Deck sections' }).getByRole('button', { name: new RegExp(`^${name}`) });
const browserTile = (page: Page, name: string) => browser(page).getByRole('listitem').filter({ has: page.getByRole('link', { name, exact: true }) });
const verdict = (page: Page) => page.locator('#deck-verdict');
const live = (page: Page) => page.getByRole('status');

async function search(page: Page, text: string): Promise<void> {
	await browser(page).getByRole('searchbox').fill(text);
}

async function openDeck(page: Page, id: string): Promise<void> {
	await page.goto(`/decks/build#d/${id}`);
	await expect(deckPane(page)).toBeVisible();
}

test.describe('opening', () => {
	test('without a deck in the address it points back to the library', async ({ page }) => {
		await seedDecks(page, []);
		await page.goto('/decks/build');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deck manager');
		await expect(page.getByRole('link', { name: 'Go to your decks' })).toBeVisible();
	});

	test('a missing deck says so', async ({ page }) => {
		await seedDecks(page, []);
		await page.goto('/decks/build#d/nope');
		await expect(page.getByText('This deck could not be loaded')).toBeVisible();
	});

	test('an owned deck shows its editable name, legend and seeded runes', async ({ page }) => {
		await seedDecks(page, [emptyDeck('x', 'Fresh Fox', LEGEND)]);
		await openDeck(page, 'x');
		await expect(page.getByRole('textbox', { name: 'Deck name' })).toHaveValue('Fresh Fox');
		await expect(deckPane(page).getByRole('link', { name: LEGEND_NAME })).toBeVisible();
		await expect(ledger(page, 'Runes')).toContainText('12');
		await expect(page.getByRole('spinbutton', { name: /Calm rune count/i })).toHaveValue('6');
		await expect(page.getByRole('spinbutton', { name: /Mind rune count/i })).toHaveValue('6');
	});
});

test.describe('editing', () => {
	test.beforeEach(async ({ page }) => {
		await seedDecks(page, [emptyDeck('x', 'Fresh Fox', LEGEND)]);
		await openDeck(page, 'x');
	});

	test('clicking a card adds one copy to its natural section', async ({ page }) => {
		await search(page, CHAMPION_NAME);
		await browserTile(page, CHAMPION_NAME).getByRole('link').click();
		await expect(ledger(page, 'Main')).toContainText('1');
		expect((await storedDecks(page))[0].main).toEqual([{ card: CHAMPION, qty: 1 }]);
	});

	test('the copy limit refuses the fourth copy with a visible reason', async ({ page }) => {
		await search(page, CHAMPION_NAME);
		const add = browserTile(page, CHAMPION_NAME).getByRole('button', { name: 'Add copy to Main Deck' });
		for (let i = 0; i < 4; i++) await add.click();
		await expect(live(page)).toContainText('copy limit 3');
		expect((await storedDecks(page))[0].main).toEqual([{ card: CHAMPION, qty: 3 }]);
		await expect(deckPane(page).getByText('copy limit 3')).toBeVisible();
	});

	test('the deck-side steppers remove copies', async ({ page }) => {
		await search(page, CHAMPION_NAME);
		await browserTile(page, CHAMPION_NAME).getByRole('button', { name: 'Add copy to Main Deck' }).click();
		await deckPane(page).getByRole('button', { name: `Remove copy of ${CHAMPION_NAME}` }).click();
		expect((await storedDecks(page))[0].main).toEqual([]);
	});

	test('dragging a card onto the side deck adds it there', async ({ page }) => {
		await search(page, CHAMPION_NAME);
		await browserTile(page, CHAMPION_NAME).dragTo(page.locator('[data-section="side"]'));
		await expect.poll(async () => (await storedDecks(page))[0].side).toEqual([{ card: CHAMPION, qty: 1 }]);
	});

	test('clicking another legend replaces the placed one', async ({ page }) => {
		await ledger(page, 'Legend').click();
		const other = slugOf('Blind Monk');
		await search(page, 'Blind Monk');
		await browser(page).locator(`li[data-slug="${other}"] a`).click();
		await expect.poll(async () => (await storedDecks(page))[0].legend).toEqual([{ card: other, qty: 1 }]);
	});

	test('the domain filter comes preset to the Legend colors', async ({ page }) => {
		await browser(page).getByRole('button', { name: /Filters/ }).click();
		const filters = page.getByRole('group', { name: 'Card filters' });
		await expect(filters).toBeVisible();
		await expect(filters.getByRole('button', { name: 'Calm', exact: true })).toHaveAttribute('aria-pressed', 'true');
		await expect(filters.getByRole('button', { name: 'Mind', exact: true })).toHaveAttribute('aria-pressed', 'true');
		await expect(filters.getByRole('button', { name: 'Fury', exact: true })).toHaveAttribute('aria-pressed', 'false');
	});

	test('the written rune ratio rebalances the rune deck', async ({ page }) => {
		const calm = page.getByRole('spinbutton', { name: /Calm rune count/i });
		await calm.fill('8');
		await expect.poll(async () => (await storedDecks(page))[0].rune.find((s) => s.card === slugOf('Calm Rune'))?.qty).toBe(8);
	});

	test('the table starts open, collapses to a summary with a rune slider, and a ledger tab reopens it', async ({ page }) => {
		const toggle = deckPane(page).getByRole('button', { name: /^The table/ });
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('spinbutton', { name: /Calm rune count/i })).toBeVisible();
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		const legend = page.locator('[data-summary-card="legend"]');
		const champion = page.locator('[data-summary-card="champion"]');
		const [l, c] = [await legend.boundingBox(), await champion.boundingBox()];
		expect(l && c && Math.abs(l.width - c.width) < 1 && Math.abs(l.height - c.height) < 1).toBe(true);
		const slider = page.getByRole('slider', { name: /Rune split/ });
		await slider.focus();
		await page.keyboard.press('ArrowRight');
		await expect.poll(async () => (await storedDecks(page))[0].rune.find((s) => s.card === slugOf('Calm Rune'))?.qty).toBe(7);
		expect((await storedDecks(page))[0].rune.find((s) => s.card === slugOf('Mind Rune'))?.qty).toBe(5);
		await ledger(page, 'Runes').click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('spinbutton', { name: /Calm rune count/i })).toHaveValue('7');
	});

	test('the champion zone places a tag-matching champion', async ({ page }) => {
		await page.getByRole('button', { name: 'Select champion' }).click();
		await expect(page.getByRole('button', { name: 'Picking — click a champion' })).toBeVisible();
		await search(page, CHAMPION_NAME);
		await browserTile(page, CHAMPION_NAME).getByRole('link').click();
		await expect(page.locator(`[data-champion-face] > [data-slug="${CHAMPION}"]`)).toBeVisible();
		const stored = (await storedDecks(page))[0];
		expect(stored.champion).toBe(CHAMPION);
		expect(stored.main).toEqual([{ card: CHAMPION, qty: 1 }]);
	});

	test('the title is edited in place and saved', async ({ page }) => {
		const name = page.getByRole('textbox', { name: 'Deck name' });
		await name.fill('Renamed Fox');
		await name.press('Enter');
		await expect(page.getByText('Saved ✓')).toBeVisible();
		await page.reload();
		await expect(page.getByRole('textbox', { name: 'Deck name' })).toHaveValue('Renamed Fox');
	});

	test('Escape cancels a title edit', async ({ page }) => {
		const name = page.getByRole('textbox', { name: 'Deck name' });
		await name.fill('Never Saved');
		await name.press('Escape');
		await expect(name).toHaveValue('Fresh Fox');
	});
});

test.describe('legality checklist', () => {
	test('a complete legal deck reads Legal with every rule passing', async ({ page }) => {
		await seedDecks(page, [legalDeck('l')]);
		await openDeck(page, 'l');
		await expect(verdict(page)).toHaveText('Legal');
		const items = page.locator('#deck-checklist > li');
		await expect(items).toHaveCount(11);
		await expect(page.locator('#deck-checklist > li[data-status="pass"]')).toHaveCount(11);
	});

	test('a deck with only a Legend reads Not legal and names the failing rules', async ({ page }) => {
		await seedDecks(page, [emptyDeck('x', 'Fresh Fox', LEGEND)]);
		await openDeck(page, 'x');
		await expect(verdict(page)).toHaveText('Not legal');
		const checklist = page.getByRole('region', { name: 'Deck legality' });
		await expect(checklist.getByText('Main deck: exactly 40')).toBeVisible();
		await expect(page.locator('#deck-checklist > li[data-status="fail"]').filter({ hasText: 'Main deck: exactly 40' })).toHaveCount(1);
		await expect(page.locator('#deck-checklist > li[data-status="fail"]').filter({ hasText: 'Battlefields' })).toHaveCount(1);
	});

	test('without a Legend, color and champion checks are pending', async ({ page }) => {
		await seedDecks(page, [emptyDeck('n', 'No Legend')]);
		await openDeck(page, 'n');
		await expect(page.locator('#deck-checklist > li[data-status="pending"]').filter({ hasText: 'Domain identity' })).toHaveCount(1);
		await expect(page.locator('#deck-checklist > li[data-status="pending"]').filter({ hasText: 'Champion unit' })).toHaveCount(1);
	});

	test('a banned card fails the bans rule', async ({ page }) => {
		const deck = legalDeck('b');
		deck.side = [{ card: slugOf('Called Shot'), qty: 1 }];
		await seedDecks(page, [deck]);
		await openDeck(page, 'b');
		await expect(page.locator('#deck-checklist > li[data-status="fail"]').filter({ hasText: 'Constructed bans' })).toHaveCount(1);
	});
});

test.describe('sharing', () => {
	test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

	test('a copied link opens the same deck read-only, and can be saved', async ({ page }) => {
		await seedDecks(page, [legalDeck('l', 'Shared Fox')]);
		await openDeck(page, 'l');
		await page.getByRole('button', { name: 'Copy deck link' }).click();
		await expect(page.getByRole('button', { name: 'Link copied ✓' })).toBeVisible();
		const url = await page.evaluate(() => navigator.clipboard.readText());
		expect(url).toMatch(/\/decks\/build#s\/.+/);

		await page.goto('about:blank');
		await page.goto(url);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shared Fox');
		await expect(page.getByRole('textbox', { name: 'Deck name' })).toBeHidden();
		await expect(page.getByRole('button', { name: 'Copy deck link' })).toBeHidden();
		await expect(verdict(page)).toHaveText('Legal');
		await page.getByRole('button', { name: 'Save as my deck' }).click();
		await expect(page).toHaveURL(/#d\//);
		await expect(page.getByRole('textbox', { name: 'Deck name' })).toHaveValue('Shared Fox');
		expect(await storedDecks(page)).toHaveLength(2);
	});

	test('a broken share link explains itself', async ({ page }) => {
		await page.goto('/decks/build#s/!!!garbage');
		await expect(page.getByText('This deck link is not a valid deck payload.')).toBeVisible();
	});
});

test('the page never scrolls; only its panes do', async ({ page }) => {
	await seedDecks(page, [emptyDeck('x', 'Fresh Fox', LEGEND)]);
	await openDeck(page, 'x');
	await page.mouse.move(300, 600);
	await page.mouse.wheel(0, 3000);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
	expect(await browser(page).evaluate((el: Element) => el.scrollTop)).toBeGreaterThan(0);
	const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
	expect(overflow).toBeLessThanOrEqual(0);
});
