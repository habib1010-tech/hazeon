// Hero: loads the 3D mark (lazy chunk) and choreographs the scroll:
// copy fades out, the mark comes apart, parts get labelled, a statement lands.
import { gsap } from 'gsap';
import { $, $$, root, rtl, reduced, hasWebGL, onThemeChange, currentTheme, smoothstep } from './env.js';

export function initHero() {
  const hero = $('.hero');
  const canvas = $('#hero-canvas');
  if (!hero || !canvas) return;

  const parts = $$('.hero__parts .part');
  const content = $('.hero__content');
  const footer = $('.hero__footer');
  const statement = $('.hero__statement');
  let scene = null;

  // Label sizes are cached; reading layout every frame would be wasteful.
  let sizes = [];
  const measure = () => (sizes = parts.map((el) => ({ w: el.offsetWidth, h: el.offsetHeight })));
  let lastShow = -1;

  function placeParts(info) {
    const show = smoothstep(0.55, 0.92, info.explode);
    if (show === 0 && lastShow === 0) return;
    lastShow = show;
    if (!sizes.length || !sizes[0].w) measure();
    const maxX = hero.clientWidth;
    const boxes = info.parts.map((p, i) => {
      const { w, h } = sizes[i];
      const left = p.side < 0;
      let x = left ? p.x - 46 - w : p.x + 46;
      x = Math.max(10, Math.min(maxX - w - 10, x));
      return { i, x, y: p.y - h / 2, h, left };
    });
    // Keep labels on the same side from stacking on top of each other.
    [true, false].forEach((side) => {
      const group = boxes.filter((b) => b.left === side).sort((a, b) => a.y - b.y);
      for (let k = 1; k < group.length; k++) {
        const prev = group[k - 1];
        const min = prev.y + prev.h + 8;
        if (group[k].y < min) group[k].y = min;
      }
    });
    boxes.forEach((b) => {
      const el = parts[b.i];
      if (!el) return;
      el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0)`;
      el.style.opacity = show.toFixed(3);
      el.classList.toggle('is-left', b.left);
    });
  }

  const saveData = navigator.connection?.saveData === true;
  const fallback = () => {
    root.classList.add('no-webgl');
    canvas.remove();
  };

  if (!hasWebGL() || saveData) {
    fallback();
  } else {
    import('../webgl/hero.js')
      .then(({ createHeroScene }) => {
        scene = createHeroScene(canvas, {
          reducedMotion: reduced,
          theme: currentTheme(),
          rtl,
          onReady: () => canvas.classList.add('is-ready'),
          onFrame: reduced ? null : placeParts,
        });
        if (!scene) return fallback();
        scene.intro();
        onThemeChange((theme) => scene.setTheme(theme));
      })
      .catch(fallback);
  }

  if (reduced) return;

  window.addEventListener('resize', () => (sizes = []), { passive: true });
  onThemeChange(() => (sizes = []));

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => scene?.setProgress(self.progress),
    },
  });
  tl.to(footer, { opacity: 0, duration: 0.06 }, 0)
    .to(content, { opacity: 0, y: -70, duration: 0.2, ease: 'power1.in' }, 0.02)
    .fromTo(statement, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.6)
    .to({}, { duration: 0.24 }, 0.76);
}
