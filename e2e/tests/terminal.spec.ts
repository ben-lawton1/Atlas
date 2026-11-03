// The brain tree keyboard behaviour (D23) and the global terminal dock (D25-D28).
// term-test is the Linux build of atlas-terminal.
import { expect, test, type Page } from '@playwright/test';

const dirRow = (page: Page, path: string) => page.locator(`[data-testid="atlas-dir"][data-key="dir:${path}"]`);
const fileRow = (page: Page, path: string) => page.locator(`[data-testid="atlas-file"][data-path="${path}"]`);
const expandedOf = (row: ReturnType<typeof dirRow>) => row.locator('xpath=ancestor::li[1]');

test('keyboard: arrows move between rows, left/right collapse and expand, Home/End jump, Enter opens a file', async ({ page }) => {
  await page.goto('/');
  const entities = dirRow(page, 'entities');
  await entities.focus();
  await expect(expandedOf(entities)).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(expandedOf(entities)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  const personal = dirRow(page, 'entities/personal');
  await expect(personal).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const about = fileRow(page, 'entities/personal/about.md');
  await expect(about).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(personal).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('[data-rowmain]').last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(entities).toBeFocused();
  await page.keyboard.press('ArrowLeft'); // collapse
  await expect(personal).toHaveCount(0);
  await page.keyboard.press('ArrowRight'); // expand again; personal stays open
  await expect(about).toBeVisible();
  await about.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atlas\/entities\/personal\/about\.md$/);
});

test('expanded state is remembered across a reload', async ({ page }) => {
  await page.goto('/');
  await dirRow(page, 'entities').click();
  await expect(dirRow(page, 'entities/personal')).toBeVisible();
  await page.reload();
  await expect(dirRow(page, 'entities/personal')).toBeVisible();
  await dirRow(page, 'entities').click();
  await expect(dirRow(page, 'entities/personal')).toHaveCount(0);
  await page.reload();
  await expect(dirRow(page, 'entities')).toBeVisible();
  await expect(dirRow(page, 'entities/personal')).toHaveCount(0);
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

test('TRM-1: the top-bar button opens the dock, runs a command; the main pane shrinks; Ctrl+` toggles from anywhere', async ({ page }) => {
  await page.goto('/');
  // Home's scroll pane is a stable element in the main pane; it shrinks while the dock is open
  const pane = page.locator('.main .pane-scroll');
  await expect(page.getByTestId('home')).toBeVisible();
  const full = (await pane.boundingBox())!.height;
  await expect(dock(page)).toBeHidden();

  await openDock(page);
  await expect(tabs(page).first()).toContainText('sh');
  await expect(page.getByTestId('terminal-button')).toHaveAttribute('aria-pressed', 'true');
  const panel = (await dock(page).boundingBox())!;
  await expect.poll(async () => (await pane.boundingBox())!.height).toBeLessThan(full);
  expect(Math.round((await pane.boundingBox())!.height + panel.height)).toBeGreaterThanOrEqual(Math.round(full) - 2);

  await typeLine(page, 'echo hi-$((40+2))');
  await expect(activeRows(page)).toContainText('hi-42');

  // Ctrl+` from inside the terminal hides it, from the page body shows it again with the session intact
  await page.keyboard.press('Control+Backquote');
  await expect(dock(page)).toBeHidden();
  await expect.poll(async () => Math.round((await pane.boundingBox())!.height)).toBe(Math.round(full));
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+Backquote');
  await expect(dock(page)).toBeVisible();
  await expect(tabs(page)).toHaveCount(1);
  await expect(activeRows(page)).toContainText('hi-42');

  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas:terminal') ?? 'null'));
  expect(prefs.open).toBe(true);
});

test('TRM-2: sessions survive navigation Home -> brain file -> Calendar -> Home', async ({ page }) => {
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

  await page.getByTestId('rail-calendar').click();
  await expect(page.getByTestId('calendar-view')).toBeVisible();
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
  await page.getByTestId('rail-calendar').click();
  await expect(page.getByTestId('calendar-view')).toBeVisible();
});

test('the config points the browser at the terminal bridge', async ({ request }) => {
  const cfg = await (await request.get('/api/config')).json();
  expect(cfg.terminalUrl).toBe('http://term-test:7681');
});
