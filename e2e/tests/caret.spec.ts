import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// Runs only in the `caret` project, which launches Chromium with --enable-caret-browsing
// (the F7 / "Navigate pages with a text cursor" mode). Set CARET_LABEL=before|after to
// name the evidence screenshots.
const label = process.env.CARET_LABEL ?? 'after';

async function caretFrames(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const frames: Buffer[] = [];
  // 16 samples at irregular gaps (~1.3s total, covers 2+ blink periods without aliasing)
  for (let i = 0; i < 16; i++) {
    // caret:'initial' keeps the caret in screenshots (Playwright hides it by default)
    frames.push(await page.screenshot({ clip, caret: 'initial', animations: 'allow' }));
    await page.waitForTimeout(37 + ((i * 53) % 71));
  }
  return frames;
}

test('caret browsing: no blinking caret after clicking plain text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home')).toBeVisible();
  const para = page.getByTestId('home-date');
  const box = (await para.boundingBox())!;
  const x = box.x + 40;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  const caretColor = await para.evaluate((el) => getComputedStyle(el).caretColor);
  console.log(`[caret:${label}] home-date computed caret-color = ${caretColor}`);
  console.log(`[caret:${label}] selection type = ${await page.evaluate(() => window.getSelection()?.type)}, focus=${await page.evaluate(() => document.activeElement?.tagName)}`);
  const clip = { x: Math.max(0, x - 60), y: Math.max(0, y - 14), width: 160, height: 28 };
  const frames = await caretFrames(page, clip);
  const uniq = [...new Set(frames.map((f) => f.toString('base64')))];
  uniq.forEach((b64, i) => writeFileSync(`artifacts/caret-${label}-frame${i + 1}.png`, Buffer.from(b64, 'base64')));
  const distinct = uniq.length;
  console.log(`[caret:${label}] distinct frames across 16 samples = ${distinct}`);
  expect(caretColor).toBe('rgba(0, 0, 0, 0)');
  expect(distinct).toBe(1); // a blinking caret would make frames differ
});

test('caret browsing: inputs keep their caret and text stays selectable', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('command-trigger').click();
  const input = page.getByTestId('command-box');
  await expect(input).toBeFocused();
  const color = await input.evaluate((el) => getComputedStyle(el).caretColor);
  console.log(`[caret:${label}] cmdk input computed caret-color = ${color}`);
  expect(color).not.toBe('rgba(0, 0, 0, 0)');
  expect(color).not.toBe('transparent');
  await page.keyboard.press('Escape');

  // drag-select still works
  const para = page.getByTestId('home-date');
  const box = (await para.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  console.log(`[caret:${label}] selected text = ${JSON.stringify(selected)}`);
  expect(selected.length).toBeGreaterThan(3);
});
