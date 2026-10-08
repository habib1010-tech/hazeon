// HAZEON — site interactions.
// Loads after GSAP, ScrollTrigger and Lenis (deferred classic scripts run first).

const CONTACT_EMAIL = 'hello@hazeon.dev';

const root = document.documentElement;
// Visitors who ask their OS for reduced motion get a calmer experience
// (no scroll-jacking or auto-moving content). `?motion=full` / `?motion=reduced`
// override the system setting, which is handy for previews.
const reducedMotion = root.classList.contains('reduced-motion');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

let lenis = null;
let heroScene = null;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function boot() {
  initSmoothScroll();
  initHero();
  initNav();
  initMobileMenu();
  initAnchors();
  initScrollProgress();
  initSplitHeadings();
  initReveals();
  initMarquee();
  initManifesto();
  initCounters();
  initTilt();
  initMagnetic();
  initCursor();
  initProcess();
  initTerminal();
  initTagSphere();
  initAccordions();
  initContactForm();
  initContactGradient();
  initActiveLinks();
  setYear();
  runPreloader();
}

/* ------------------------------------------------------------------------
   Smooth scrolling (Lenis) wired into GSAP's ticker
   ------------------------------------------------------------------------ */
function initSmoothScroll() {
  if (reducedMotion || !window.Lenis) return;
  lenis = new window.Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.4,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target, immediate = false) {
  const el = typeof target === 'string' ? (target === '#top' ? 0 : $(target)) : target;
  if (el === null || el === undefined) return;
  if (lenis) {
    lenis.scrollTo(el, { duration: immediate ? 0 : 1.5, immediate, force: true });
  } else if (el === 0) {
    window.scrollTo({ top: 0, behavior: immediate || reducedMotion ? 'auto' : 'smooth' });
  } else {
    el.scrollIntoView({ behavior: immediate || reducedMotion ? 'auto' : 'smooth' });
  }
}

/* ------------------------------------------------------------------------
   Preloader
   ------------------------------------------------------------------------ */
let heroReady = null;

function runPreloader() {
  const preloader = $('#preloader');
  const countEl = $('#preloader-count');
  const barEl = $('#preloader-bar');
  window.scrollTo(0, 0);

  if (!preloader) {
    startIntro();
    return;
  }

  const tasks = [
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((res) => (document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true }))),
    heroReady || Promise.resolve(),
  ];
  let done = 0;
  let target = 8;
  let shown = 0;
  let finished = false;
  const minDuration = reducedMotion ? 700 : 1500;
  const startedAt = performance.now();

  tasks.forEach((p) =>
    Promise.resolve(p)
      .catch(() => {})
      .then(() => {
        done += 1;
        target = 8 + (done / tasks.length) * 92;
      })
  );

  const tick = () => {
    const elapsed = performance.now() - startedAt;
    const timeCap = Math.min(100, (elapsed / minDuration) * 100);
    shown += (Math.min(target, timeCap) - shown) * 0.12;
    if (target >= 100 && timeCap >= 100 && shown > 99.4) shown = 100;
    countEl.textContent = Math.round(shown);
    barEl.style.transform = `scaleX(${shown / 100})`;
    if (shown >= 100) finish();
    else if (!finished) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Never trap visitors behind the loader.
  setTimeout(finish, 7000);

  function finish() {
    if (finished) return;
    finished = true;
    countEl.textContent = '100';
    barEl.style.transform = 'scaleX(1)';
    preloader.classList.add('is-loaded');
    gsap
      .timeline({ delay: reducedMotion ? 0 : 0.45 })
      .to(preloader, {
        clipPath: 'inset(0 0 100% 0)',
        duration: reducedMotion ? 0.01 : 1.1,
        ease: 'expo.inOut',
        onStart: () => {
          preloader.classList.add('is-done');
          startIntro();
        },
        onComplete: () => preloader.remove(),
      });
  }
}

let introStarted = false;
function startIntro() {
  introStarted = true;
  if (lenis) lenis.start();
  heroScene?.intro();

  const lines = $$('.hero__line-inner');
  const fades = $$('[data-hero-fade]');
  if (reducedMotion) {
    gsap.set(lines, { y: 0, yPercent: 0, opacity: 0 });
    gsap.to(lines, { opacity: 1, duration: 0.8, stagger: 0.1, delay: 0.2 });
    gsap.to(fades, { opacity: 1, duration: 0.8, stagger: 0.08, delay: 0.4 });
  } else {
    // y: 0 clears the px offset GSAP parses from the CSS start state.
    gsap.set(lines, { y: 0, yPercent: 110 });
    gsap.to(lines, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.11, delay: 0.25 });
    gsap.fromTo(fades, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.55 });
  }
  startRotator();

  // Respect deep links such as /#careers once the page is ready.
  if (location.hash && location.hash.length > 1) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => scrollToTarget(target), 900);
  }
  setTimeout(() => ScrollTrigger.refresh(), 300);
}

function startRotator() {
  const words = $$('.rotator__word');
  if (words.length < 2) return;
  let index = 0;
  const shift = reducedMotion ? 0 : 100;
  gsap.set(words, { yPercent: shift, opacity: 0 });
  gsap.set(words[0], { yPercent: 0, opacity: 1 });
  setInterval(() => {
    if (document.hidden) return;
    const current = words[index];
    index = (index + 1) % words.length;
    const next = words[index];
    gsap.to(current, { yPercent: -shift, opacity: 0, duration: 0.7, ease: 'expo.inOut' });
    gsap.fromTo(next, { yPercent: shift, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.inOut' });
  }, reducedMotion ? 3200 : 2600);
}

/* ------------------------------------------------------------------------
   Hero: 3D scene + scroll choreography
   ------------------------------------------------------------------------ */
function initHero() {
  const canvas = $('#hero-canvas');
  heroReady = import('./webgl/hero.js')
    .then(({ createHeroScene }) => {
      heroScene = createHeroScene(canvas, { reducedMotion });
      if (!heroScene) throw new Error('WebGL unavailable');
      // Slow connection: the preloader may already be gone.
      if (introStarted) heroScene.intro();
    })
    .catch(() => {
      root.classList.add('no-webgl');
      canvas.remove();
    });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => heroScene?.setProgress(self.progress),
    },
  });
  tl.to('.hero__content', { y: -140, opacity: 0, ease: 'power1.in', duration: 0.32 }, 0)
    .to('.hero__footer .scroll-cue, .hero__tags', { opacity: 0, duration: 0.12 }, 0)
    .to('.hero__bg', { opacity: 0.55, duration: 0.6 }, 0)
    .fromTo('.hero__statement', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.24 }, 0.42)
    .to('.hero__statement', { opacity: 0, y: -80, ease: 'power1.in', duration: 0.2 }, 0.8)
    .to({}, { duration: 0.05 });

  // Portrait screens: the mark sits behind the copy, so keep it dim until the
  // copy scrolls away.
  gsap.matchMedia().add('(max-aspect-ratio: 21/20)', () => {
    gsap.fromTo(
      canvas,
      { opacity: 0.38 },
      { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '22% top', scrub: true } }
    );
  });
}

/* ------------------------------------------------------------------------
   Navigation
   ------------------------------------------------------------------------ */
function initNav() {
  const nav = $('#nav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (!nav.classList.contains('is-open')) {
      if (goingDown && y > 700) nav.classList.add('is-hidden');
      else if (goingUp || y < 700) nav.classList.remove('is-hidden');
    }
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const nav = $('#nav');
  const burger = $('.nav__burger');
  const menu = $('#mobile-menu');
  if (!burger || !menu) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) {
      nav.classList.remove('is-hidden');
      lenis?.stop();
      document.body.style.overflow = 'hidden';
      setTimeout(() => $('a', menu)?.focus({ preventScroll: true }), 350);
    } else {
      lenis?.start();
      document.body.style.overflow = '';
    }
  };

  burger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => e.matches && setOpen(false));
}

function initAnchors() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#' || href.length < 2) return;
    const target = href === '#top' ? 0 : document.getElementById(href.slice(1));
    if (target === null) return;
    e.preventDefault();

    // Plan CTAs pre-fill the contact form.
    if (link.dataset.subject) prefillContact(link.dataset.subject);

    // Wait a beat if the mobile menu is closing.
    const delay = $('#mobile-menu.is-open') ? 350 : 0;
    setTimeout(() => scrollToTarget(target === 0 ? '#top' : target), delay);
    if (target !== 0 && href !== '#main') history.replaceState(null, '', href);
    if (href === '#main') $('#main').focus?.({ preventScroll: true });
  });
}

function initScrollProgress() {
  const bar = $('.scroll-progress span');
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initActiveLinks() {
  $$('.nav__links a').forEach((link) => {
    const section = document.getElementById(link.getAttribute('href').slice(1));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });
}

/* ------------------------------------------------------------------------
   Text effects
   ------------------------------------------------------------------------ */
const escapeHtml = (str) => str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Splits an element's text into animatable word spans while keeping the
// original sentence available to screen readers.
function splitWords(el, wrapClass) {
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  const words = text
    .split(' ')
    .map((w) => escapeHtml(w))
    .map((w) => (wrapClass === 'split-word' ? `<span class="split-word"><span>${w}</span></span>` : `<span class="${wrapClass}">${w}</span>`))
    .join(' ');
  el.innerHTML = `<span class="sr-only">${escapeHtml(text)}</span><span aria-hidden="true">${words}</span>`;
  return $$(wrapClass === 'split-word' ? '.split-word > span' : `.${wrapClass}`, el);
}

function initSplitHeadings() {
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el, 'split-word');
    const from = reducedMotion ? { opacity: 0 } : { yPercent: 115, rotate: 4 };
    const to = reducedMotion
      ? { opacity: 1, duration: 0.8, stagger: 0.04 }
      : { yPercent: 0, rotate: 0, duration: 1.15, ease: 'expo.out', stagger: 0.06 };
    gsap.set(words, from);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(words, to),
    });
  });
}

function initReveals() {
  const items = $$('[data-reveal]');
  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => batch.forEach((el, i) => setTimeout(() => el.classList.add('is-revealed'), i * 90)),
  });
}

function initManifesto() {
  const el = $('[data-words]');
  if (!el) return;
  const words = splitWords(el, 'word');
  const keys = ['outcomes.', 'secure', 'scale,', '100%', 'yours.'];
  words.forEach((w) => keys.includes(w.textContent) && w.classList.add('is-key'));
  gsap.to(words, {
    opacity: 1,
    ease: 'none',
    stagger: 0.1,
    scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true },
  });
}

function initCounters() {
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: 'expo.out',
          onUpdate: () => (el.textContent = Math.round(obj.v)),
        }),
    });
  });
}

/* ------------------------------------------------------------------------
   Marquee driven by scroll velocity
   ------------------------------------------------------------------------ */
function initMarquee() {
  const rows = $$('[data-marquee]');
  const tweens = rows.map((row) => {
    const track = $('.marquee__track', row);
    const copies = Math.max(1, Math.ceil((window.innerWidth * 1.5) / Math.max(track.offsetWidth, 1)));
    const tracks = [track];
    for (let i = 0; i < copies; i++) {
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
      tracks.push(clone);
    }
    const dir = parseFloat(row.dataset.marquee);
    if (reducedMotion) return null;
    return gsap.fromTo(
      tracks,
      { xPercent: dir > 0 ? 0 : -100 },
      { xPercent: dir > 0 ? -100 : 0, duration: dir > 0 ? 38 : 46, ease: 'none', repeat: -1 }
    );
  });
  if (reducedMotion) return;

  let boost = { v: 1 };
  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const v = Math.min(Math.abs(self.getVelocity()) / 220, 6);
      gsap.to(boost, {
        v: 1 + v,
        duration: 0.25,
        overwrite: true,
        onUpdate: () => tweens.forEach((t) => t && t.timeScale(boost.v)),
        onComplete: () =>
          gsap.to(boost, { v: 1, duration: 1.2, ease: 'power2.out', onUpdate: () => tweens.forEach((t) => t && t.timeScale(boost.v)) }),
      });
    },
  });
}

/* ------------------------------------------------------------------------
   Pointer effects: 3D tilt, magnetic buttons, cursor
   ------------------------------------------------------------------------ */
function initTilt() {
  if (!finePointer || reducedMotion) return;
  $$('[data-tilt]').forEach((card) => {
    const max = card.classList.contains('plan') ? 5 : 8;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const strength = 0.28;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength * 1.3);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

function initCursor() {
  if (!finePointer || reducedMotion) return;
  root.classList.add('has-cursor');
  const cursor = $('.cursor');
  const ring = $('.cursor__ring');
  const dot = $('.cursor__dot');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { ...pos };
  let shown = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (!shown) {
        shown = true;
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        cursor.classList.remove('is-hidden');
      }
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => {
    shown = false;
    cursor.classList.add('is-hidden');
  });
  document.addEventListener('pointerover', (e) => {
    const interactive = e.target.closest('a, button, label, input, textarea, [data-tilt], .sphere');
    cursor.classList.toggle('is-hover', !!interactive);
  });
  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
  });
}

/* ------------------------------------------------------------------------
   Process: pinned horizontal scroll with 3D card entrance
   ------------------------------------------------------------------------ */
function initProcess() {
  const section = $('.process');
  const track = $('.process__track');
  const bar = $('.process__progress span');
  if (!section || !track || reducedMotion) return;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress})`),
      },
    });
    $$('.step', track).forEach((step) => {
      gsap.fromTo(
        step,
        { rotateY: -32, z: -160, opacity: 0.25, transformPerspective: 1400, transformOrigin: '0% 50%' },
        {
          rotateY: 0,
          z: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 105%', end: 'left 60%', scrub: true },
        }
      );
    });
  });
}

/* ------------------------------------------------------------------------
   Terminal: typed deployment log
   ------------------------------------------------------------------------ */
function initTerminal() {
  const code = $('#terminal code');
  if (!code) return;
  const lines = [
    { type: 'cmd', text: 'hazeon deploy --env=production' },
    { type: 'out', html: '<span class="t-dim">→</span> Installing dependencies ........ <span class="t-ok">done</span>' },
    { type: 'out', html: '<span class="t-dim">→</span> Running 248 unit &amp; e2e tests ... <span class="t-ok">✓ passed</span>' },
    { type: 'out', html: '<span class="t-dim">→</span> Secret scan &amp; dependency audit <span class="t-ok">✓ clean</span>' },
    { type: 'out', html: '<span class="t-dim">→</span> AI code review ................. <span class="t-ok">✓ 0 blockers</span>' },
    { type: 'out', html: '<span class="t-dim">→</span> Building container image ....... <span class="t-ok">✓ 38.2s</span>' },
    { type: 'out', html: '<span class="t-dim">→</span> Rolling out to production ...... <span class="t-ok">✓ healthy</span>' },
    { type: 'out', html: '' },
    { type: 'out', html: '<span class="t-hl">✦ Live in 1m 12s</span> <span class="t-dim">·</span> <span class="t-accent">https://your-product.com</span>' },
  ];
  const caret = '<span class="terminal__caret"></span>';
  const prompt = '<span class="t-prompt">$</span> ';

  let run = 0;
  let active = false;
  const wait = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === run ? res() : rej()), ms));

  async function play() {
    const id = ++run;
    try {
      let html = '';
      for (const line of lines) {
        if (line.type === 'cmd') {
          for (let i = 1; i <= line.text.length; i++) {
            code.innerHTML = html + prompt + line.text.slice(0, i) + caret;
            await wait(32 + Math.random() * 40, id);
          }
          html += prompt + line.text + '\n';
          await wait(380, id);
        } else {
          html += line.html + '\n';
          code.innerHTML = html + caret;
          await wait(line.html ? 420 + Math.random() * 380 : 200, id);
        }
      }
      await wait(5200, id);
      if (active) play();
    } catch (e) {
      /* superseded run */
    }
  }

  ScrollTrigger.create({
    trigger: code,
    start: 'top 85%',
    end: 'bottom top',
    onEnter: () => {
      active = true;
      play();
    },
    onEnterBack: () => {
      if (!active) {
        active = true;
        play();
      }
    },
    onLeave: () => (active = false),
    onLeaveBack: () => (active = false),
  });
}

/* ------------------------------------------------------------------------
   3D tag sphere (DOM-based, draggable)
   ------------------------------------------------------------------------ */
function initTagSphere() {
  const sphere = $('#tag-sphere');
  if (!sphere) return;
  const tags = $$('span', sphere);

  const n = tags.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points = tags.map((_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * golden;
    return { x: Math.cos(phi) * r, y, z: Math.sin(phi) * r };
  });

  let radius = 150;
  const idleX = reducedMotion ? 0 : 0.0025; // idle spin around Y
  const idleY = reducedMotion ? 0 : 0.0012; // idle spin around X
  let vx = reducedMotion ? 0.35 : idleX;
  let vy = reducedMotion ? 0.2 : idleY;
  let dragging = false;
  let last = null;
  let visible = false;

  const resize = () => {
    radius = Math.min(sphere.clientWidth, sphere.clientHeight) * 0.4;
  };
  new ResizeObserver(resize).observe(sphere);
  resize();

  const render = () => {
    const cy = Math.cos(vx), sy = Math.sin(vx);
    const cx = Math.cos(vy), sx = Math.sin(vy);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      // rotate around Y
      let x = p.x * cy - p.z * sy;
      let z = p.x * sy + p.z * cy;
      // rotate around X
      let y = p.y * cx - z * sx;
      z = p.y * sx + z * cx;
      p.x = x;
      p.y = y;
      p.z = z;
      const depth = (z + 1) / 2; // 0 back, 1 front
      const scale = 0.62 + depth * 0.55;
      const el = tags[i];
      el.style.transform = `translate(-50%, -50%) translate3d(${(x * radius).toFixed(1)}px, ${(y * radius).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      el.style.opacity = (0.18 + depth * 0.82).toFixed(3);
      el.style.zIndex = String(Math.round(depth * 100));
    }
  };

  gsap.ticker.add(() => {
    if (!visible) return;
    if (!dragging) {
      // ease back toward a gentle idle spin
      vx += (idleX - vx) * (reducedMotion ? 0.12 : 0.02);
      vy += (idleY - vy) * (reducedMotion ? 0.12 : 0.02);
    }
    render();
  });

  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sphere);

  sphere.addEventListener('pointerdown', (e) => {
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
    sphere.setPointerCapture(e.pointerId);
  });
  sphere.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    vx = (e.clientX - last.x) * 0.006;
    vy = -(e.clientY - last.y) * 0.006;
    last = { x: e.clientX, y: e.clientY };
  });
  const release = () => {
    dragging = false;
    last = null;
  };
  sphere.addEventListener('pointerup', release);
  sphere.addEventListener('pointercancel', release);
  render();
}

/* ------------------------------------------------------------------------
   Accordions (roles + FAQ): one open at a time per group
   ------------------------------------------------------------------------ */
let refreshTimer = 0;
function scheduleRefresh() {
  if (!ScrollTrigger) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 650);
}

function initAccordions() {
  $$('[data-accordion]').forEach((group) => {
    const buttons = $$('button[aria-controls]', group);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        buttons.forEach((other) => {
          const panel = document.getElementById(other.getAttribute('aria-controls'));
          const isTarget = other === btn;
          other.setAttribute('aria-expanded', String(isTarget && open));
          panel?.classList.toggle('is-open', isTarget && open);
        });
        scheduleRefresh();
      });
    });
  });
}

/* ------------------------------------------------------------------------
   Contact form → pre-filled email (no backend required)
   ------------------------------------------------------------------------ */
function prefillContact(subject) {
  const form = $('#contact-form');
  if (!form) return;
  const map = { 'MVP Sprint': 'MVP', 'AI Automation Audit': 'AI agents' };
  const chip = map[subject] && form.querySelector(`input[name="needs"][value="${map[subject]}"]`);
  if (chip) chip.checked = true;
  const msg = form.querySelector('#f-message');
  if (msg && !msg.value.trim()) msg.value = `Hi HAZEON team, I'm interested in the ${subject}. `;
}

function initContactForm() {
  const form = $('#contact-form');
  const note = $('#form-note');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const company = (data.get('company') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();
    const needs = data.getAll('needs').map(String);

    const checks = [
      ['f-name', name.length > 1],
      ['f-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)],
      ['f-message', message.length > 5],
    ];
    let firstInvalid = null;
    checks.forEach(([id, ok]) => {
      const field = document.getElementById(id).closest('.field');
      field.classList.toggle('is-invalid', !ok);
      if (!ok && !firstInvalid) firstInvalid = document.getElementById(id);
    });
    if (firstInvalid) {
      note.textContent = 'Please fill in your name, a valid email and a few words about your project.';
      note.className = 'form__note is-error';
      firstInvalid.focus();
      return;
    }

    const subject = `New project inquiry — ${name}${company ? ` (${company})` : ''}`;
    const body = [
      'Hi HAZEON team,',
      '',
      message,
      '',
      `What I need: ${needs.length ? needs.join(', ') : '—'}`,
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${company || '—'}`,
    ].join('\n');

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.innerHTML = `Opening your email app… If nothing happens, write to <a class="link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`;
    note.className = 'form__note is-success';
  });

  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'));
}

/* ------------------------------------------------------------------------
   Contact background shader (lazy-loaded near the viewport)
   ------------------------------------------------------------------------ */
function initContactGradient() {
  const canvas = $('#contact-canvas');
  if (!canvas || root.classList.contains('no-webgl')) return;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      import('./webgl/gradient.js')
        .then(({ createGradient }) => {
          if (!createGradient(canvas, { reducedMotion })) canvas.remove();
        })
        .catch(() => canvas.remove());
    },
    { rootMargin: '600px 0px' }
  );
  io.observe(canvas);
}

function setYear() {
  const el = $('#year');
  if (el) el.textContent = String(new Date().getFullYear());
}

/* ------------------------------------------------------------------------
   Graceful fallback: if the animation libraries failed to load, show the
   page as plain, fully readable content.
   ------------------------------------------------------------------------ */
if (!gsap || !ScrollTrigger) {
  root.classList.remove('js');
  $('#preloader')?.remove();
  initAccordions();
  initContactForm();
  setYear();
} else {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  boot();
}
