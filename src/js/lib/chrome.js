// Page chrome: smooth scroll, nav, mobile menu, in-page links, progress bar,
// crosshair cursor and magnetic buttons.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { $, $$, root, reduced, finePointer, t } from './env.js';

export let lenis = null;

export function initSmoothScroll() {
  if (reduced || !finePointer) return;
  lenis = new Lenis({
    duration: 1.1,
    easing: (x) => Math.min(1, 1.001 - Math.pow(2, -10 * x)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToTarget(target, immediate = false) {
  const el = target === '#top' || target === '#main' ? 0 : typeof target === 'string' ? document.getElementById(target.slice(1)) : target;
  if (el === null || el === undefined) return;
  if (lenis) {
    lenis.scrollTo(el, { duration: immediate ? 0 : 1.4, immediate, force: true });
  } else if (el === 0) {
    window.scrollTo({ top: 0, behavior: immediate || reduced ? 'auto' : 'smooth' });
  } else {
    el.scrollIntoView({ behavior: immediate || reduced ? 'auto' : 'smooth' });
  }
}

export function initAnchors(onBeforeScroll) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    const target = hash === '#top' ? document.body : document.getElementById(hash.slice(1));
    if (!target) return;
    e.preventDefault();
    onBeforeScroll?.(a);
    scrollToTarget(hash);
    history.replaceState(null, '', hash === '#top' ? location.pathname + location.search : hash);
    // Move keyboard focus with the scroll so the next Tab continues from there.
    if (hash !== '#top') {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
}

export function initNav() {
  const nav = $('#nav');
  if (!nav) return;
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 480 && !root.classList.contains('menu-open')) nav.classList.add('is-hidden');
    else if (goingUp || y < 480) nav.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  onScroll();

  // Highlight the link of the section in view.
  const links = $$('.nav__links a');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = map.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove('is-active'));
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  map.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) io.observe(section);
  });
}

export function initMobileMenu() {
  const burger = $('.nav__burger');
  const menu = $('#mobile-menu');
  if (!burger || !menu) return;
  const outside = [$('#main'), $('.footer')].filter(Boolean);
  let closeTimer = 0;

  const open = () => {
    clearTimeout(closeTimer);
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    root.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', t('menuClose'));
    outside.forEach((el) => (el.inert = true));
    lenis?.stop();
  };
  const close = (restoreFocus = true) => {
    if (menu.hidden) return;
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', t('menuOpen'));
    outside.forEach((el) => (el.inert = false));
    lenis?.start();
    closeTimer = setTimeout(() => (menu.hidden = true), 350);
    if (restoreFocus) burger.focus();
  };

  burger.addEventListener('click', () => (menu.hidden ? open() : close()));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) close(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) close();
  });
  matchMedia('(min-width: 1181px)').addEventListener('change', (e) => e.matches && close(false));
}

export function initProgress() {
  const bar = $('.progress span');
  if (!bar) return;
  gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}

// A drafting crosshair that trails the pointer and reads out coordinates in the hero.
export function initCursor() {
  const cursor = $('.cursor');
  if (!cursor || !finePointer || reduced) return;
  const label = $('span', cursor);
  const hero = $('.hero__sticky');
  const pos = { x: -100, y: -100 };
  const cur = { x: -100, y: -100 };
  let inHero = false;
  let shown = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!shown) {
        shown = true;
        cur.x = pos.x;
        cur.y = pos.y;
        cursor.classList.add('is-visible');
      }
    },
    { passive: true }
  );
  document.documentElement.addEventListener('pointerleave', () => {
    shown = false;
    cursor.classList.remove('is-visible');
  });
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-link', !!e.target.closest('a, button, label, input, textarea, .sphere'));
    inHero = !!(hero && hero.contains(e.target));
  });

  let lastText = '';
  gsap.ticker.add(() => {
    if (!shown) return;
    cur.x += (pos.x - cur.x) * 0.22;
    cur.y += (pos.y - cur.y) * 0.22;
    cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
    const text = inHero ? `X ${String(Math.round(pos.x)).padStart(4, '0')}  Y ${String(Math.round(pos.y)).padStart(4, '0')}` : '';
    if (text !== lastText) {
      label.textContent = text;
      lastText = text;
    }
  });
}

export function initMagnetic() {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    const strength = 0.22;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength * 1.2);
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)' }));
  });
}
