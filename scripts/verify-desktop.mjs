import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { themeTokens } from '../src/palette.js';

// Connect to an isolated Windows Harness test instance with a fixture conversation open.
const port = Number(process.argv[2]);
const output = process.argv[3];
assert.ok(Number.isInteger(port) && port > 1024 && port <= 65535 && output,
  'Usage: node scripts/verify-desktop.mjs <loopback debug port> <evidence dir>');
const catalog = JSON.parse(await readFile(new URL('../themes.json', import.meta.url)));
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);

try {
  const page = browser.contexts().flatMap((context) => context.pages())
    .find((candidate) => candidate.url().startsWith('dsh-app://app'));
  assert.ok(page, 'No native DSH workspace found');
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/plugins/dsh-work-skin/') && !response.ok()) {
      errors.push(`Plugin resource ${response.status()} ${response.url()}`);
    }
  });
  const content = page.locator('[data-conversation-content]');
  const heading = page.getByRole('heading', { name: '海边工作室 · 皮肤验收' });
  const gallery = page.getByRole('region', { name: 'DSH 一键换肤' });
  const composer = page.locator('[data-composer-card] [contenteditable=true]');
  const report = [];

  async function openSettings() {
    if (await gallery.isVisible()) return;
    const account = page.getByRole('button', { name: '账号菜单', exact: true });
    if (page.viewportSize()?.width < 900) {
      await page.getByRole('button', { name: '打开侧边栏', exact: true }).click();
    }
    await account.click();
    await page.getByText('设置', { exact: true }).click();
    await gallery.waitFor();
  }

  async function openGallery() {
    await openSettings();
    if (await gallery.locator('details').getAttribute('open') === null) {
      await gallery.locator('summary').click();
    }
  }

  async function closeSettings() {
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await gallery.waitFor({ state: 'hidden' });
    if (page.viewportSize()?.width < 900) {
      const collapse = page.getByRole('button', { name: '收起侧边栏', exact: true });
      if (await collapse.isVisible()) await collapse.click();
      await page.getByRole('button', { name: '打开侧边栏', exact: true }).waitFor();
    }
  }

  await heading.waitFor({ state: 'attached' });
  await openSettings();
  await page.getByRole('button', { name: '深色', exact: true }).click();
  await page.locator('body[data-ds-dark-theme]').waitFor();
  await closeSettings();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await heading.waitFor({ state: 'attached' });
  await page.locator('body[data-ds-dark-theme]').waitFor();

  for (const viewport of [{ width: 1280, height: 820 }, { width: 820, height: 760 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(() => window.innerWidth), viewport.width);
    await openGallery();
    const cards = gallery.locator('.dsh-work-skin-card');
    assert.deepEqual(await cards.allTextContents(), catalog.map(({ name }) => name));
    for (const { name } of catalog) {
      const card = gallery.getByRole('button', { name, exact: true });
      await card.scrollIntoViewIfNeeded();
      assert.ok(await card.locator('img').evaluate(async (img) => {
        await img.decode();
        return img.naturalWidth === 320;
      }), `${name} preview`);
    }
    assert.ok(await gallery.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), 'Gallery overflow');
    if (viewport.width === 1280) {
      await gallery.getByRole('button', { name: '海风微语', exact: true }).click();
      await gallery.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: join(output, 'gallery.png') });
    }

    for (const skin of catalog) {
      await openGallery();
      const card = gallery.getByRole('button', { name: skin.name, exact: true });
      await card.click();
      assert.equal(await card.getAttribute('aria-pressed'), 'true');
      await closeSettings();
      const result = await content.evaluate(async (el) => {
        const style = getComputedStyle(el);
        const background = style.getPropertyValue('--dsh-work-skin-image');
        const image = new Image();
        image.src = background.slice(5, -2);
        await image.decode();
        const body = getComputedStyle(document.body);
        const bounds = (element) => element?.getBoundingClientRect().toJSON();
        return {
          id: document.body.dataset.dshWorkSkin,
          light: !document.body.hasAttribute('data-ds-dark-theme'),
          width: image.naturalWidth,
          height: image.naturalHeight,
          backgroundPainted: style.backgroundImage.includes(image.src),
          focus: style.backgroundPosition.split(', ').at(-1),
          composerToken: body.getPropertyValue('--dsw-specific-input-major'),
          codeToken: body.getPropertyValue('--dsw-alias-markdown-code-block'),
          composerBounds: bounds(el.querySelector('[data-composer-card]')),
          code: Boolean(el.querySelector('[data-code-block-content]')),
          bubble: Boolean(el.querySelector('[data-message-bubble]')),
          table: Boolean(el.querySelector('table')),
        };
      });
      const tokens = themeTokens(skin);
      assert.equal(result.id, skin.id);
      assert.ok(result.light && result.backgroundPainted && result.width >= 1280 && result.height >= 720);
      const focusX = viewport.width < 1100 ? skin.compactFocusX : skin.focusX;
      assert.equal(result.focus, `${Math.round(focusX * 100)}% ${Math.round(skin.focusY * 100)}%`);
      assert.equal(result.composerToken, tokens['--dsw-specific-input-major']);
      assert.equal(result.codeToken, tokens['--dsw-alias-markdown-code-block']);
      assert.ok(result.code && result.bubble && result.table, `${skin.name} fixture transcript`);
      assert.ok(result.composerBounds.width >= 300 && result.composerBounds.right <= viewport.width + 1);
      await heading.scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(output, `${viewport.width}-${skin.id}.png`) });
      report.push({ viewport, ...result });
      console.log(`${viewport.width}px ${skin.name} OK`);
    }
  }

  await composer.fill('验证换肤后的输入焦点与草稿。');
  await page.getByRole('button', { name: '发送消息', exact: true }).waitFor();
  assert.ok(await page.getByRole('button', { name: '发送消息', exact: true }).isEnabled());
  await composer.fill('');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('body[data-dsh-work-skin=golden-hour]').waitFor();
  await heading.waitFor({ state: 'attached' });
  await page.setViewportSize({ width: 1280, height: 820 });
  await openSettings();
  await gallery.getByRole('button', { name: '恢复默认', exact: true }).click();
  await page.locator('body[data-ds-dark-theme]:not([data-dsh-work-skin])').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('dsh-work-skin:selected')), null);
  assert.equal(await content.evaluate((el) => getComputedStyle(el).backgroundImage), 'none');
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'report.json'), JSON.stringify({ report, persisted: true, restoredDark: true, errors }, null, 2));
  console.log(`${report.length} real desktop render checks passed, with reload and default restoration.`);
} finally {
  await browser.close();
}
