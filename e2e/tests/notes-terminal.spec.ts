// Round 2: notes management from the Atlas sidebar (D21-D24) and the global terminal dock (D25-D28).
// The stub Chalk (chalk-stub) keeps an in-memory library; term-test is the Linux build of atlas-terminal.
import { expect, test, type Page } from '@playwright/test';

const STUB = 'http://chalk-stub:8081';
const uid = () => `${Date.now() % 1_000_000}${Math.floor(Math.random() * 100)}`;

const frameOf = (page: Page) => page.frameLocator('[data-testid="notes-frame"]');

async function rowAction(page: Page, rowTestId: string, actionTestId: string) {
  await page.getByTestId(rowTestId).hover();
  await page.getByTestId(actionTestId).click();
}

async function renameVia(page: Page, name: string) {
  const input = page.getByTestId('rename-input');
  await expect(input).toBeVisible();
  await input.fill(name);
  await input.press('Enter');
  await expect(input).toHaveCount(0);
}

test('create notebook, section and page from the sidebar; rename; two-step delete of the open page goes Home', async ({ page, request }) => {
  const id = uid();
  const nb = `NB${id}`;
  const sec = `Sec${id}`;
  const pg = `Pg${id}`;
  const pg2 = `Renamed${id}`;

  await page.goto('/');
  // New notebook: creates notebook + first section + first page, opens the page and starts renaming the notebook.
  await page.getByTestId('sidebar-new-notebook').click();
  await expect(page).toHaveURL(/\/notes\/n\d+$/);
  await renameVia(page, nb);
  await expect(page.getByTestId(`notebook-${nb}`)).toBeVisible();
  await expect(frameOf(page).locator('#embed-flag')).toHaveText('yes');
  const firstId = new URL(page.url()).pathname.split('/').pop()!;
  await expect(frameOf(page).locator('#board-id')).toHaveText(firstId);

  // The first section is "Quick Notes".
  await expect(page.getByTestId(`section-${nb}/Quick Notes`)).toBeVisible();

  // + on the notebook: new section with a page; the section name is in rename mode.
  const reloadsBefore = Number(await frameOf(page).locator('#reload-count').textContent());
  await rowAction(page, `notebook-${nb}`, `row-add-nb:${nb}`);
  await renameVia(page, sec);
  await expect(page.getByTestId(`section-${nb}/${sec}`)).toBeVisible();
  await expect.poll(async () => Number(await frameOf(page).locator('#reload-count').textContent())).toBeGreaterThan(reloadsBefore);

  // + on the section: new page, opened in the iframe, name in rename mode.
  await rowAction(page, `section-${nb}/${sec}`, `row-add-sec:${nb}/${sec}`);
  await renameVia(page, pg);
  await expect(page).toHaveURL(/\/notes\/n\d+$/);
  const pageId = new URL(page.url()).pathname.split('/').pop()!;
  expect(pageId).not.toBe(firstId);
  await expect(page.getByTestId(`page-${pageId}`)).toContainText(pg);
  await expect(page.getByTestId('note-page').and(page.locator(`[data-id="${pageId}"]`))).toHaveAttribute('aria-current', 'page');
  await expect(frameOf(page).locator('#board-id')).toHaveText(pageId);
  await expect(page.getByTestId('notes-title')).toHaveText(`${nb} / ${sec} / ${pg}`);

  // Rename the open page from the More menu: the crumb and the stub follow.
  const before = Number(await frameOf(page).locator('#reload-count').textContent());
  await rowAction(page, `page-${pageId}`, `row-menu-page:${pageId}`);
  await page.getByTestId(`row-rename-page:${pageId}`).click();
  await renameVia(page, pg2);
  await expect(page.getByTestId('notes-title')).toHaveText(`${nb} / ${sec} / ${pg2}`);
  await expect(frameOf(page).locator('#board-name')).toHaveText(pg2);
  expect(Number(await frameOf(page).locator('#reload-count').textContent())).toBeGreaterThan(before);

  // Escape cancels a rename without changing anything.
  await rowAction(page, `page-${pageId}`, `row-menu-page:${pageId}`);
  await page.getByTestId(`row-rename-page:${pageId}`).click();
  await page.getByTestId('rename-input').fill('discard me');
  await page.getByTestId('rename-input').press('Escape');
  await expect(page.getByTestId(`page-${pageId}`)).toContainText(pg2);

  // Two-step delete of the open page: Delete -> Confirm, then Home.
  await rowAction(page, `page-${pageId}`, `row-menu-page:${pageId}`);
  const del = page.getByTestId(`row-delete-page:${pageId}`);
  await expect(del).toHaveText('Delete');
  await del.click();
  await expect(del).toHaveText('Confirm');
  await del.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId(`page-${pageId}`)).toHaveCount(0);

  // Deleting a notebook is two-step as well.
  await rowAction(page, `notebook-${nb}`, `row-menu-nb:${nb}`);
  const delNb = page.getByTestId(`row-delete-nb:${nb}`);
  await delNb.click();
  await expect(page.getByTestId(`notebook-${nb}`)).toBeVisible(); // nothing happened yet
  await delNb.click();
  await expect(page.getByTestId(`notebook-${nb}`)).toHaveCount(0);

  const lib = await (await request.get(`${STUB}/api/library`)).json();
  expect(JSON.stringify(lib)).not.toContain(nb);
});

test('deleting the notebook that holds the open page goes Home', async ({ page }) => {
  const nb = `Doomed${uid()}`;
  await page.goto('/');
  await page.getByTestId('sidebar-new-notebook').click();
  await renameVia(page, nb);
  await expect(page).toHaveURL(/\/notes\/n\d+$/);
  await rowAction(page, `notebook-${nb}`, `row-menu-nb:${nb}`);
  await page.getByTestId(`row-delete-nb:${nb}`).click();
  await page.getByTestId(`row-delete-nb:${nb}`).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId(`notebook-${nb}`)).toHaveCount(0);
});

test('a rename error from Chalk is shown as a message and the tree is unchanged', async ({ page }) => {
  await page.route('**/api/notes/boards/p2', (route) =>
    route.request().method() === 'PUT'
      ? route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ detail: [{ msg: 'name is invalid' }] }) })
      : route.continue(),
  );
  await page.goto('/');
  await rowAction(page, 'page-p2', 'row-menu-page:p2');
  await page.getByTestId('row-rename-page:p2').click();
  await renameVia(page, 'Whatever');
  await expect(page.getByTestId('toast')).toContainText('name is invalid');
  await expect(page.getByTestId('page-p2')).toContainText('Page Two');
});

test('a change made inside Chalk (library-changed from the iframe) refreshes the Atlas tree', async ({ page, request }) => {
  const nb = `Outside${uid()}`;
  await page.goto('/notes/p1');
  await expect(frameOf(page).locator('#board-id')).toHaveText('p1');
  const created = await request.post(`${STUB}/api/notebooks`, { data: { name: nb } });
  expect(created.status()).toBe(201);
  try {
    await expect(page.getByTestId(`notebook-${nb}`)).toHaveCount(0); // Atlas doesn't know yet
    await frameOf(page).locator('#send-library-changed').click();
    await expect(page.getByTestId(`notebook-${nb}`)).toBeVisible();
  } finally {
    await request.delete(`${STUB}/api/notebooks/${encodeURIComponent(nb)}`);
  }
});

test('keyboard: arrows move between rows, left/right collapse and expand, Enter opens a page', async ({ page }) => {
  await page.goto('/');
  const row = page.getByTestId('note-page').filter({ hasText: 'Page One' });
  await row.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('note-page').filter({ hasText: 'Page Two' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(row).toBeFocused();
  await page.keyboard.press('ArrowUp'); // section row
  const section = page.getByTestId('section-Stub Notebook/Stub Section').locator('[data-rowmain]');
  await expect(section).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(row).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(row).toBeVisible();
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/notes\/p1$/);
});

test('expanded state is remembered across a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('section-Stub Notebook/Stub Section').locator('[data-rowmain]').click();
  await expect(page.getByTestId('note-page').filter({ hasText: 'Page One' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('section-Stub Notebook/Stub Section')).toBeVisible();
  await expect(page.getByTestId('note-page').filter({ hasText: 'Page One' })).toHaveCount(0);
});

test('the brain tree has no add or more buttons', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'entities', exact: true }).click();
  await expect(page.getByRole('button', { name: 'personal', exact: true })).toBeVisible();
  await expect(page.locator('.sb-dir .sb-actions, .sb-file .sb-actions')).toHaveCount(0);
});

// ---------------------------------------------------------------- terminal dock

const activeRows = (page: Page) => page.locator('[data-testid="terminal-host"][data-active="true"] .xterm-rows');
const tabs = (page: Page) => page.getByTestId('terminal-tab');
const dock = (page: Page) => page.getByTestId('terminal-panel');

async function openDock(page: Page) {
  await page.getByTestId('terminal-button').click();
  await expect(dock(page)).toBeVisible();
  await expect(tabs(page)).toHaveCount(1);
  await expect(tabs(page).first()).toHaveAttribute('data-status', 'running', { timeout: 15_000 });
}

async function typeLine(page: Page, text: string) {
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

test('TRM-1: the top-bar button opens the dock, runs a command; the notes iframe shrinks; Ctrl+` toggles from anywhere', async ({ page }) => {
  await page.goto('/notes/p1');
  const frame = page.getByTestId('notes-frame');
  await expect(frameOf(page).locator('#board-id')).toHaveText('p1');
  const full = (await frame.boundingBox())!.height;
  await expect(dock(page)).toBeHidden();

  await openDock(page);
  await expect(tabs(page).first()).toContainText('sh');
  await expect(page.getByTestId('terminal-button')).toHaveAttribute('aria-pressed', 'true');
  const panel = (await dock(page).boundingBox())!;
  await expect.poll(async () => (await frame.boundingBox())!.height).toBeLessThan(full);
  expect(Math.round((await frame.boundingBox())!.height + panel.height)).toBeGreaterThanOrEqual(Math.round(full) - 2);

  await typeLine(page, 'echo hi-$((40+2))');
  await expect(activeRows(page)).toContainText('hi-42');

  // Ctrl+` from inside the terminal hides it, from the page body shows it again with the session intact
  await page.keyboard.press('Control+Backquote');
  await expect(dock(page)).toBeHidden();
  await expect.poll(async () => Math.round((await frame.boundingBox())!.height)).toBe(Math.round(full));
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+Backquote');
  await expect(dock(page)).toBeVisible();
  await expect(tabs(page)).toHaveCount(1);
  await expect(activeRows(page)).toContainText('hi-42');

  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas:terminal') ?? 'null'));
  expect(prefs.open).toBe(true);
});

test('TRM-2: sessions survive navigation Home -> brain file -> note', async ({ page }) => {
  await page.goto('/');
  await openDock(page);
  await typeLine(page, 'echo keep-$((20+22))');
  await expect(activeRows(page)).toContainText('keep-42');

  await page.getByRole('button', { name: 'entities', exact: true }).click();
  await page.getByRole('button', { name: 'personal', exact: true }).click();
  await page.locator('[data-testid="atlas-file"][data-path="entities/personal/about.md"]').click();
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Personal' })).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await expect(activeRows(page)).toContainText('keep-42');

  await page.getByTestId('note-page').filter({ hasText: 'Page One' }).click();
  await expect(page).toHaveURL(/\/notes\/p1$/);
  await expect(dock(page)).toBeVisible();
  await expect(tabs(page)).toHaveCount(1);
  await expect(activeRows(page)).toContainText('keep-42');

  await page.getByTestId('rail-home').click();
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(activeRows(page)).toContainText('keep-42');
});

test('TRM-3: + opens a second tab, x closes it, tabs keep their own screen', async ({ page }) => {
  await page.goto('/');
  await openDock(page);
  await typeLine(page, 'echo first-$((1+1))');
  await expect(activeRows(page)).toContainText('first-2');
  await page.getByTestId('terminal-new').click();
  await expect(tabs(page)).toHaveCount(2);
  await expect(tabs(page).nth(1)).toHaveAttribute('data-status', 'running', { timeout: 15_000 });
  await expect(activeRows(page)).not.toContainText('first-2');
  await tabs(page).first().click();
  await expect(activeRows(page)).toContainText('first-2');
  await tabs(page).nth(1).getByTestId('terminal-tab-close').click();
  await expect(tabs(page)).toHaveCount(1);
});

test('TRM-4: the top edge resizes within 120px and 70% of the window, and the height is remembered', async ({ page }) => {
  await page.goto('/');
  await openDock(page);
  const h0 = Math.round((await dock(page).boundingBox())!.height);
  const drag = async (dy: number) => {
    const grip = (await page.getByTestId('terminal-resize').boundingBox())!;
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + dy, { steps: 5 });
    await page.mouse.up();
  };
  const height = async () => Math.round((await dock(page).boundingBox())!.height);
  await drag(-100);
  await expect.poll(height).toBe(h0 + 100);
  await drag(-2000);
  await expect.poll(height).toBe(Math.floor(800 * 0.7));
  await drag(2000);
  await expect.poll(height).toBe(120);
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas:terminal') ?? 'null'));
  expect(prefs).toEqual({ open: true, height: 120 });
});

test('TRM-5: when the shell exits the tab says so and Restart starts a new one; Hide keeps sessions, Kill all ends them', async ({ page }) => {
  await page.goto('/');
  await openDock(page);
  await typeLine(page, 'exit 3');
  await expect(tabs(page).first()).toHaveAttribute('data-status', 'exited');
  await expect(page.getByTestId('terminal-ended')).toContainText('[process exited with code 3]');
  await page.getByTestId('terminal-restart').click();
  await expect(tabs(page).first()).toHaveAttribute('data-status', 'running', { timeout: 15_000 });
  await typeLine(page, 'echo again-$((1+1))');
  await expect(activeRows(page)).toContainText('again-2');

  await page.getByTestId('terminal-minimise').click();
  await expect(dock(page)).toBeHidden();
  await page.getByTestId('terminal-button').click();
  await expect(tabs(page)).toHaveCount(1);
  await expect(activeRows(page)).toContainText('again-2');

  await page.getByTestId('terminal-kill-all').click();
  await expect(dock(page)).toBeHidden();
  await page.getByTestId('terminal-button').click();
  await expect(tabs(page)).toHaveCount(1);
  await expect(tabs(page).first()).toHaveAttribute('data-status', 'running', { timeout: 15_000 });
});

test('TRM-6: the Claude button opens a Claude Code tab', async ({ page }) => {
  await page.goto('/');
  await openDock(page);
  const claude = page.getByTestId('terminal-claude');
  await expect(claude).toBeEnabled();
  await claude.click();
  await expect(tabs(page)).toHaveCount(2);
  await expect(tabs(page).nth(1)).toContainText('Claude');
  await expect(tabs(page).nth(1)).toHaveAttribute('data-active', 'true');
  await expect(activeRows(page)).toContainText('CLAUDE-STUB');
});

test('TRM-7: without a claude profile the Claude button is disabled and says why', async ({ page }) => {
  await page.route('**/profiles', async (route) => {
    const res = await route.fetch();
    const body = (await res.json()) as { default: string; profiles: { id: string }[] };
    await route.fulfill({ response: res, json: { ...body, profiles: body.profiles.filter((p) => p.id !== 'claude') } });
  });
  await page.goto('/');
  await openDock(page);
  await expect(page.getByTestId('terminal-claude')).toBeDisabled();
  await expect(page.locator('.terminal-claude-wrap')).toHaveAttribute('title', /Claude Code not found/);
});

test('TRM-8: with the bridge unreachable the dock explains how to start it and offers Retry; the rest of Atlas works', async ({ page }) => {
  await page.route('**/api/config', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...((await res.json()) as object), terminalUrl: 'http://127.0.0.1:1' } });
  });
  await page.goto('/');
  await page.getByTestId('terminal-button').click();
  const offline = page.getByTestId('terminal-offline');
  await expect(offline).toBeVisible();
  await expect(offline).toContainText("isn't running");
  await expect(offline).toContainText('atlas-terminal.exe');
  await expect(tabs(page)).toHaveCount(0);
  await page.getByTestId('terminal-retry').click();
  await expect(offline).toBeVisible();
  await page.getByTestId('terminal-minimise').click();
  await expect(dock(page)).toBeHidden();
  await page.getByTestId('note-page').filter({ hasText: 'Page One' }).click();
  await expect(page).toHaveURL(/\/notes\/p1$/);
});

test('the Chalk iframe can toggle the dock (chalk:toggle-terminal)', async ({ page }) => {
  await page.goto('/notes/p1');
  await expect(frameOf(page).locator('#board-id')).toHaveText('p1');
  await expect(dock(page)).toBeHidden();
  await frameOf(page).locator('#send-toggle-terminal').click();
  await expect(dock(page)).toBeVisible();
  await expect(tabs(page).first()).toHaveAttribute('data-status', 'running', { timeout: 15_000 });
  await frameOf(page).locator('#send-toggle-terminal').click();
  await expect(dock(page)).toBeHidden();
});

test('write requests from another origin are refused', async ({ request }) => {
  const evil = await request.post('/api/notes/notebooks', { data: { name: 'x' }, headers: { Origin: 'http://evil.example' } });
  expect(evil.status()).toBe(403);
  const none = await request.delete('/api/notes/boards/p1');
  expect(none.status()).toBe(403);
  const cfg = await (await request.get('/api/config')).json();
  expect(cfg.terminalUrl).toBe('http://term-test:7681');
});
