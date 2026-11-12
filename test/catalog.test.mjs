import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { contrast, themeTokens } from '../src/palette.js';

const catalog = JSON.parse(readFileSync(new URL('../themes.json', import.meta.url)));

test('all 13 original themes have a unique id and name', () => {
  assert.deepEqual(catalog.map(({ name }) => name), [
    '海风微语', '晴窗猫咪', '风起云庭', '露西晨光版', '昼光协议', '明雾机房', '云端来信',
    '月白庭院', '纸上云汀', '虹光观测站', '橘园午后', '浮鲸之境', '黄金时刻',
  ]);
  assert.equal(new Set(catalog.map(({ id }) => id)).size, 13);
});

for (const skin of catalog) {
  test(`${skin.name} has valid art, focus and readable foregrounds`, () => {
    assert.match(skin.id, /^[a-z]+(?:-[a-z]+)+$/);
    for (const value of [skin.focusX, skin.focusY, skin.compactFocusX]) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
    const png = readFileSync(new URL(`../assets/${skin.id}.png`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(png.readUInt32BE(16) >= 1280 && png.readUInt32BE(20) >= 720);
    const jpg = readFileSync(new URL(`../assets/${skin.id}.jpg`, import.meta.url));
    assert.equal(jpg.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.ok(jpg.length < 80_000);

    const tokens = themeTokens(skin);
    const body = tokens['--dsw-alias-bg-base'];
    const worstCaseCanvas = `rgb(${body.slice(1).match(/../g).map((part) =>
      Math.round(Number.parseInt(part, 16) * 0.65)).join(', ')})`;
    for (const name of ['primary', 'secondary', 'tertiary', 'caption']) {
      const foreground = tokens[`--dsw-alias-label-${name}`];
      for (const surface of [
        worstCaseCanvas, tokens['--dsw-specific-sidebar-fill'], tokens['--dsw-specific-bubble'],
        tokens['--dsw-specific-input-major'], tokens['--dsw-alias-markdown-code-block'],
        tokens['--dsw-specific-menu'],
      ]) assert.ok(contrast(foreground, surface) >= 4.5, `${name} on ${surface}`);
    }
    assert.ok(contrast(tokens['--dsw-alias-link'], worstCaseCanvas) >= 4.5);
    assert.ok(contrast('#ffffff', tokens['--dsw-alias-state-business-primary']) >= 4.5);
  });
}
