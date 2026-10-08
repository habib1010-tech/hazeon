// Theme (light/dark) and motion (full/reduced) controls.
import { $$, root, reduced, t, emitTheme, currentTheme } from './env.js';

const THEME_COLOR = { dark: '#00141f', light: '#f4f1ea' };

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function hasStoredTheme() {
  try {
    return !!localStorage.getItem('theme');
  } catch {
    return false;
  }
}

function syncThemeControls(theme) {
  $$('[data-theme-toggle]').forEach((btn) => btn.setAttribute('aria-label', theme === 'dark' ? t('themeToLight') : t('themeToDark')));
  $$('[data-set-theme]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.setTheme === theme)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  syncThemeControls(theme);
  emitTheme(theme);
}

export function setTheme(theme, origin, persist = true) {
  if (theme === currentTheme()) return;
  if (persist) store('theme', theme);

  // Reveal the new theme in a circle growing from the control that was pressed.
  if (!document.startViewTransition || reduced || !origin) {
    applyTheme(theme);
    return;
  }
  const { x, y } = origin;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => applyTheme(theme));
  vt.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    })
    .catch(() => {});
}

const centerOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export function initPrefs() {
  syncThemeControls(currentTheme());

  $$('[data-theme-toggle]').forEach((btn) =>
    btn.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark', centerOf(btn)))
  );
  $$('[data-set-theme]').forEach((btn) => btn.addEventListener('click', () => setTheme(btn.dataset.setTheme, centerOf(btn))));

  // Follow the OS theme until the visitor picks one.
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!hasStoredTheme()) setTheme(e.matches ? 'light' : 'dark', null, false);
  });

  // Motion: stored, then the page reloads so every effect starts from a clean state.
  const motion = root.dataset.motion;
  $$('[data-set-motion]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.setMotion === motion));
    btn.addEventListener('click', () => {
      if (btn.dataset.setMotion === motion) return;
      store('motion', btn.dataset.setMotion);
      const url = new URL(location.href);
      url.searchParams.delete('motion');
      url.hash = '';
      try {
        sessionStorage.setItem('hz-scroll-footer', '1');
      } catch {
        /* storage blocked */
      }
      location.replace(url.toString());
    });
  });
}
