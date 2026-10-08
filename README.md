# HAZEON website

The website of HAZEON, a software studio. It's available in English, French and Arabic, with light and dark themes.
Live at **https://habib1010-tech.github.io/hazeon/**.

Sources live in `src/`. `npm run build` writes the pages and assets that GitHub Pages
serves. **The build output is committed**, so always build before you push.

## Quick start

Requires Node 20 or newer.

```bash
npm install
npm run dev      # http://localhost:5173, rebuilds when src/ changes
npm run build    # production build; commit the result
```

## Structure

```
src/index.html          Page template, shared by every language
src/i18n/{en,fr,ar}.json All copy. Keys must match across the three files.
src/css/style.css       Tokens (dark + light), layout, animations
src/js/main.js          Entry point
src/js/lib/             Nav, theme/motion prefs, hero choreography, sections, forms
src/js/webgl/hero.js    3D HZ mark (three.js, loaded lazily)
src/js/webgl/topo.js    Contour-map shader behind the contact form
site.config.json        Site URL, custom domain, email, links, number of open roles
scripts/build.mjs       Renders / , /fr/ , /ar/ , 404, sitemap, robots, security.txt
scripts/og.mjs          Social preview cards (assets/img/og-*.png)

Generated (do not edit by hand):
index.html  fr/index.html  ar/index.html  404.html  sitemap.xml  robots.txt
.well-known/security.txt  assets/build/
```

## Common edits

- **Text, in any language**: edit `src/i18n/<lang>.json`, then `npm run build`. The build
  fails if a key is missing in one language or a placeholder isn't replaced.
- **Contact email, GitHub link, number of open roles**: `site.config.json`.
- **Job openings**: the `careers` keys in the i18n files, plus the role blocks in
  `src/index.html`.
- **Social preview images**: after changing the hero copy, run `npm run og`
  (needs Chrome or Edge; set `CHROME_PATH` if it isn't found).

## Moving to your own domain

1. In `site.config.json` set `siteUrl` to `https://yourdomain.com/` and `customDomain`
   to `yourdomain.com`.
2. Run `npm run build`. Canonical URLs, hreflang, the sitemap, robots.txt, the 404 page
   and the `CNAME` file are all updated.
3. At your DNS provider, point the domain at GitHub Pages: `A` records for the apex
   (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) and a
   `CNAME` from `www` to `habib1010-tech.github.io`.
4. In the repository, go to Settings > Pages, confirm the domain and turn on **Enforce HTTPS**.
5. Add the new domain to Google Search Console and submit `sitemap.xml`.

## Motion and themes

- The theme follows the OS setting until the visitor picks one (toggle in the nav or the footer).
- Animations follow the OS "reduce motion" setting. Visitors can override it in the
  footer under *Animations*, or with `?motion=full` / `?motion=reduced`.
- On Windows, turning off *Settings > Accessibility > Visual effects > Animation effects*
  makes browsers report "reduce motion", so the site shows its calm version.

## Security notes

The pages ship a strict Content-Security-Policy (no inline scripts except one hashed
snippet, no third-party origins). GitHub Pages can't send custom HTTP headers. If you
want HSTS, `frame-ancestors` or other header-only protections, put the site behind a
proxy such as Cloudflare.
