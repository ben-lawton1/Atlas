import { expect, test, type Page } from '@playwright/test';

async function openAbout(page: Page) {
  await page.getByRole('button', { name: 'entities', exact: true }).click();
  await page.getByRole('button', { name: 'personal', exact: true }).click();
  await page.locator('[data-testid="atlas-file"][data-path="entities/personal/about.md"]').click();
}

test('home shows the dashboard panels and the recent-files card (no notes card)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('home-date')).not.toBeEmpty();
  await expect(page.getByTestId('card-dashboards')).toHaveCount(0);
  // dashboards with their not-connected notices (D37)
  await expect(page.getByTestId('week-calendar')).toBeVisible();
  await expect(page.getByTestId('calendar-status')).toContainText('No calendar connected yet');
  await expect(page.getByTestId('portfolio-panel')).toBeVisible();
  await expect(page.getByTestId('portfolio-status')).toContainText('Not connected');
  await expect(page.getByTestId('briefing-panel')).toBeVisible();
  await expect(page.getByTestId('briefing-panel')).toContainText('No briefing yet');
  const atlasCard = page.getByTestId('card-recent-atlas');
  await expect(atlasCard.getByRole('heading', { name: 'Recently changed in Atlas' })).toBeVisible();
  await expect(atlasCard.locator('a').first()).toBeVisible();
  // Chalk notes were removed (D41)
  await expect(page.getByTestId('card-recent-notes')).toHaveCount(0);
  // forbidden files never show up as recent
  await expect(atlasCard).not.toContainText('.env');
  await expect(atlasCard).not.toContainText('sqlite');
  await expect(atlasCard).not.toContainText('raw/');
});

test('rail navigates to calendar and portfolio; deep links survive a refresh', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('rail-home')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('rail-calendar').click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByTestId('calendar-view')).toBeVisible();
  await expect(page.getByTestId('rail-calendar')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('rail-home')).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('view-title')).toHaveText('Calendar');
  await page.reload();
  await expect(page.getByTestId('calendar-view')).toBeVisible();
  await expect(page.getByTestId('rail-calendar')).toHaveAttribute('aria-current', 'page');

  await page.getByTestId('rail-portfolio').click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByTestId('portfolio-view')).toBeVisible();
  await expect(page.getByTestId('rail-portfolio')).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByTestId('portfolio-view')).toBeVisible();

  await page.getByTestId('rail-brain').click();
  await expect(page).toHaveURL(/\/atlas$/);
  await expect(page.getByTestId('rail-brain')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('rail-notes')).toHaveCount(0);
  await page.getByTestId('rail-home').click();
  await expect(page.getByTestId('home')).toBeVisible();
});

test('calendar week navigation: previous, next and today', async ({ page }) => {
  await page.goto('/calendar');
  const days = page.getByTestId('calendar-day');
  await expect(days).toHaveCount(7);
  const dates = async () => days.evaluateAll((els) => els.map((e) => e.getAttribute('data-date')));
  const thisWeek = await dates();
  const view = page.getByTestId('calendar-view');
  await expect(view.getByRole('heading', { name: 'This week' })).toBeVisible();
  await expect(view.getByRole('button', { name: 'Today' })).toBeDisabled();

  await view.getByRole('button', { name: 'Next week' }).click();
  await expect(view.getByRole('heading', { name: 'Next week' })).toBeVisible();
  await expect.poll(dates).not.toEqual(thisWeek);
  const next = await dates();
  expect(new Date(`${next[0]}T00:00:00Z`).getTime() - new Date(`${thisWeek[0]}T00:00:00Z`).getTime()).toBe(7 * 86_400_000);

  await view.getByRole('button', { name: 'Previous week' }).click();
  await view.getByRole('button', { name: 'Previous week' }).click();
  await expect(view.getByRole('heading', { name: 'Last week' })).toBeVisible();
  await expect.poll(dates).not.toEqual(thisWeek);

  await view.getByRole('button', { name: 'Today' }).click();
  await expect(view.getByRole('heading', { name: 'This week' })).toBeVisible();
  await expect.poll(dates).toEqual(thisWeek);
});

test('invalid calendar parameters are rejected', async ({ request }) => {
  expect((await request.get('/api/calendar?start=bad')).status()).toBe(422);
  expect((await request.get('/api/calendar?start=2026-11-02&days=0')).status()).toBe(422);
  expect((await request.get('/api/calendar?start=2026-11-02')).status()).toBe(200);
});

test('Ctrl+Backslash toggles the sidebar and the choice survives a reload', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.getByTestId('sidebar');
  await expect(sidebar).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Control+Backslash');
  await expect(sidebar).toHaveAttribute('data-open', 'false');
  await expect(page.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(sidebar).toHaveAttribute('data-open', 'false');
  await page.getByTestId('nav-toggle').click();
  await expect(sidebar).toHaveAttribute('data-open', 'true');
  await page.reload();
  await expect(sidebar).toHaveAttribute('data-open', 'true');
  // Brain in the rail reveals a hidden sidebar
  await page.keyboard.press('Control+Backslash');
  await expect(sidebar).toHaveAttribute('data-open', 'false');
  await page.getByTestId('rail-brain').click();
  await expect(sidebar).toHaveAttribute('data-open', 'true');
});

test('command box: Ctrl+K focuses, jumps to a brain file', async ({ page }) => {
  await page.goto('/');
  const box = page.getByTestId('command-box');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+k');
  await expect(box).toBeFocused();
  // an empty query lists the views
  await expect(page.getByTestId('command-result')).toHaveCount(4);
  await box.fill('about.md');
  await expect(page.getByTestId('command-result').first()).toContainText('entities/personal/about.md');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atlas\/entities\/personal\/about\.md$/);

  // arrow keys, Escape and click
  await page.keyboard.press('Control+k');
  await box.fill('o');
  await page.keyboard.press('ArrowDown');
  await expect(box).toHaveAttribute('aria-activedescendant', 'cmd-opt-1');
  await page.keyboard.press('Escape');
  await expect(box).toHaveValue('');
  await expect(box).not.toBeFocused();
  await page.keyboard.press('Control+k');
  await box.fill('calendar');
  await page.getByTestId('command-result').first().click();
  await expect(page).toHaveURL(/\/calendar$/);
});

test('open a brain markdown file from the tree, follow relative links, refresh and go back', async ({ page }) => {
  await page.goto('/');
  await openAbout(page);
  await expect(page).toHaveURL(/\/atlas\/entities\/personal\/about\.md$/);
  const preview = page.getByTestId('preview');
  await expect(preview.getByRole('heading', { name: 'Personal' })).toBeVisible();
  await expect(page.getByTestId('preview-path')).toContainText('about.md');
  await expect(page.getByTestId('preview-modified')).toContainText('Modified');

  const external = preview.getByRole('link', { name: 'the web' });
  await expect(external).toHaveAttribute('target', '_blank');
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer');

  // refresh on a deep link: the SPA fallback must serve the app
  await page.reload();
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Personal' })).toBeVisible();

  // relative .md link navigates inside Atlas (no full page load needed to be asserted; the URL and content must change)
  await page.getByTestId('preview').getByRole('link', { name: 'pipelines' }).click();
  await expect(page).toHaveURL(/\/atlas\/pipelines\/example\.md#top$/);
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Example pipeline' })).toBeVisible();
  await expect(page.locator('[data-testid="atlas-file"][data-path="pipelines/example.md"]')).toHaveAttribute('aria-current', 'page');

  await page.goBack();
  await expect(page).toHaveURL(/about\.md$/);
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Personal' })).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Example pipeline' })).toBeVisible();
});

test('text files render as code', async ({ page }) => {
  await page.goto('/atlas/modules/demo/run.py');
  await expect(page.locator('pre.code code')).toContainText('print("hi")');
});

test('forbidden files are not reachable', async ({ page, request }) => {
  for (const p of ['.env', 'intake/raw/x.txt', 'state/aios.sqlite', 'entities/../secret.md', 'entities/.hidden.md']) {
    const r = await request.get(`/api/atlas/file?path=${encodeURIComponent(p)}`);
    expect(r.status(), p).toBe(404);
  }
  await page.goto('/atlas/intake/raw/x.txt');
  await expect(page.getByTestId('preview-error')).toBeVisible();
  // and they are absent from the tree
  await page.goto('/');
  // the tree remembers that the previous page opened intake/, so only expand it when it is collapsed
  const intake = page.getByRole('button', { name: 'intake', exact: true });
  if ((await intake.locator('xpath=ancestor::li[1]').getAttribute('aria-expanded')) !== 'true') await intake.click();
  await expect(page.locator('[data-testid="atlas-file"][data-path="intake/README.md"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'raw', exact: true })).toHaveCount(0);
});

test('Home button returns home from a brain file', async ({ page }) => {
  await page.goto('/atlas/entities/personal/about.md');
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Personal' })).toBeVisible();
  await page.getByTestId('rail-home').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('preview')).toHaveCount(0);
});

test('the removed Chalk notes routes: /notes/p1 renders Home with no iframe; the library API is a JSON 404', async ({ page, request }) => {
  await page.goto('/notes/p1');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  const r = await request.get('/api/notes/library');
  expect(r.status()).toBe(404);
  expect(r.headers()['content-type']).toContain('application/json');
  expect(await r.json()).toEqual({ detail: 'Not found' });
});

test('narrow screens: the left panel is collapsible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.getByTestId('sidebar')).toBeHidden();
  await page.getByTestId('nav-toggle').click();
  await expect(page.getByTestId('sidebar')).toBeVisible();
  await page.getByRole('button', { name: 'entities', exact: true }).click();
  await page.getByRole('button', { name: 'personal', exact: true }).click();
  await page.locator('[data-testid="atlas-file"][data-path="entities/personal/about.md"]').click();
  await expect(page).toHaveURL(/\/atlas\/entities\/personal\/about\.md$/);
  await expect(page.getByTestId('sidebar')).toBeHidden();
});

test('phone width: the views do not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const path of ['/', '/calendar', '/portfolio']) {
    await page.goto(path);
    await expect(page.getByTestId('rail')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
