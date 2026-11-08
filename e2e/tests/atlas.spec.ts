import { expect, test, type Page } from '@playwright/test';

async function openAbout(page: Page) {
  await page.getByRole('button', { name: 'entities', exact: true }).click();
  await page.getByRole('button', { name: 'personal', exact: true }).click();
  await page.locator('[data-testid="atlas-file"][data-path="entities/personal/about.md"]').click();
}

test('home shows the stat tiles, dashboards and the recent-files card (no notes card)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('home-date')).not.toBeEmpty();
  await expect(page.getByTestId('card-dashboards')).toHaveCount(0);
  // dashboards with their not-connected notices (D37)
  await expect(page.getByTestId('view-title')).toContainText('Ben');
  await expect(page.getByTestId('view-title')).toHaveText(/^Good (morning|afternoon|evening), Ben$/);
  await expect(page.getByTestId('home-date')).toContainText('No briefing yet.');
  await expect(page.getByTestId('stat-events')).toContainText('Calendar not connected');
  await expect(page.getByTestId('stat-tasks')).toContainText('Tasks not connected');
  await expect(page.getByTestId('stat-portfolio')).toContainText('Portfolio not connected');
  await expect(page.getByTestId('stat-brain').getByTestId('stat-value')).not.toHaveText('—');
  await expect(page.getByTestId('month-calendar')).toBeVisible();
  await expect(page.getByTestId('week-calendar')).toHaveCount(0);
  await expect(page.getByTestId('calendar-status')).toContainText('No calendar connected yet.');
  await expect(page.getByTestId('portfolio-panel')).toBeVisible();
  await expect(page.getByTestId('portfolio-status')).toContainText('Not connected');
  await expect(page.getByTestId('portfolio-panel')).not.toContainText('—');
  await expect(page.getByTestId('briefing-panel')).toBeVisible();
  await expect(page.getByTestId('briefing-panel')).toContainText('No briefing yet');
  const atlasCard = page.getByTestId('card-recent-atlas');
  await expect(atlasCard.getByRole('heading', { name: 'Recently changed', exact: true })).toBeVisible();
  await expect(atlasCard.locator('a').first()).toBeVisible();
  await expect(atlasCard.locator('a').first()).toHaveAttribute('href', /^\/atlas\//);
  // Chalk notes were removed (D41)
  await expect(page.getByTestId('card-recent-notes')).toHaveCount(0);
  // forbidden files never show up as recent
  await expect(atlasCard).not.toContainText('.env');
  await expect(atlasCard).not.toContainText('sqlite');
  await expect(atlasCard).not.toContainText('raw/');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: '/e2e/artifacts/home-empty-light.png', animations: 'disabled' });
});

test('home renders connected dashboards', async ({ page }) => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const day = (n: number) => iso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + n));
  const item = (o: Record<string, unknown>) => ({
    durationMin: null, time: null, tag: null, done: null, subtasks: [], source: 'google', location: null, ...o,
  });
  const today = iso(now);
  const upNext = item({ id: 'ev1', title: 'Standup with HyperSense', date: today, time: '09:00', durationMin: 15, kind: 'event', tag: 'Work', location: 'Zoom' });
  const items = [
    item({ id: 't1', title: 'Finish DSA problem set', date: day(0), kind: 'task', tag: 'School', done: true }),
    item({ id: 't2', title: 'Ship Atlas redesign', date: day(2), kind: 'task', tag: 'Build', done: false, subtasks: [{ title: 'Home', done: true }, { title: 'Dashboards', done: false }] }),
    item({ id: 't3', title: 'Gym', date: day(3), time: '17:30', durationMin: 60, kind: 'event', tag: 'Health' }),
    item({ id: 't4', title: 'Pay rent', date: day(4), kind: 'task', tag: 'Money', done: false }),
    upNext,
  ];
  const history = Array.from({ length: 24 }, (_, i) => ({
    t: new Date(now.getTime() - (23 - i) * 86_400_000).toISOString(),
    value: 11_800 + i * 24 + (i % 3) * 35,
  }));
  const hold = (symbol: string, name: string, shares: number, price: number, dayChangePct: number) => ({
    symbol, name, shares, price, dayChangePct, value: Math.round(shares * price * 100) / 100,
    spark: Array.from({ length: 12 }, (_, i) => price * (1 + (dayChangePct / 100) * (i / 11) + (i % 2) * 0.004)),
  });
  const json = (body: unknown) => ({ contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/briefing', (r) => r.fulfill(json({
    connected: true, generatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 2).toISOString(),
    summary: 'Two meetings today and one task due Friday; the morning is free for the redesign.',
    upNext: [upNext, item({ id: 'ev2', title: 'Office hours', date: day(3), time: '14:00', durationMin: 30, kind: 'event', tag: 'School' })],
    suggestions: [{ id: 's1', text: 'Block 90 minutes for the Dashboards subtask.' }, { id: 's2', text: 'Reply to the recruiter email before noon.' }],
  })));
  await page.route('**/api/calendar*', (r) => r.fulfill(json({ connected: true, sources: ['google'], start: day(0), days: 7, items })));
  await page.route('**/api/portfolio*', (r) => r.fulfill(json({
    connected: true, sources: ['broker'], asOf: now.toISOString(), currency: 'USD', range: '1M',
    total: 12_340, dayChange: { amount: 40.5, pct: 0.33 }, totalChange: { amount: -120, pct: -0.96 }, history,
    holdings: [hold('VTI', 'Vanguard Total Market', 20, 280, 0.4), hold('VXUS', 'Vanguard Intl', 40, 66, -0.2), hold('BND', 'Vanguard Bond', 30, 72, 0), hold('NVDA', 'NVIDIA', 5, 140, 1.2), hold('AAPL', 'Apple', 8, 230, -0.5)],
  })));

  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.goto('/');
  await expect(page.getByText('Two meetings today and one task due Friday')).toBeVisible();
  await expect(page.getByTestId('briefing-panel').getByText('Standup with HyperSense')).toBeVisible();
  const month = page.getByTestId('month-calendar');
  await expect(month.locator('td[aria-current="date"]')).toHaveCount(1);
  await expect(month.locator('td[aria-current="date"]')).toHaveAttribute('aria-label', /Today/);
  await expect(month.getByTestId('today-event')).toContainText('Standup with HyperSense');
  await expect(page.getByTestId('stat-events').getByTestId('stat-value')).not.toHaveText('—');
  await expect(page.getByTestId('stat-portfolio')).toContainText('▲ 0.33%');
  await expect(page.getByTestId('portfolio-panel')).toContainText('$12,340.00');
  await expect(page.getByTestId('holding-row')).toHaveCount(4);
  await expect(page.getByTestId('portfolio-chart')).toHaveAttribute('role', 'img');
  await expect(page.getByTestId('connectors-count')).toHaveText('3 of 3 connected');
  // the month arrows refetch the 42-day grid; the range segments refetch the portfolio
  const calReq = page.waitForRequest((r) => r.url().includes('/api/calendar') && r.url().includes('days=42'));
  const label = await month.getByTestId('month-label').textContent();
  await month.getByRole('button', { name: 'Next month' }).click();
  await calReq;
  await expect(month.getByTestId('month-label')).not.toHaveText(label ?? '');
  await month.getByRole('button', { name: 'Previous month' }).click();
  await expect(month.getByTestId('month-label')).toHaveText(label ?? '');
  const pfReq = page.waitForRequest((r) => r.url().includes('/api/portfolio') && r.url().includes('range=1W'));
  await page.getByTestId('portfolio-panel').getByRole('button', { name: '1W', exact: true }).click();
  await pfReq;
  await expect(page.getByTestId('portfolio-panel').getByRole('button', { name: '1W', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.emulateMedia({ colorScheme: 'light' });
  await page.screenshot({ path: '/e2e/artifacts/home-light.png', animations: 'disabled' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '/e2e/artifacts/home-dark.png', animations: 'disabled' });
  // the Calendar view keeps the week, with the task totals
  await page.goto('/calendar');
  await expect(page.getByTestId('week-calendar')).toContainText('1 of 3 done');
  await expect(page.getByTestId('calendar-day').and(page.locator('[aria-current="date"]')).getByText('Today', { exact: true })).toBeVisible();
  await expect(page.getByTestId('upcoming-card')).toContainText('Standup with HyperSense');
  await page.goto('/settings');
  await expect(page.getByTestId('connector-calendar')).toContainText('Connected');
  await expect(page.getByTestId('connector-calendar')).toContainText('google');
  await expect(page.getByTestId('settings-connectors-count')).toHaveText('3 of 3 connected');
  await page.goto('/');
  await expect(page.getByTestId('portfolio-panel')).toContainText('$12,340.00');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload(); // phone width starts with the sidebar closed
  await expect(page.getByTestId('portfolio-panel')).toContainText('$12,340.00');
  await page.screenshot({ path: '/e2e/artifacts/home-phone-dark.png', animations: 'disabled' });
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
  await expect(page.getByTestId('view-title')).toHaveText('Brain');
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

test('command dialog: Ctrl+K opens, lists the views, jumps to a brain file, Escape closes', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+k');
  const box = page.getByTestId('command-box');
  await expect(box).toBeFocused();
  // an empty query lists the views
  await expect(page.getByTestId('command-result')).toHaveCount(10);
  await box.fill('about.md');
  await expect(page.getByTestId('command-result').first()).toContainText('entities/personal/about.md');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atlas\/entities\/personal\/about\.md$/);
  await expect(box).toHaveCount(0);

  // arrow keys and Escape
  await page.keyboard.press('Control+k');
  await box.fill('o');
  await expect(page.getByTestId('command-result').first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('command-result').nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(box).toHaveCount(0);
  // the top-bar field opens it too, and a click jumps
  await page.getByTestId('command-trigger').click();
  await expect(page.getByTestId('command-box')).toHaveValue('');
  await page.getByTestId('command-box').fill('calendar');
  await page.getByTestId('command-result').first().click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByTestId('view-title')).toHaveText('Calendar');
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

test('the removed Chalk embed: /notes/p1 renders the Notes frame with no iframe; the library API is a JSON 404', async ({ page, request }) => {
  await page.goto('/notes/p1');
  await expect(page.getByTestId('notes-view')).toBeVisible();
  await expect(page.getByTestId('view-title')).toHaveText('Notes');
  await expect(page.locator('iframe')).toHaveCount(0);
  const r = await request.get('/api/notes/library');
  expect(r.status()).toBe(404);
  expect(r.headers()['content-type']).toContain('application/json');
  expect(await r.json()).toEqual({ detail: 'Not found' });
});

const FRAMES: [string, string, string[], RegExp][] = [
  ['tasks', 'Tasks', ['Today', 'Upcoming', 'Done'], /Tasks aren't connected yet/],
  ['notes', 'Notes', ['Pinned', 'Recent', 'Notebooks'], /Notes are being redesigned/],
  ['projects', 'Projects', ['Active', 'Recently updated'], /Projects from your brain will appear here/],
  ['messages', 'Messages', ['Inbox', 'Slack'], /Connect Gmail and Slack/],
  ['people', 'People', ['Recent contacts', 'Follow-ups'], /People from your brain and contacts/],
];
for (const [route, title, sections, empty] of FRAMES) {
  test(`tab frame /${route}: title, sections and the empty sentence, no dead buttons`, async ({ page }) => {
    await page.goto('/');
    await page.getByTestId(`rail-${route}`).click();
    await expect(page).toHaveURL(new RegExp(`/${route}$`));
    await expect(page.getByTestId(`rail-${route}`)).toHaveAttribute('aria-current', 'page');
    const view = page.getByTestId(`${route}-view`);
    await expect(view).toBeVisible();
    await expect(page.getByTestId('view-title')).toHaveText(title);
    for (const s of sections) await expect(view.getByRole('heading', { name: s, exact: true })).toBeVisible();
    await expect(view.getByTestId('frame-empty').first()).toContainText(empty);
    await expect(view.getByRole('button')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId(`${route}-view`)).toBeVisible();
  });
}

test('settings: connectors from the three feeds, system appearance, terminal bridge address', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings');
  await expect(page.getByTestId('settings-view')).toBeVisible();
  await expect(page.getByTestId('view-title')).toHaveText('Settings');
  await expect(page.getByTestId('settings-connectors-count')).toHaveText('0 of 3 connected');
  await expect(page.getByTestId('connectors-count')).toHaveText('0 of 3 connected');
  for (const id of ['calendar', 'portfolio', 'briefing']) await expect(page.getByTestId(`connector-${id}`)).toContainText('Not connected');
  for (const id of ['mail', 'tasks', 'slack']) await expect(page.getByTestId(`connector-${id}`)).toContainText('Not available yet');
  await expect(page.getByTestId('setting-appearance')).toContainText('Follows your system setting.');
  await expect(page.getByTestId('setting-terminal')).toContainText('http://term-test:7681');
  await expect(page.getByTestId('settings-view').getByRole('button')).toHaveCount(0);
  await page.screenshot({ path: '/e2e/artifacts/settings-dark.png', animations: 'disabled' });
  // the nav's connectors card opens it
  await page.goto('/');
  await page.getByTestId('connectors-card').click();
  await expect(page).toHaveURL(/\/settings$/);
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

test('phone width: the nav is a drawer opened from the top bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.getByTestId('rail')).toBeHidden();
  await page.getByTestId('drawer-toggle').click();
  await expect(page.getByTestId('rail')).toBeVisible();
  await page.getByTestId('rail-tasks').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByTestId('rail')).toBeHidden();
  await page.getByTestId('drawer-toggle').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('rail')).toBeHidden();
});

test('phone width: the views do not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const path of ['/', '/calendar', '/portfolio', '/tasks', '/settings']) {
    await page.goto(path);
    await expect(page.getByTestId('view-title')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
