# HAZEON — website

Landing page for HAZEON, an AI-first software studio.
Live at **https://habib1010-tech.github.io/hazeon/**.

It's a static site with no build step. Every push to `main` is published by GitHub Pages.

## Structure

```
index.html                 All content and sections
assets/css/style.css       Design tokens, layout, animations
assets/js/main.js          Scroll animations, preloader, nav, form, etc.
assets/js/webgl/hero.js    3D hero (HZ monogram, particles, scroll "exploded view")
assets/js/webgl/gradient.js Animated shader background of the contact section
assets/js/webgl/logo-shapes.js Vector outline of the HZ mark used to extrude the 3D logo
assets/fonts/              Self-hosted Inter + Poppins (subset WOFF2)
assets/img/                Favicon, app icons, social preview image
vendor/                    Three.js, GSAP + ScrollTrigger, Lenis (vendored, no CDN)
```

## Common edits

- **Contact email**: update `CONTACT_EMAIL` in `assets/js/main.js` and the
  `mailto:` links in `index.html` (search for `hello@hazeon.dev`).
- **Job openings**: edit the `<article class="role">` blocks in the Careers section of
  `index.html`. Update the role count in the nav badge and the hero "We're hiring" button.
- **Services, process, pricing models, FAQ**: plain HTML in `index.html`.
- **Social preview**: `assets/img/og-image.png` (1200×630).

## Motion

Visitors whose OS has *reduce motion* turned on get a calmer version: no smooth-scroll
hijacking, no auto-moving content, and fades instead of slides. Force a mode with
`?motion=full` or `?motion=reduced`.

## Run locally

Any static server works. ES modules don't load over `file://`.

```bash
python -m http.server 5173
```

Then open http://localhost:5173/?motion=full.
