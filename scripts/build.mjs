// Builds the static site into the repository root (GitHub Pages serves main/root).
//
//   src/js/main.js     -> assets/build/main-[hash].js (+ lazy chunks, e.g. three.js)
//   src/css/style.css  -> assets/build/style-[hash].css
//   src/index.html     -> index.html, fr/index.html, ar/index.html
//   + 404.html, sitemap.xml, robots.txt, .well-known/security.txt, CNAME
//
// Template syntax in src/index.html:
//   {{key}}   raw value (translations may contain <mark>, <b>, <a>)
//   {{=key}}  escaped for use inside an attribute
//   {{%key}}  URL-encoded (mailto subjects)
// A key is either a build variable or a dotted path into src/i18n/<locale>.json.
// Unknown keys fail the build, so a typo never ships as "{{nav.servics}}".

import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'assets', 'build');
const TARGET = ['chrome105', 'edge105', 'firefox110', 'safari15.4'];

const FONT_PRELOADS = {
  default: ['inter-latin.woff2', 'bricolage-latin.woff2'],
  ar: ['plex-arabic-400.woff2', 'plex-arabic-700.woff2'],
};

// Runs before first paint: theme + motion preference, so there is no flash.
// It is hashed into the CSP, so keep it byte-identical across pages.
const PREFS_SCRIPT = `(function(){var d=document.documentElement,t=null,m=null;try{t=localStorage.getItem('theme');m=localStorage.getItem('motion')}catch(e){}var q=/[?&]motion=(full|reduced)\\b/.exec(location.search);if(q)m=q[1];if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';if(m!=='full'&&m!=='reduced')m=matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full';d.setAttribute('data-theme',t);d.setAttribute('data-motion',m);d.classList.add('js');var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute('content',t==='light'?'#f4f1ea':'#00141f');setTimeout(function(){if(!d.classList.contains('ready'))d.classList.remove('js')},4000)})();`;

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('base64');
const escAttr = (s) => String(s).replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escXml = escHtml;
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const stripTags = (s) => String(s).replace(/<[^>]*>/g, '');

function lookup(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
}

function render(template, vars, dict, label) {
  const out = template.replace(/\{\{([=%]?)([\w.]+)\}\}/g, (_, mode, key) => {
    let v = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : lookup(dict, key);
    if (v === undefined || typeof v === 'object') throw new Error(`[${label}] unknown template key "${key}"`);
    v = String(v);
    if (mode === '=') return escAttr(v);
    if (mode === '%') return encodeURIComponent(stripTags(v));
    return v;
  });
  const left = out.match(/\{\{[^}]*\}\}/);
  if (left) throw new Error(`[${label}] unrendered placeholder ${left[0]}`);
  return out;
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

function keyPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keyPaths(v, prefix + k + '.') : [prefix + k]));
}

async function bundle() {
  await fs.rm(OUT, { recursive: true, force: true });

  const js = await esbuild.build({
    entryPoints: [path.join(SRC, 'js', 'main.js')],
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    target: TARGET,
    outdir: OUT,
    entryNames: '[name]-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    legalComments: 'linked',
    metafile: true,
    logLevel: 'warning',
  });

  const css = await esbuild.build({
    entryPoints: [path.join(SRC, 'css', 'style.css')],
    bundle: true,
    minify: true,
    target: TARGET,
    outdir: OUT,
    entryNames: '[name]-[hash]',
    external: ['*.woff2', '*.svg', '*.png'],
    metafile: true,
    logLevel: 'warning',
  });

  const rel = (p) => path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/');
  const jsOutputs = js.metafile.outputs;
  const mainOut = Object.keys(jsOutputs).find((k) => jsOutputs[k].entryPoint && k.endsWith('.js'));
  const cssOut = Object.keys(css.metafile.outputs).find((k) => k.endsWith('.css'));
  const staticImports = jsOutputs[mainOut].imports.filter((i) => i.kind === 'import-statement').map((i) => rel(i.path));

  const sizes = Object.entries({ ...jsOutputs, ...css.metafile.outputs })
    .filter(([k]) => !k.endsWith('.map') && !k.endsWith('.txt'))
    .map(([k, v]) => `  ${rel(k).padEnd(48)} ${(v.bytes / 1024).toFixed(1).padStart(7)} KB`);

  return { js: rel(mainOut), css: rel(cssOut), preloads: staticImports, sizes };
}

function localeUrl(config, locale) {
  return config.siteUrl + (locale === config.defaultLocale ? '' : `${locale}/`);
}

function relLink(from, to, config) {
  const up = from === config.defaultLocale ? '' : '../';
  return up + (to === config.defaultLocale ? '' : `${to}/`) || './';
}

export async function build() {
  const started = performance.now();
  const config = await readJson(path.join(ROOT, 'site.config.json'));
  if (!config.siteUrl.endsWith('/')) config.siteUrl += '/';

  const dicts = {};
  for (const l of config.locales) dicts[l] = await readJson(path.join(SRC, 'i18n', `${l}.json`));

  // Every locale must have exactly the keys of the default locale.
  const ref = keyPaths(dicts[config.defaultLocale]);
  for (const l of config.locales) {
    const keys = keyPaths(dicts[l]);
    const missing = ref.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !ref.includes(k));
    if (missing.length || extra.length) throw new Error(`[${l}] missing: ${missing.join(', ') || '-'} | extra: ${extra.join(', ') || '-'}`);
  }

  const assets = await bundle();
  const template = await fs.readFile(path.join(SRC, 'index.html'), 'utf8');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'sha256-${sha256(PREFS_SCRIPT)}'`,
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
  ].join('; ');

  const year = new Date().getFullYear();
  const pages = [];

  for (const locale of config.locales) {
    const dict = dicts[locale];
    const isRtl = config.rtlLocales.includes(locale);
    const root = locale === config.defaultLocale ? '' : '../';
    const canonical = localeUrl(config, locale);

    const alternates = [
      ...config.locales.map((l) => `<link rel="alternate" hreflang="${l}" href="${localeUrl(config, l)}">`),
      `<link rel="alternate" hreflang="x-default" href="${localeUrl(config, config.defaultLocale)}">`,
    ].join('\n  ');

    const ogAlternates = config.locales
      .filter((l) => l !== locale)
      .map((l) => `<meta property="og:locale:alternate" content="${dicts[l].meta.locale}">`)
      .join('\n  ');

    const langItems = (cls, labelKey) =>
      `<div class="${cls}" role="group" aria-label="${escAttr(dict.ui.language)}">` +
      config.locales
        .map((l) => {
          const m = dicts[l].meta;
          const current = l === locale ? ' aria-current="page"' : '';
          const label = labelKey === 'short' ? `<span aria-hidden="true">${m.langShort}</span><span class="sr-only">${escHtml(m.langName)}</span>` : escHtml(m.langName);
          return `<a href="${relLink(locale, l, config)}" hreflang="${l}" lang="${l}"${current} data-lang="${l}">${label}</a>`;
        })
        .join('') +
      '</div>';

    const fonts = (FONT_PRELOADS[locale] || FONT_PRELOADS.default)
      .map((f) => `<link rel="preload" href="${root}assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`)
      .join('\n  ');

    const jsonld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${config.siteUrl}#organization`,
          name: 'HAZEON',
          legalName: config.legalName,
          url: config.siteUrl,
          logo: `${config.siteUrl}assets/img/icon-512.png`,
          email: config.email,
          description: stripTags(dict.footer.text),
          sameAs: [config.github],
          knowsAbout: ['Software engineering', 'Artificial intelligence', 'Retrieval-augmented generation', 'SaaS', 'DevSecOps', 'Cloud infrastructure'],
        },
        {
          '@type': 'WebSite',
          '@id': `${config.siteUrl}#website`,
          url: config.siteUrl,
          name: 'HAZEON',
          inLanguage: config.locales,
          publisher: { '@id': `${config.siteUrl}#organization` },
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: stripTags(dict.meta.title),
          description: stripTags(dict.meta.description),
          inLanguage: locale,
          isPartOf: { '@id': `${config.siteUrl}#website` },
          about: { '@id': `${config.siteUrl}#organization` },
        },
      ],
    };

    const vars = {
      lang: locale,
      dir: isRtl ? 'rtl' : 'ltr',
      root,
      css: root + assets.css,
      js: root + assets.js,
      modulePreloads: assets.preloads.map((p) => `<link rel="modulepreload" href="${root}${p}">`).join('\n  '),
      csp: `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
      canonical,
      alternates,
      ogAlternates,
      siteUrl: config.siteUrl,
      fontPreloads: fonts,
      prefsScript: PREFS_SCRIPT,
      jsonld: `<script type="application/ld+json">${jsonForScript(jsonld)}</script>`,
      i18nClient: jsonForScript({ ...dict.client, lang: locale, dir: isRtl ? 'rtl' : 'ltr', email: config.email }),
      langSwitch: langItems('lang', 'short'),
      langLinks: langItems('lang lang--names', 'name'),
      email: config.email,
      github: config.github,
      legalName: config.legalName,
      roles: config.openRoles,
      year,
    };

    const html = render(template, vars, dict, locale);
    const file = locale === config.defaultLocale ? 'index.html' : path.join(locale, 'index.html');
    await fs.mkdir(path.dirname(path.join(ROOT, file)), { recursive: true });
    await fs.writeFile(path.join(ROOT, file), html);
    pages.push(file.split(path.sep).join('/'));
  }

  // 404: served at any depth, so it uses absolute paths derived from siteUrl.
  const base = new URL(config.siteUrl).pathname;
  const d0 = dicts[config.defaultLocale];
  const notFound = `<!DOCTYPE html>
<html lang="${config.defaultLocale}" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#00141f">
  <title>${escHtml(d0.notFound.title)} | HAZEON</title>
  <link rel="icon" href="${base}assets/img/favicon.svg" type="image/svg+xml">
  <script>${PREFS_SCRIPT}</script>
  <link rel="stylesheet" href="${base}${assets.css}">
</head>
<body class="nf-body">
  <main class="nf">
    <a class="brand" href="${base}"><span class="brand__word">HAZEON</span></a>
    <p class="nf__code mono" aria-hidden="true">404</p>
    ${config.locales
      .map((l) => {
        const n = dicts[l].notFound;
        const dir = config.rtlLocales.includes(l) ? ' dir="rtl"' : '';
        const href = base + (l === config.defaultLocale ? '' : `${l}/`);
        return `<section class="nf__item" lang="${l}"${dir}><h1>${escHtml(n.title)}</h1><p>${escHtml(n.text)}</p><a class="link" href="${href}">${escHtml(n.back)}</a></section>`;
      })
      .join('\n    ')}
  </main>
  <script>document.documentElement.classList.add('ready')</script>
</body>
</html>
`;
  // The tiny inline "ready" script needs its own hash.
  const readyScript = "document.documentElement.classList.add('ready')";
  await fs.writeFile(path.join(ROOT, '404.html'), notFound.replace(`script-src 'self' 'sha256-${sha256(PREFS_SCRIPT)}'`, `script-src 'self' 'sha256-${sha256(PREFS_SCRIPT)}' 'sha256-${sha256(readyScript)}'`));

  // sitemap.xml with hreflang alternates
  const today = new Date().toISOString().slice(0, 10);
  const links = config.locales
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escXml(localeUrl(config, l))}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(localeUrl(config, config.defaultLocale))}"/>`)
    .join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${config.locales
  .map((l) => `  <url>\n    <loc>${escXml(localeUrl(config, l))}</loc>\n    <lastmod>${today}</lastmod>\n${links}\n  </url>`)
  .join('\n')}
</urlset>
`;
  await fs.writeFile(path.join(ROOT, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.siteUrl}sitemap.xml\n`);

  const expires = new Date(Date.now() + 365 * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
  await fs.mkdir(path.join(ROOT, '.well-known'), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, '.well-known', 'security.txt'),
    `Contact: mailto:${config.email}\nExpires: ${expires}\nPreferred-Languages: ${config.locales.join(', ')}\nCanonical: ${config.siteUrl}.well-known/security.txt\n`
  );

  const cname = path.join(ROOT, 'CNAME');
  if (config.customDomain) await fs.writeFile(cname, config.customDomain.trim() + '\n');
  else await fs.rm(cname, { force: true });

  return { pages, assets, ms: Math.round(performance.now() - started) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build()
    .then(({ pages, assets, ms }) => {
      console.log(`Built ${pages.join(', ')}, 404.html, sitemap.xml in ${ms} ms`);
      console.log(assets.sizes.join('\n'));
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}
