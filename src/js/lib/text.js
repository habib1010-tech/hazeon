// Text effects: word-split headings, reveal-on-scroll, the studio word scrub
// and number counters.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, reduced } from './env.js';

// Wraps every word of an element in spans, walking child nodes so inline
// markup such as <b> or <mark> survives.
function splitWords(el, makeWord) {
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        if (parts.every((p) => !p.trim())) return;
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (!part.trim()) frag.append(document.createTextNode(part));
          else {
            const w = makeWord(part);
            words.push(w);
            frag.append(w);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
  return words;
}

export function initSplitHeadings() {
  $$('[data-split]').forEach((el) => {
    // Screen readers get the sentence once, not word by word.
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    let i = 0;
    splitWords(el, (text) => {
      const outer = document.createElement('span');
      outer.className = 'w';
      outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.textContent = text;
      outer.style.setProperty('--i', String(i++));
      outer.append(inner);
      return outer;
    });
  });
}

export function initReveals() {
  const targets = $$('[data-reveal], [data-split]');
  // Stagger siblings that reveal together (cards in a grid, list items).
  const groups = new Map();
  $$('[data-reveal]').forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });
  groups.forEach((list) => list.length > 1 && list.forEach((el, i) => el.style.setProperty('--d', String(i % 4))));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  targets.forEach((el) => io.observe(el));
}

// The studio paragraph lights up word by word as it scrolls through.
export function initWordScrub() {
  $$('[data-words]').forEach((el) => {
    const words = splitWords(el, (text) => {
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = text;
      return s;
    });
    if (reduced) {
      words.forEach((w) => w.classList.add('is-lit'));
      return;
    }
    let lit = 0;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      end: 'bottom 48%',
      onUpdate: (self) => {
        const n = Math.round(self.progress * words.length);
        if (n === lit) return;
        words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
        lit = n;
      },
    });
  });
}

export function initCounters() {
  if (reduced) return;
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const state = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          v: end,
          duration: end > 10 ? 1.6 : 0.9,
          ease: 'power2.out',
          onUpdate: () => (el.textContent = String(Math.round(state.v))),
        }),
    });
  });
}
