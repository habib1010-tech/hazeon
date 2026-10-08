// Section behaviours: ticker, anatomy stack, service illustrations, the RAG
// walkthrough + chat demo, the Gantt plan, the tag sphere and the contact map.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, reduced, clamp, hasWebGL, onThemeChange, currentTheme } from './env.js';

export function initTicker() {
  const row = $('[data-marquee]');
  if (!row || reduced) return;
  const track = $('.ticker__track', row);
  const clone = track.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  row.append(clone);
  row.classList.add('is-running');
}

// Plays CSS illustration loops only while they are on screen.
export function initInView() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting)),
    { rootMargin: '-5% 0px' }
  );
  $$('[data-inview], [data-assistant]').forEach((el) => io.observe(el));
}

// Exploded layer stack: the step in view picks the highlighted plate.
export function initAnatomy() {
  const stack = $('[data-stack]');
  const steps = $$('.layer-step');
  if (!stack || !steps.length) return;
  const plates = $$('.plate', stack);

  const setActive = (layer) => {
    stack.classList.toggle('has-active', layer != null);
    plates.forEach((p) => p.classList.toggle('is-active', p.dataset.layer === layer));
    steps.forEach((s) => s.classList.toggle('is-active', s.dataset.layer === layer));
  };

  if (reduced) return;

  gsap.fromTo(
    stack,
    { '--explode': 0 },
    {
      '--explode': 1,
      ease: 'none',
      scrollTrigger: { trigger: '.anatomy__body', start: 'top 85%', end: 'top 25%', scrub: 0.6 },
    }
  );

  steps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 62%',
      end: 'bottom 62%',
      onToggle: (self) => {
        if (self.isActive) setActive(step.dataset.layer);
      },
    });
  });
  ScrollTrigger.create({
    trigger: '.anatomy__steps',
    start: 'top 62%',
    end: 'bottom 62%',
    onLeaveBack: () => setActive(null),
  });
}

// Chat demo: question, retrieval, typed answer, then the sources.
export function initChat() {
  const chat = $('.chat');
  if (!chat) return;
  const typed = $('[data-type]', chat);
  const full = typed.textContent.trim();
  const stages = ['stage-1', 'stage-2', 'stage-3', 'stage-4'];

  if (reduced) {
    chat.classList.add(...stages);
    return;
  }

  let run = 0;
  let visible = false;
  const wait = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === run ? res() : rej()), ms));

  async function play() {
    const id = ++run;
    try {
      chat.classList.remove(...stages);
      typed.textContent = '';
      await wait(400, id);
      chat.classList.add('stage-1');
      await wait(900, id);
      chat.classList.add('stage-2');
      await wait(1500, id);
      chat.classList.add('stage-3');
      const caret = document.createElement('span');
      caret.className = 'caret';
      const chars = Array.from(full);
      for (let i = 1; i <= chars.length; i++) {
        typed.textContent = chars.slice(0, i).join('');
        typed.append(caret);
        await wait(chars[i - 1] === ' ' ? 30 : 18 + Math.random() * 22, id);
      }
      caret.remove();
      await wait(250, id);
      chat.classList.add('stage-4');
      await wait(7000, id);
      if (visible) play();
    } catch {
      /* superseded by a newer run */
    }
  }

  new IntersectionObserver(
    ([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) play();
    },
    { threshold: 0.35 }
  ).observe(chat);
}

// Gantt: scroll-driven while pinned, or plays once when space is tight.
export function initGantt() {
  const section = $('.process');
  const gantt = $('[data-gantt]');
  if (!section || !gantt) return;
  const rows = $$('.gantt__row', gantt);
  const demos = $$('.gantt__track .gantt__demo', gantt);
  const markStart = $('.gantt__mark--start', gantt);
  const markLaunch = $('.gantt__mark--launch', gantt);
  const phases = $$('.phase', section);
  const phaseStarts = [0, 1, 2, 5, 7.5, 8.25];
  const demoWeeks = [3, 4, 5, 6, 7];
  let current = -1;

  function setWeek(w) {
    gantt.style.setProperty('--week', w.toFixed(3));
    let active = 0;
    phaseStarts.forEach((s, i) => w >= s && (active = i));
    rows.forEach((row, i) => {
      const s = Number(row.dataset.start);
      const e = Number(row.dataset.end);
      row.style.setProperty('--p', clamp((w - s) / (e - s)).toFixed(3));
      row.classList.toggle('is-active', i === active && w > 0.02);
      row.classList.toggle('is-done', w >= e);
    });
    demos.forEach((d, i) => d.classList.toggle('is-on', w >= demoWeeks[i]));
    markStart?.classList.toggle('is-on', w > 0.05);
    markLaunch?.classList.toggle('is-on', w >= 8);
    if (active !== current) {
      phases.forEach((p, i) => p.classList.toggle('is-active', i === active));
      current = active;
    }
  }

  const sticky = $('.process__sticky', section);
  const fits = () => innerHeight >= 680 && innerWidth >= 700 && sticky.scrollHeight <= innerHeight + 4;

  if (reduced) {
    section.classList.add('is-static');
    setWeek(9);
    return;
  }

  let trigger = null;
  let played = false;
  function setup() {
    trigger?.kill();
    section.classList.remove('is-static');
    if (fits()) {
      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => setWeek(clamp((self.progress - 0.03) / 0.92) * 9),
      });
      setWeek(trigger.progress * 9);
    } else {
      section.classList.add('is-static');
      if (!played) setWeek(0);
      trigger = ScrollTrigger.create({
        trigger: gantt,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          played = true;
          const state = { w: 0 };
          gsap.to(state, { w: 9, duration: 4, ease: 'power1.inOut', onUpdate: () => setWeek(state.w) });
        },
      });
    }
  }
  setup();
  // The first measurement can happen before web fonts are in.
  document.fonts?.ready.then(() => {
    setup();
    ScrollTrigger.refresh();
  });

  let width = innerWidth;
  let height = innerHeight;
  let timer = 0;
  window.addEventListener('resize', () => {
    // Ignore mobile toolbar show/hide, which only changes the height slightly.
    if (Math.abs(innerWidth - width) < 2 && Math.abs(innerHeight - height) < 120) return;
    width = innerWidth;
    height = innerHeight;
    clearTimeout(timer);
    timer = setTimeout(() => {
      setup();
      ScrollTrigger.refresh();
    }, 200);
  });
}

// Draggable sphere of tags, positioned with CSS transforms.
export function initSphere() {
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

  let radius = 160;
  const idleX = reduced ? 0 : 0.0028;
  const idleY = reduced ? 0 : 0.0011;
  let vx = reduced ? 0.4 : idleX;
  let vy = reduced ? 0.25 : idleY;
  let dragging = false;
  let last = null;
  let visible = false;

  const resize = () => (radius = Math.min(sphere.clientWidth, sphere.clientHeight) * 0.38);
  new ResizeObserver(resize).observe(sphere);
  resize();

  const render = () => {
    const cy = Math.cos(vx);
    const sy = Math.sin(vx);
    const cx = Math.cos(vy);
    const sx = Math.sin(vy);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const x = p.x * cy - p.z * sy;
      let z = p.x * sy + p.z * cy;
      const y = p.y * cx - z * sx;
      z = p.y * sx + z * cx;
      p.x = x;
      p.y = y;
      p.z = z;
      const depth = (z + 1) / 2;
      const el = tags[i];
      el.style.transform = `translate(-50%, -50%) translate3d(${(x * radius).toFixed(1)}px, ${(y * radius).toFixed(1)}px, 0) scale(${(0.6 + depth * 0.55).toFixed(3)})`;
      el.style.opacity = (0.16 + depth * 0.84).toFixed(3);
      el.style.zIndex = String(Math.round(depth * 100));
      el.classList.toggle('is-hot', depth > 0.93);
    }
  };

  gsap.ticker.add(() => {
    if (!visible) return;
    if (!dragging) {
      vx += (idleX - vx) * (reduced ? 0.12 : 0.02);
      vy += (idleY - vy) * (reduced ? 0.12 : 0.02);
      if (reduced && Math.abs(vx) < 1e-4 && Math.abs(vy) < 1e-4) return;
    }
    render();
  });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sphere);

  sphere.addEventListener('pointerdown', (e) => {
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
    sphere.classList.add('is-dragging');
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
    sphere.classList.remove('is-dragging');
  };
  sphere.addEventListener('pointerup', release);
  sphere.addEventListener('pointercancel', release);
  render();
}

export function initContactMap() {
  const canvas = $('#contact-canvas');
  if (!canvas) return;
  if (!hasWebGL() || navigator.connection?.saveData === true) {
    canvas.remove();
    return;
  }
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      import('../webgl/topo.js')
        .then(({ createTopo }) => {
          const map = createTopo(canvas, { reducedMotion: reduced, theme: currentTheme() });
          if (!map) return canvas.remove();
          onThemeChange((theme) => map.setTheme(theme));
        })
        .catch(() => canvas.remove());
    },
    { rootMargin: '600px 0px' }
  );
  io.observe(canvas);
}
