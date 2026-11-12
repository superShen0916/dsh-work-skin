const { createElement: h, useSyncExternalStore } = require('react');
const inject = ['theme', 'slots', 'configForms'];
const packageName = 'dsh-work-skin';
const productName = 'DSH 一键换肤';
const storageKey = `${packageName}:selected`;
const skins = new Map(catalog.map((skin) => [`${packageName}-${skin.id}`, skin]));
const asset = (filename) => require.asset?.(`plugins/${packageName}/assets/${filename}`);

function loadSelection() {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
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

function apply(ctx) {
  const { theme, slots } = ctx;
  const nativeSettings = ctx.configForms.get('ui-theme');
  const css = document.createElement('style');
  css.textContent = galleryCss;
  document.head.append(css);

  const saved = loadSelection();
  const isBuiltIn = (id) => ['system', 'light', 'dark'].includes(id);
  const startupPreference = theme.getTheme().preference;
  const installed = [...skins].map(([id, skin]) => theme.register({
    id,
    label: skin.name,
    colorScheme: 'light',
    tokens: themeTokens(skin),
  }));
  let previous = isBuiltIn(startupPreference) ? startupPreference : 'system';
  let selected = '';
  let pendingBuiltIn;
  let running = true;
  const listeners = new Set();

  function clearBackground() {
    delete document.body.dataset.dshWorkSkin;
    for (const property of ['image', 'wash', 'focus', 'compact-focus']) {
      document.body.style.removeProperty(`--dsh-work-skin-${property}`);
    }
  }

  function showSkin(preference) {
    if (!running) return;
    const skin = skins.get(preference);
    if (selected === (skin ? preference : '')) return;
    selected = skin ? preference : '';
    if (skin) {
      const url = asset(`${skin.id}.png`);
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
  const selection = () => selected;
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

  function Gallery() {
    const current = useSyncExternalStore(subscribe, selection);
    const active = skins.get(current);
    return h('section', { className: 'dsh-work-skin-gallery', 'aria-label': productName },
      h('div', { className: 'dsh-work-skin-gallery-heading' },
        h('span', null, productName),
        h('button', { type: 'button', onClick: reset, disabled: !active }, '恢复默认')),
      h('details', null,
        h('summary', null, active ? `当前皮肤 · ${active.name}` : '预览并切换皮肤'),
        typeof require.asset !== 'function' && h('p', { role: 'status' }, '此版本的 Harness 仅支持配色。升级到 0.2.2-rc.1 或更新版本可显示壁纸。'),
        h('div', { className: 'dsh-work-skin-gallery-grid' },
          [...skins].map(([id, skin]) => {
            const thumbnail = asset(`${skin.id}.jpg`);
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
      ),
    );
  }

  ctx.effect(() => () => {
    running = false;
    css.remove();
    clearBackground();
    if (skins.has(theme.getTheme().preference)) theme.setTheme(previous);
    for (const dispose of installed) dispose();
  }, 'remove DSH One-Click Skins resources');
  ctx.on('theme/change', ({ preference }) => {
    if (selected && preference === pendingBuiltIn) {
      // A just-saved native appearance can settle after the gallery selection.
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
    const { status, value } = nativeSettings.getSnapshot();
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
