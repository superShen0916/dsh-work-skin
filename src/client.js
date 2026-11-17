const { createElement: h, useState, useSyncExternalStore } = require('react');
const inject = ['theme', 'slots', 'configForms'];
const packageName = 'dsh-work-skin';
const productName = 'DSH 一键换肤';
const storageKey = `${packageName}:selected`;
const customKey = `${packageName}:custom`;
const skinId = (skin) => `${packageName}-${skin.id}`;
const asset = (filename) => require.asset?.(`plugins/${packageName}/assets/${filename}`);

function loadStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function saveSelection(value) {
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  } catch {
    // A restricted storage partition still allows switching for this window.
  }
}

function customSkin(value) {
  const palette = catalog.find(({ id }) => id === value?.palette);
  if (!palette || typeof value.image !== 'string' || !value.image.startsWith('data:image/webp;base64,')) return null;
  return {
    ...palette,
    id: `custom-${palette.id}`,
    name: '我的壁纸',
    description: `自选壁纸搭配「${palette.name}」配色`,
    image: value.image,
    palette: palette.id,
    focusX: 0.5,
    focusY: 0.5,
    compactFocusX: 0.5,
  };
}

async function prepareWallpaper(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
    throw new Error('请选择 20 MB 以内的 JPG、PNG 或 WebP 图片。');
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('无法读取这张图片，请换一张再试。');
  });
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.86);
  } finally {
    bitmap.close();
  }
}

function apply(ctx) {
  const { theme, slots } = ctx;
  const nativeSettings = ctx.configForms.get('ui-theme');
  const css = document.createElement('style');
  css.textContent = galleryCss;
  document.head.append(css);

  const saved = loadStored(storageKey);
  let customTheme = customSkin(loadStored(customKey));
  const skins = new Map([...catalog, ...(customTheme ? [customTheme] : [])].map((skin) => [skinId(skin), skin]));
  const isBuiltIn = (id) => ['system', 'light', 'dark'].includes(id);
  const startupPreference = theme.getTheme().preference;
  const register = (skin) => theme.register({
    id: skinId(skin),
    label: skin.name,
    colorScheme: 'light',
    tokens: themeTokens(skin),
  });
  const installed = catalog.map(register);
  let disposeCustom = customTheme && register(customTheme);
  let previous = isBuiltIn(startupPreference) ? startupPreference : 'system';
  let selected = '';
  let pendingBuiltIn;
  let nativeSnapshot = nativeSettings.getSnapshot();
  let running = true;
  const listeners = new Set();

  function clearBackground() {
    delete document.body.dataset.dshWorkSkin;
    for (const property of ['image', 'wash', 'focus', 'compact-focus']) {
      document.body.style.removeProperty(`--dsh-work-skin-${property}`);
    }
  }

  function showSkin(preference, refresh = false) {
    if (!running) return;
    const skin = skins.get(preference);
    if (!refresh && selected === (skin ? preference : '')) return;
    selected = skin ? preference : '';
    if (skin) {
      const url = skin.image ?? asset(`${skin.id}.png`);
      document.body.style.setProperty('--dsh-work-skin-wash', skin.colors['bg-primary']);
      document.body.style.setProperty('--dsh-work-skin-image', url ? `url(${JSON.stringify(url)})` : 'none');
      document.body.style.setProperty('--dsh-work-skin-focus', `${skin.focusX * 100}% ${skin.focusY * 100}%`);
      document.body.style.setProperty('--dsh-work-skin-compact-focus', `${skin.compactFocusX * 100}% ${skin.focusY * 100}%`);
      document.body.dataset.dshWorkSkin = skin.id;
      saveSelection({ id: selected, previous });
    } else {
      clearBackground();
      if (isBuiltIn(preference)) previous = preference;
      saveSelection(null);
    }
    for (const notify of listeners) notify();
  }

  const subscribe = (notify) => {
    listeners.add(notify);
    return () => listeners.delete(notify);
  };
  const selection = () => skins.get(selected);
  const select = (id) => {
    const current = theme.getTheme().preference;
    if (isBuiltIn(current)) {
      previous = current;
      pendingBuiltIn = current === nativeSettings.getSnapshot().value?.preference ? undefined : current;
    }
    theme.setTheme(id);
  };
  const reset = () => {
    pendingBuiltIn = undefined;
    theme.setTheme(previous);
  };

  async function applyWallpaper(file, palette) {
    const image = file ? await prepareWallpaper(file) : customTheme?.image;
    if (!running) return;
    const value = { palette, image };
    const skin = customSkin(value);
    if (!skin) throw new Error('请先选择一张可用的壁纸。');
    try {
      localStorage.setItem(customKey, JSON.stringify(value));
    } catch {
      throw new Error('壁纸保存失败，请检查本地存储空间或换一张较小的图片。');
    }
    const id = skinId(skin);
    const oldId = customTheme && skinId(customTheme);
    const oldDispose = disposeCustom;
    if (id !== oldId) disposeCustom = register(skin);
    skins.set(id, skin);
    customTheme = skin;
    if (selected === id) showSkin(id, true);
    else select(id);
    if (oldId && oldId !== id) {
      skins.delete(oldId);
      oldDispose();
    }
  }

  function CustomWallpaper() {
    const [file, setFile] = useState(null);
    const [palette, setPalette] = useState(() => customTheme?.palette ?? catalog[0].id);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const applyCustom = async () => {
      setBusy(true);
      try {
        await applyWallpaper(file, palette);
        setMessage('已应用「我的壁纸」。');
      } catch (error) {
        setMessage(error.message);
      } finally {
        setBusy(false);
      }
    };
    return h('fieldset', { className: 'dsh-work-skin-custom', disabled: busy },
      h('legend', null, '自定义壁纸'),
      h('label', null, '上传图片',
        h('input', {
          type: 'file',
          accept: 'image/jpeg,image/png,image/webp',
          onChange: (event) => setFile(event.target.files[0] ?? null),
        })),
      h('label', null, '界面配色',
        h('select', { value: palette, onChange: (event) => setPalette(event.target.value) },
          catalog.map(({ id, name }) => h('option', { key: id, value: id }, name)))),
      h('button', { type: 'button', onClick: applyCustom, disabled: !file && !customTheme }, '应用我的壁纸'),
      h('output', { role: 'status' }, message),
    );
  }

  function Gallery() {
    const active = useSyncExternalStore(subscribe, selection);
    const current = active && skinId(active);
    return h('section', { className: 'dsh-work-skin-gallery', 'aria-label': productName },
      h('div', { className: 'dsh-work-skin-gallery-heading' },
        h('span', null, productName),
        h('button', { type: 'button', onClick: reset, disabled: !active }, '恢复默认')),
      h('details', null,
        h('summary', null, active ? `当前皮肤 · ${active.name}` : '预览并切换皮肤'),
        typeof require.asset !== 'function' && h('p', { role: 'status' }, '此版本的 Harness 仅支持配色。升级到 0.2.2-rc.1 或更新版本可显示壁纸。'),
        h('div', { className: 'dsh-work-skin-gallery-grid' },
          [...skins].map(([id, skin]) => {
            const thumbnail = skin.image ?? asset(`${skin.id}.jpg`);
            return h('button', {
              key: id,
              type: 'button',
              className: 'dsh-work-skin-card',
              'aria-pressed': current === id,
              title: skin.description,
              onClick: () => select(id),
            },
            h('span', {
              className: 'dsh-work-skin-thumb',
              style: { backgroundColor: skin.colors['bg-primary'] },
            }, thumbnail && h('img', {
              alt: '',
              src: thumbnail,
              decoding: 'async',
              loading: 'lazy',
              style: { objectPosition: `${skin.focusX * 100}% ${skin.focusY * 100}%` },
            })),
            h('span', { className: 'dsh-work-skin-name' }, skin.name));
          }),
        ),
        h(CustomWallpaper),
      ),
    );
  }

  ctx.effect(() => () => {
    running = false;
    css.remove();
    clearBackground();
    if (skins.has(theme.getTheme().preference)) theme.setTheme(previous);
    disposeCustom?.();
    for (const dispose of installed) dispose();
  }, 'remove DSH One-Click Skins resources');
  ctx.on('theme/change', ({ preference }) => {
    const snapshot = nativeSettings.getSnapshot();
    const repeatedNativePreference = snapshot !== nativeSnapshot
      && preference === snapshot.value?.preference
      && preference === nativeSnapshot.value?.preference;
    if (selected && (preference === pendingBuiltIn || repeatedNativePreference)) {
      // The host can reapply the same native appearance when its settings refresh.
      pendingBuiltIn = undefined;
      const id = selected;
      queueMicrotask(() => {
        if (running && selected === id && theme.getTheme().preference === preference) theme.setTheme(id);
      });
      return;
    }
    showSkin(preference);
  });
  slots.inject('settings.general.item', () => slots.register({
    name: 'settings.general.item',
    id: packageName,
    order: 11,
  }, Gallery));

  let restored = false;
  function restoreSelection() {
    nativeSnapshot = nativeSettings.getSnapshot();
    const { status, value } = nativeSnapshot;
    if (restored || status === 'loading') return;
    restored = true;
    if (!selected && skins.has(saved?.id)) {
      if (isBuiltIn(value?.preference)) previous = value.preference;
      else if (isBuiltIn(saved.previous)) previous = saved.previous;
      theme.setTheme(saved.id);
    }
    showSkin(theme.getTheme().preference);
  }
  ctx.effect(() => nativeSettings.subscribe(restoreSelection), 'restore saved DSH One-Click Skins theme after settings load');
  restoreSelection();
}

return { apply, inject };
