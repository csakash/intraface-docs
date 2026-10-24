// protects=the reader-facing behaviour of the docs (SPEC docs criteria 9–13, 18): search, theme, Human/Agent view, the
// interactive demos, mobile layout and reduced motion; fails_when=any of those regress in the built site as Wrangler
// serves it; no_claim=production routing through the landing Worker (checked with curl after deploy)
import { expect, test } from '@playwright/test';

const PAGES = ['/docs/', '/docs/reference/cli/', '/docs/reference/mcp/', '/docs/reference/api/', '/docs/reference/api/operations/publishescreate/'];

test('⌘K search finds the race section and publishes.create in the first 3 results', async ({ page }) => {
  await page.goto('/docs/');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.locator('#ifc-search')).toBeVisible();
  await page.locator('#ifc-search-q').fill('needs_rebase');
  const rows = page.locator('#ifc-search-list .it .t');
  await expect(rows.first()).toBeVisible();
  const top3 = (await rows.allTextContents()).slice(0, 3).join(' | ');
  expect(top3).toContain('publishes.create');
  expect(top3).toContain('Same line: 409 needs_rebase');
  await page.keyboard.press('Escape');
  await expect(page.locator('#ifc-search')).toBeHidden();
  await page.keyboard.press('/');
  await page.locator('#ifc-search-q').fill('presign_upload');
  await expect(rows.first()).toContainText('MCP tools');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/reference\/mcp\/#presign_upload/);
});

test('the theme toggle switches every token and survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/docs/');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(244, 243, 238)');
  await page.locator('.ifc-theme').first().click();
  expect(await bg()).toBe('rgb(18, 18, 17)');
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await bg()).toBe('rgb(18, 18, 17)');
});

test('with storage blocked the page still renders in the system theme', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/docs/');
  await expect(page.locator('h1')).toHaveText('Quickstart');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
});

for (const path of ['/docs/', '/docs/reference/api/operations/publishescreate/']) {
  test(`Agent view shows the exact bytes of ${path}'s .md, and Copy page copies them`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(path);
    const mdPath = path === '/docs/' ? '/docs/index.md' : `${path.replace(/\/$/, '')}.md`;
    const md = await (await page.request.get(mdPath)).text();
    await page.locator('.seg.view button[data-mode="agent"]').click();
    await expect(page.locator('.sl-markdown-content')).toBeHidden();
    await expect.poll(() => page.locator('#agent-view pre').textContent(), { timeout: 5000 }).toBe(md);
    await page.locator('.ifc-actions [data-copy-md]:visible').first().click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(md);
    await page.locator('.seg.view button[data-mode="human"]').click();
    await expect(page.locator('.sl-markdown-content')).toBeVisible();
  });
}

test('the simulation pauses, plays and rushes', async ({ page }) => {
  await page.goto('/docs/');
  const sim = page.locator('#ifc-sim');
  await expect(sim.locator('[data-live]')).toHaveText('LIVE');
  await sim.locator('[data-toggle]').click();
  await expect(sim.locator('[data-live]')).toHaveText('PAUSED');
  const head = await sim.locator('[data-head]').textContent();
  await page.waitForTimeout(1500);
  expect(await sim.locator('[data-head]').textContent()).toBe(head);
  await sim.locator('[data-rush]').click();
  await expect(sim.locator('[data-live]')).toHaveText('LIVE');
  await expect.poll(async () => Number((await sim.locator('[data-head]').textContent())?.slice(1)), { timeout: 10_000 }).toBeGreaterThan(
    Number(head?.slice(1)),
  );
});

test('the race demo shows a clean merge and a resolved conflict', async ({ page }) => {
  await page.goto('/docs/');
  const race = page.locator('#ifc-race');
  await race.locator('[data-go]').click();
  await expect(race.locator('[data-out]')).toContainText('Clean merge', { timeout: 6000 });
  await race.locator('.seg button[data-mode="same"]').click();
  await race.locator('[data-go]').click();
  await expect(race.locator('[data-b]')).toContainText('409 needs_rebase', { timeout: 6000 });
  await expect(race.locator('[data-out]')).toContainText('Resolved', { timeout: 8000 });
});

test('agent cards and the setup tabs stay in sync', async ({ page }) => {
  await page.goto('/docs/');
  await page.locator('#ifc-pick button[data-label="Cursor"]').click();
  const tabs = page.locator('starlight-tabs[data-sync-key="agent"] [role="tab"]');
  await expect(tabs.filter({ hasText: 'Cursor' })).toHaveAttribute('aria-selected', 'true');
  await tabs.filter({ hasText: 'Codex' }).click();
  await expect(page.locator('#ifc-pick button[data-label="Codex"]')).toHaveAttribute('aria-pressed', 'true');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of PAGES) {
    test(`${path} has no sideways scroll`, async ({ page }) => {
      await page.goto(path);
      for (const scheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      }
    });
  }

  test('the page actions are in the mobile table of contents', async ({ page }) => {
    await page.goto('/docs/');
    await page.locator('mobile-starlight-toc summary').click();
    const actions = page.locator('mobile-starlight-toc .ifc-actions');
    await expect(actions.getByText('Copy page for your agent')).toBeVisible();
    await expect(actions.getByText('Open in Claude')).toBeVisible();
    await expect(actions.getByText('llms.txt')).toBeVisible();
  });
});

test('with reduced motion nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/docs/');
  await expect(page.locator('#ifc-sim [data-live]')).toHaveText('PAUSED');
  const head = await page.locator('#ifc-sim [data-head]').textContent();
  await page.waitForTimeout(2000);
  expect(await page.locator('#ifc-sim [data-head]').textContent()).toBe(head);
  await page.locator('.seg.view button[data-mode="agent"]').click();
  // No typing: the whole file is there at once.
  const md = await (await page.request.get('/docs/index.md')).text();
  await expect(page.locator('#agent-view pre')).toHaveText(md.trimEnd(), { timeout: 1000 });
  const running = await page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === 'running' && (a.effect?.getTiming().iterations ?? 1) === Infinity).length,
  );
  expect(running).toBe(0);
});

test('gtag.js is added only after the page has loaded', async ({ page }) => {
  const html = await (await page.request.get('/docs/')).text();
  expect(html).not.toMatch(/<script[^>]+src="https:\/\/www\.googletagmanager/);
  await page.route('https://www.googletagmanager.com/**', (r) => r.fulfill({ body: '' }));
  await page.goto('/docs/', { waitUntil: 'load' });
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(1, { timeout: 5000 });
});
