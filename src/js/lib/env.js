// Shared page state: preferences resolved by the inline head script, the
// client-side strings, and tiny DOM helpers.

export const root = document.documentElement;
export const rtl = root.dir === 'rtl';
export const reduced = root.dataset.motion === 'reduced';
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

let strings = {};
try {
  strings = JSON.parse(document.getElementById('i18n')?.textContent || '{}');
} catch {
  strings = {};
}
export const t = (key, vars = {}) => (strings[key] || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
export const EMAIL = strings.email || '';

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smoothstep = (a, b, v) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

// Theme change listeners (3D scenes repaint with the new palette).
const themeListeners = new Set();
export const onThemeChange = (fn) => themeListeners.add(fn);
export const emitTheme = (theme) => themeListeners.forEach((fn) => fn(theme));
export const currentTheme = () => (root.dataset.theme === 'light' ? 'light' : 'dark');
