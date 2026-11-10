// openspec/specs/deck-library + deck-legality (badges)
import { test, expect } from './fixtures';
import { emptyDeck, LEGEND, LEGEND_NAME, legalDeck, seedDecks, storedDecks } from './decks';

test('an empty library invites the first deck', async ({ page }) => {
	await seedDecks(page, []);
	await page.goto('/decks');
	await expect(page.getByRole('heading', { level: 1, name: 'Your decks' })).toBeVisible();
	await expect(page.getByText('No decks yet')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Create a new deck' })).toBeVisible();
});

test('creating a deck needs a name and a Legend, then opens the deck manager', async ({ page }) => {
	await seedDecks(page, []);
	await page.goto('/decks');
	await page.getByRole('button', { name: 'Create a new deck' }).click();
	const dialog = page.getByRole('dialog', { name: 'New deck' });
	await expect(dialog).toBeVisible();
	const create = dialog.getByRole('button', { name: 'Create deck' });
	await expect(create).toBeDisabled();
	await dialog.getByRole('textbox', { name: 'Deck name' }).fill('Fox Tricks');
	await expect(create).toBeDisabled();
	await dialog.getByRole('searchbox').fill('nine-tailed');
	await dialog.getByRole('button', { name: LEGEND_NAME }).click();
	await expect(dialog.getByRole('button', { name: LEGEND_NAME })).toHaveAttribute('aria-pressed', 'true');
	await expect(create).toBeEnabled();
	await create.click();
	await expect(page).toHaveURL(/\/decks\/build#d\/.+/);
	const decks = await storedDecks(page);
	expect(decks).toHaveLength(1);
	expect(decks[0].name).toBe('Fox Tricks');
	expect(decks[0].legend[0]?.card).toBe(LEGEND);
});

test('cancel keeps everything as it was', async ({ page }) => {
	await seedDecks(page, []);
	await page.goto('/decks');
	await page.getByRole('button', { name: 'Create a new deck' }).click();
	const dialog = page.getByRole('dialog', { name: 'New deck' });
	await dialog.getByRole('textbox', { name: 'Deck name' }).fill('Throwaway');
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).toBeHidden();
	expect(await storedDecks(page)).toHaveLength(0);
	await page.getByRole('button', { name: 'Create a new deck' }).click();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
});

test('tiles show the Legend cover, the counts and a live legality badge', async ({ page }) => {
	await seedDecks(page, [legalDeck('a', 'Fox Legal'), emptyDeck('b', 'Half Built', LEGEND)]);
	await page.goto('/decks');
	const legal = page.getByRole('listitem').filter({ hasText: 'Fox Legal' });
	await expect(legal.getByText('Legal', { exact: true })).toBeVisible();
	await expect(legal.getByText('Main 40/40 · Rune 12/12')).toBeVisible();
	await expect(legal.getByRole('img', { name: `Legend art for ${LEGEND_NAME}` })).toBeAttached();
	const half = page.getByRole('listitem').filter({ hasText: 'Half Built' });
	await expect(half.getByText('Not legal', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open Fox Legal' })).toHaveAttribute('href', '/decks/build#d/a');
});

test('rename through the prompt', async ({ page }) => {
	await seedDecks(page, [emptyDeck('b', 'Half Built', LEGEND)]);
	await page.goto('/decks');
	page.once('dialog', (d) => d.accept('Renamed Deck'));
	const tile = page.getByRole('listitem').filter({ hasText: 'Half Built' });
	await tile.hover();
	await tile.getByRole('button', { name: 'Rename' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: 'Renamed Deck' })).toBeVisible();
	expect((await storedDecks(page))[0].name).toBe('Renamed Deck');
});

test('delete asks in place, Keep cancels, confirm removes', async ({ page }) => {
	await seedDecks(page, [emptyDeck('b', 'Half Built', LEGEND)]);
	await page.goto('/decks');
	const tile = page.getByRole('listitem').filter({ hasText: 'Half Built' });
	await tile.hover();
	await tile.getByRole('button', { name: 'Delete', exact: true }).click();
	await tile.getByRole('button', { name: 'Keep' }).click();
	await expect(tile).toBeVisible();
	await tile.hover();
	await tile.getByRole('button', { name: 'Delete', exact: true }).click();
	await tile.getByRole('button', { name: 'Delete — sure?' }).click();
	await expect(page.getByText('No decks yet')).toBeVisible();
	expect(await storedDecks(page)).toHaveLength(0);
});

test('unavailable storage shows the not-saved warning', async ({ page }) => {
	await page.addInitScript(() => {
		Storage.prototype.getItem = () => {
			throw new Error('blocked');
		};
	});
	await page.goto('/decks');
	await expect(page.getByText(/Decks are not being saved this visit/)).toBeVisible();
});

test('decks survive a reload', async ({ page }) => {
	await seedDecks(page, [legalDeck('a', 'Fox Legal')]);
	await page.goto('/decks');
	await page.reload();
	await expect(page.getByRole('link', { name: 'Open Fox Legal' })).toBeVisible();
});

test('a Legend in the New deck picker shows the hover card, and See more opens its full detail over the dialog', async ({ page }) => {
	await seedDecks(page, []);
	await page.goto('/decks');
	await page.getByRole('button', { name: 'Create a new deck' }).click();
	const dialog = page.getByRole('dialog', { name: 'New deck' });
	const pick = dialog.locator('[data-legend-pick]').first();
	const box = (await pick.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height * 0.3);
	await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.3, { steps: 4 });
	const peek = page.getByRole('group', { name: 'Card details' });
	await expect(peek).toBeVisible({ timeout: 3000 });
	await peek.getByRole('link', { name: 'See more' }).click();
	const modal = page.getByRole('dialog', { name: /full card details/ });
	await expect(modal).toBeVisible();
	// Escape closes only the modal: the New deck dialog stays open
	await page.keyboard.press('Escape');
	await expect(modal).toBeHidden();
	await expect(dialog).toBeVisible();
});
