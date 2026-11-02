import { expect, test, type Page } from '@playwright/test';

async function openAbout(page: Page) {
  await page.getByRole('button', { name: 'entities', exact: true }).click();
  await page.getByRole('button', { name: 'personal', exact: true }).click();
  await page.locator('[data-testid="atlas-file"][data-path="entities/personal/about.md"]').click();
}

test('home loads with both cards and the dashboards placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Atlas', level: 1 })).toBeVisible();
  await expect(page.getByTestId('home-date')).not.toBeEmpty();
  const atlasCard = page.getByTestId('card-recent-atlas');
  await expect(atlasCard.getByRole('heading', { name: 'Recently changed in Atlas' })).toBeVisible();
  await expect(atlasCard.locator('a').first()).toBeVisible();
  const notesCard = page.getByTestId('card-recent-notes');
  await expect(notesCard.getByRole('heading', { name: 'Recent notes' })).toBeVisible();
  await expect(notesCard.getByRole('link', { name: /Page Two/ })).toBeVisible();
  await expect(notesCard.getByRole('link', { name: /Page One/ })).toBeVisible();
  await expect(page.getByTestId('card-dashboards')).toContainText('Coming soon');
  // forbidden files never show up as recent
  await expect(atlasCard).not.toContainText('.env');
  await expect(atlasCard).not.toContainText('sqlite');
  await expect(atlasCard).not.toContainText('raw/');
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

test('open a note page: iframe shows the stub; sidebar toggle; switching pages keeps the iframe', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('note-page').filter({ hasText: 'Page One' }).click();
  await expect(page).toHaveURL(/\/notes\/p1$/);
  const frame = page.frameLocator('[data-testid="notes-frame"]');
  await expect(frame.locator('#board-id')).toHaveText('p1');
  await expect(frame.locator('#embed-flag')).toHaveText('yes');
  await expect(page.getByTestId('notes-title')).toContainText('Page One');

  const button = page.getByTestId('notebooks-button');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click();
  await expect(frame.locator('#sidebar-state')).toHaveText('open');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.click();
  await expect(frame.locator('#sidebar-state')).toHaveText('closed');
  await expect(button).toHaveAttribute('aria-pressed', 'false');

  // mark the document inside the iframe; a reload would wipe the marker
  await frame.locator('body').evaluate(() => { (window as unknown as { __marker: string }).__marker = 'kept'; });
  await page.getByTestId('note-page').filter({ hasText: 'Page Two' }).click();
  await expect(frame.locator('#board-id')).toHaveText('p2');
  await expect(page).toHaveURL(/\/notes\/p2$/);
  await expect(page.locator('[data-testid="note-page"][data-id="p2"]')).toHaveAttribute('aria-current', 'page');
  expect(await frame.locator('body').evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe('kept');

  // deep link / refresh on a notes URL
  await page.reload();
  await expect(page.frameLocator('[data-testid="notes-frame"]').locator('#board-id')).toHaveText('p2');
});

test('Home button returns home', async ({ page }) => {
  await page.goto('/notes/p1');
  await expect(page.frameLocator('[data-testid="notes-frame"]').locator('#board-id')).toHaveText('p1');
  await page.getByTestId('home-button').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('notes-frame')).toHaveCount(0);
});

test('a missing Chalk shows a friendly message and the rest of Atlas works', async ({ page }) => {
  await page.route('**/api/notes/library', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ detail: "Chalk isn't reachable" }) }),
  );
  await page.goto('/');
  await expect(page.getByTestId('notes-error')).toContainText("Chalk isn't running at http://chalk-stub:8081");
  await expect(page.getByTestId('card-recent-notes')).toContainText("Chalk isn't running");
  await openAbout(page);
  await expect(page.getByTestId('preview').getByRole('heading', { name: 'Personal' })).toBeVisible();
});

test('narrow screens: the left panel is collapsible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.getByTestId('sidebar')).toBeHidden();
  await page.getByTestId('nav-toggle').click();
  await expect(page.getByTestId('sidebar')).toBeVisible();
  await page.getByTestId('note-page').filter({ hasText: 'Page One' }).click();
  await expect(page).toHaveURL(/\/notes\/p1$/);
  await expect(page.getByTestId('sidebar')).toBeHidden();
});
