function rgb(value) {
  return value.startsWith('#')
    ? value.slice(1).match(/../g).map((part) => Number.parseInt(part, 16))
    : value.match(/[\d.]+/g).slice(0, 3).map(Number);
}

function cssRgb(channels) {
  return `rgb(${channels.join(', ')})`;
}

function mix(first, second, weight) {
  return first.map((value, index) => Math.round(value * (1 - weight) + second[index] * weight));
}

function luminance(channels) {
  const linear = channels.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrast(first, second) {
  const levels = [luminance(rgb(first)), luminance(rgb(second))].sort((a, b) => b - a);
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

function readable(color, backgrounds) {
  const original = rgb(color);
  const black = [0, 0, 0];
  for (let step = 0; step <= 20; step += 1) {
    const candidate = cssRgb(mix(original, black, step / 20));
    if (backgrounds.every((background) => contrast(candidate, background) >= 4.5)) return candidate;
  }
  return '#000000';
}

export function themeTokens(skin) {
  const colors = skin.colors;
  const base = colors['bg-primary'];
  const white = [255, 255, 255];
  const accent = rgb(colors.accent);
  const panel = (color, weight) => cssRgb(mix(rgb(color), white, weight));
  const tinted = (weight) => cssRgb(mix(rgb(base), accent, weight));
  const card = panel(colors['card-bg'], 0.32);
  const input = panel(colors['input-bg'], 0.45);
  const bubble = tinted(0.16);
  // The canvas wash keeps the darkest possible image pixel behind readable text.
  const darkestCanvas = cssRgb(mix([0, 0, 0], rgb(base), 0.65));
  const sidebar = panel(colors['sidebar-bg'], 0.04);
  const backgrounds = [base, card, input, bubble, darkestCanvas, sidebar];
  const primary = readable(colors['text-primary'], backgrounds);
  const secondary = readable(colors['text-secondary'], backgrounds);
  const tertiary = readable(colors['text-tertiary'], backgrounds);
  const brand = readable(colors.accent, [...backgrounds, '#ffffff']);
  return {
    '--dsw-alias-bg-base': base,
    '--dsw-alias-bg-layer-1': card,
    '--dsw-alias-bg-layer-2': colors['bg-secondary'],
    '--dsw-alias-bg-layer-3': colors['bg-tertiary'],
    '--dsw-alias-bg-module-platform': card,
    '--dsw-alias-border-l1': colors.border,
    '--dsw-alias-border-l2': tinted(0.29),
    '--dsw-alias-border-l3': tinted(0.39),
    '--dsw-alias-brand-text': brand,
    '--dsw-alias-label-primary': primary,
    '--dsw-alias-label-primary-bluish': primary,
    '--dsw-alias-label-secondary': secondary,
    '--dsw-alias-label-tertiary': tertiary,
    '--dsw-alias-label-caption': tertiary,
    '--dsw-alias-link': brand,
    '--dsw-alias-state-business-primary': brand,
    '--dsw-alias-state-business-tertiary': tinted(0.16),
    '--dsw-alias-markdown-code-block': card,
    '--dsw-alias-markdown-code-block-banner': colors['bg-secondary'],
    '--dsw-alias-markdown-inline-code': tinted(0.12),
    '--dsw-specific-sidebar-fill': sidebar,
    '--dsw-specific-sidebar-nav-item-hover': tinted(0.12),
    '--dsw-specific-sidebar-nav-item-active': tinted(0.23),
    '--dsw-specific-sidebar-nav-item-active-accent': brand,
    '--dsw-specific-bubble': bubble,
    '--dsw-specific-bubble-highlight': colors['selection-color'],
    '--dsw-specific-input-major': input,
    '--dsw-specific-menu': card,
    '--dsw-elevation-stroke-color': colors.border,
    '--dsw-focus-ring-color': brand,
  };
}
