// Social preview cards (1200 x 630), one per locale, drawn as HTML and
// captured with headless Chrome. Run after changing the hero copy:
//   npm run og
// Set CHROME_PATH if Chrome or Edge is not in a standard location.

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { HZ_PIECES, piecePath } from '../src/js/webgl/logo-shapes.js';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'site.config.json'), 'utf8'));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('[og] Chrome or Edge not found. Set CHROME_PATH and try again.');
  process.exit(1);
}

const font = async (file) => `data:font/woff2;base64,${(await fs.readFile(path.join(ROOT, 'assets/fonts', file))).toString('base64')}`;
const FONTS = {
  bricolage: await font('bricolage-latin.woff2'),
  bricolageExt: await font('bricolage-latin-ext.woff2'),
  inter: await font('inter-latin.woff2'),
  interExt: await font('inter-latin-ext.woff2'),
  mono: await font('jetbrains-mono.woff2'),
  plex400: await font('plex-arabic-400.woff2'),
  plex700: await font('plex-arabic-700.woff2'),
};

const SWOOSH =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 24' preserveAspectRatio='none'%3E%3Cpath fill='%23f5d547' d='M3 13.5C38 7.8 86 5.4 131 6.1c24 .4 46 1.6 66 3.6l-1 7.1c-30-3-62-4.3-95-3.6-30 .6-63 2.9-96 6.6z'/%3E%3C/svg%3E";

// The mark, pulled apart a little, with the same A-D part letters as the hero.
const OFFSETS = { h: [-70, 20], 'h-shade': [-15, -60], z: [55, -25], 'z-shade': [85, 60] };
const BADGES = [
  ['A', -150, 395, -15, 420],
  ['B', 250, 40, 300, 130],
  ['C', 740, 150, 700, 205],
  ['D', 760, 770, 720, 760],
];

function markSvg() {
  const pieces = HZ_PIECES.map((piece) => {
    const [dx, dy] = OFFSETS[piece.id];
    const d = piecePath(piece.points);
    const dark = piece.tone === 'dark';
    return `<g transform="translate(${dx} ${dy})">
      <path d="${d}" transform="translate(16 16)" fill="#021b29" stroke="rgba(158,173,200,.35)" stroke-width="2"/>
      <path d="${d}" fill="${dark ? '#0b3550' : '#c5d0de'}" stroke="${dark ? '#f5d547' : '#eaf0f6'}" stroke-width="${dark ? 3 : 2}" stroke-linejoin="round"/>
    </g>`;
  }).join('');
  const badges = BADGES.map(
    ([letter, x, y, tx, ty]) => `
      <path d="M${x + 28} ${y + 28} L${tx} ${ty}" stroke="rgba(158,173,200,.55)" stroke-width="2" stroke-dasharray="6 6"/>
      <rect x="${x}" y="${y}" width="56" height="56" rx="8" fill="#f5d547"/>
      <text x="${x + 28}" y="${y + 39}" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="30" fill="#00141f">${letter}</text>`
  ).join('');
  return `<svg class="mark" viewBox="-200 -110 1060 1060" aria-hidden="true">
    <ellipse cx="350" cy="430" rx="520" ry="170" transform="rotate(-18 350 430)" fill="none" stroke="rgba(158,173,200,.4)" stroke-width="2" stroke-dasharray="10 12"/>
    <ellipse cx="350" cy="430" rx="460" ry="120" transform="rotate(24 350 430)" fill="none" stroke="rgba(158,173,200,.22)" stroke-width="2"/>
    <circle cx="-128" cy="600" r="11" fill="#f5d547"/>
    <circle cx="812" cy="300" r="9" fill="#ef5b5f"/>
    ${pieces}
    ${badges}
  </svg>`;
}

function cardHtml(lang, s) {
  const rtl = config.rtlLocales.includes(lang);
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<style>
@font-face { font-family: "Bricolage Grotesque"; src: url(${FONTS.bricolage}) format("woff2"); font-weight: 200 800; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F; }
@font-face { font-family: "Bricolage Grotesque"; src: url(${FONTS.bricolageExt}) format("woff2"); font-weight: 200 800; unicode-range: U+0100-02BA, U+1E00-1EFF; }
@font-face { font-family: "Inter"; src: url(${FONTS.inter}) format("woff2"); font-weight: 100 900; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F; }
@font-face { font-family: "Inter"; src: url(${FONTS.interExt}) format("woff2"); font-weight: 100 900; unicode-range: U+0100-02BA, U+1E00-1EFF; }
@font-face { font-family: "JetBrains Mono"; src: url(${FONTS.mono}) format("woff2"); font-weight: 400 700; }
@font-face { font-family: "IBM Plex Sans Arabic"; src: url(${FONTS.plex400}) format("woff2"); font-weight: 400; unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }
@font-face { font-family: "IBM Plex Sans Arabic"; src: url(${FONTS.plex700}) format("woff2"); font-weight: 600 800; unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body {
  position: relative;
  background: #00141f;
  color: #eaf0f6;
  font-family: "Inter", "IBM Plex Sans Arabic", sans-serif;
  background-image:
    linear-gradient(rgba(158,173,200,.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(158,173,200,.1) 1px, transparent 1px),
    linear-gradient(rgba(158,173,200,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(158,173,200,.045) 1px, transparent 1px);
  background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px;
  background-position: -1px -1px;
}
.corner { position: absolute; width: 26px; height: 26px; border: 0 solid rgba(158,173,200,.6); }
.tl { top: 30px; left: 30px; border-top-width: 2px; border-left-width: 2px; }
.tr { top: 30px; right: 30px; border-top-width: 2px; border-right-width: 2px; }
.bl { bottom: 30px; left: 30px; border-bottom-width: 2px; border-left-width: 2px; }
.br { bottom: 30px; right: 30px; border-bottom-width: 2px; border-right-width: 2px; }
.copy { position: absolute; top: 78px; inset-inline-start: 78px; width: 660px; }
.mono { font-family: "JetBrains Mono", "IBM Plex Sans Arabic", monospace; font-weight: 500; }
.kicker { display: flex; align-items: center; gap: 14px; font-size: 19px; letter-spacing: .08em; text-transform: uppercase; color: #9eadc8; }
.kicker i { width: 13px; height: 13px; background: #ef5b5f; }
h1 {
  margin-top: 34px;
  font-family: "Bricolage Grotesque", "IBM Plex Sans Arabic", sans-serif;
  font-weight: 800;
  font-size: 86px;
  line-height: .98;
  letter-spacing: -.035em;
}
h1 span { display: block; }
mark {
  color: inherit;
  background: url("${SWOOSH}") no-repeat 0 94% / 100% .3em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.sub { margin-top: 30px; max-width: 610px; font-size: 24px; line-height: 1.4; color: #c5d0de; }
.fig { position: absolute; bottom: 62px; inset-inline-end: 78px; font-size: 16px; color: #60748c; }
.mark { position: absolute; top: 50px; inset-inline-end: 34px; width: 470px; height: 470px; }
:lang(ar) * { letter-spacing: 0 !important; }
:lang(ar) h1 { font-weight: 700; font-size: 84px; line-height: 1.28; }
:lang(ar) .sub { font-size: 26px; line-height: 1.6; }
:lang(ar) .kicker { font-size: 20px; }
</style>
</head>
<body>
  <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
  <div class="copy">
    <p class="kicker mono"><i></i>HAZEON / ${s.hero.kicker}</p>
    <h1><span>${s.hero.line1}</span><span>${s.hero.line2}</span></h1>
    <p class="sub">${s.meta.ogDescription}</p>
  </div>
  ${markSvg()}
  <p class="fig mono">${s.hero.figure}</p>
</body>
</html>`;
}

// Headless Chrome occasionally exits without writing the file (seen on
// Windows), so each card gets a few attempts with a fresh profile.
async function capture(html, out, tmp, id) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await fs.rm(out, { force: true });
    await run(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        `--user-data-dir=${path.join(tmp, `profile-${id}-${attempt}`)}`,
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--window-size=1200,630',
        `--screenshot=${out}`,
        pathToFileURL(html).href,
      ],
      { timeout: 60000 }
    ).catch(() => {});
    for (let i = 0; i < 20 && !existsSync(out); i++) await new Promise((r) => setTimeout(r, 250));
    if (existsSync(out)) return;
  }
  throw new Error(`no screenshot produced at ${out}`);
}

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hazeon-og-'));
try {
  for (const lang of config.locales) {
    const strings = JSON.parse(await fs.readFile(path.join(ROOT, 'src/i18n', `${lang}.json`), 'utf8'));
    const html = path.join(tmp, `${lang}.html`);
    const out = path.join(ROOT, 'assets/img', `og-${lang}.png`);
    await fs.writeFile(html, cardHtml(lang, strings));
    await capture(html, out, tmp, lang);
    const { size } = await fs.stat(out);
    console.log(`[og] ${path.relative(ROOT, out)}  ${(size / 1024).toFixed(0)} KB`);
  }
} finally {
  await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
}
