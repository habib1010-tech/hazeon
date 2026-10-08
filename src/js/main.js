// HAZEON site entry. Bundled by esbuild (see scripts/build.mjs); three.js
// scenes are split into chunks that load only when needed.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { root } from './lib/env.js';
import { initPrefs } from './lib/prefs.js';
import { initSmoothScroll, initAnchors, initNav, initMobileMenu, initProgress, initCursor, initMagnetic, scrollToTarget } from './lib/chrome.js';
import { initHero } from './lib/hero.js';
import { initSplitHeadings, initReveals, initWordScrub, initCounters } from './lib/text.js';
import { initTicker, initInView, initAnatomy, initChat, initGantt, initSphere, initContactMap } from './lib/sections.js';
import { initAccordions, initContactForm } from './lib/forms.js';

// Tells the head script that JS is alive, so hidden-until-revealed content stays managed here.
root.classList.add('ready');

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const safely = (fn) => {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
};

[
  initPrefs,
  initSmoothScroll,
  initAnchors,
  initNav,
  initMobileMenu,
  initProgress,
  initHero,
  initSplitHeadings,
  initReveals,
  initWordScrub,
  initCounters,
  initTicker,
  initInView,
  initAnatomy,
  initChat,
  initGantt,
  initSphere,
  initAccordions,
  initContactForm,
  initContactMap,
  initCursor,
  initMagnetic,
].forEach(safely);

// Positions depend on web fonts; measure again once they are in.
document.fonts?.ready.then(() => ScrollTrigger.refresh());

// Returning from the motion toggle: put the visitor back at the footer.
let backToFooter = false;
try {
  backToFooter = sessionStorage.getItem('hz-scroll-footer') === '1';
  sessionStorage.removeItem('hz-scroll-footer');
} catch {
  /* storage blocked */
}
if (backToFooter) {
  requestAnimationFrame(() => scrollToTarget(document.querySelector('.footer'), true));
} else if (location.hash.length > 1) {
  const target = location.hash;
  window.addEventListener('load', () => setTimeout(() => scrollToTarget(target, true), 60), { once: true });
}
