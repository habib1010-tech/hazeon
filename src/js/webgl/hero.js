// Hero scene: the HAZEON monogram as a real 3D object, drawn like a part on a
// technical drawing. Pieces assemble on load and pull apart into an exploded
// view as the visitor scrolls; the page labels each part from projected positions.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HZ_PIECES, HZ_BOUNDS } from './logo-shapes.js';

const C = (hex) => new THREE.Color(hex);

const THEMES = {
  dark: {
    dark: C('#0c3a58'),
    light: C('#b9c7de'),
    edge: C('#f5d547'),
    rings: [C('#9eadc8'), C('#4f6f89'), C('#9eadc8')],
    sats: [C('#f5d547'), C('#c1292e'), C('#ffffff')],
    particles: [
      [C('#9eadc8'), 0.62],
      [C('#ffffff'), 0.16],
      [C('#f5d547'), 0.12],
      [C('#c1292e'), 0.1],
    ],
    blending: THREE.AdditiveBlending,
    particleAlpha: 1,
    exposure: 1.05,
    env: 0.85,
  },
  light: {
    dark: C('#003049'),
    light: C('#9eadc8'),
    edge: C('#c1292e'),
    rings: [C('#4f6f89'), C('#003049'), C('#4f6f89')],
    sats: [C('#c1292e'), C('#003049'), C('#e0b400')],
    particles: [
      [C('#4f6f89'), 0.6],
      [C('#003049'), 0.25],
      [C('#c1292e'), 0.1],
      [C('#d9b200'), 0.05],
    ],
    blending: THREE.NormalBlending,
    particleAlpha: 0.55,
    exposure: 1.0,
    env: 1.0,
  },
};

// Direction each piece travels in the exploded view.
const EXPLODE = {
  h: { pos: [-1.35, -0.2, 0.5], rot: [0.2, -0.55, -0.1] },
  'h-shade': { pos: [-0.5, 1.05, -0.7], rot: [-0.45, 0.35, 0.15] },
  z: { pos: [1.15, 0.3, 0.6], rot: [-0.15, 0.6, 0.08] },
  'z-shade': { pos: [1.0, -0.95, -0.5], rot: [0.45, -0.3, -0.2] },
};
const PART_ORDER = ['h', 'h-shade', 'z', 'z-shade'];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function makeGlowTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildLogo() {
  const group = new THREE.Group();
  const height = 3.4;
  const scale = height / (HZ_BOUNDS.maxY - HZ_BOUNDS.minY);
  const cx = (HZ_BOUNDS.minX + HZ_BOUNDS.maxX) / 2;
  const cy = (HZ_BOUNDS.minY + HZ_BOUNDS.maxY) / 2;

  const darkMat = new THREE.MeshPhysicalMaterial({
    metalness: 0.55,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.15,
  });
  const lightMat = new THREE.MeshPhysicalMaterial({
    metalness: 0.35,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.3,
  });
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  const pieces = HZ_PIECES.map((piece, index) => {
    // Each piece is built around its own centroid so it can spin in place.
    const gx = piece.points.reduce((s, p) => s + p[0], 0) / piece.points.length;
    const gy = piece.points.reduce((s, p) => s + p[1], 0) / piece.points.length;
    const shape = new THREE.Shape();
    piece.points.forEach(([x, y], i) => {
      const px = (x - gx) * scale;
      const py = -(y - gy) * scale;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    });
    shape.closePath();

    const isDark = piece.tone === 'dark';
    const depth = isDark ? 0.46 : 0.3;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.032,
      bevelSegments: 4,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, isDark ? darkMat : lightMat);
    const base = new THREE.Vector3((gx - cx) * scale, -(gy - cy) * scale, isDark ? 0 : -0.16);
    mesh.position.copy(base);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), edgeMat));

    const scatter = new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6, -4 - Math.random() * 6);
    const scatterRot = new THREE.Euler((Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI);

    group.add(mesh);
    return { id: piece.id, mesh, base, scatter, scatterRot, intro: 0, delay: index * 0.13 };
  });

  return { group, pieces, darkMat, lightMat, edgeMat, width: (HZ_BOUNDS.maxX - HZ_BOUNDS.minX) * scale, height };
}

function buildParticles(count) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    if (i < count * 0.58) {
      // A flat disk around the mark, like dust on a turntable.
      const r = 2.6 + Math.pow(Math.random(), 0.7) * 6.5;
      const a = Math.random() * Math.PI * 2;
      positions[i3] = Math.cos(a) * r;
      positions[i3 + 1] = (Math.random() - 0.5) * (0.35 + r * 0.06);
      positions[i3 + 2] = Math.sin(a) * r;
    } else {
      positions[i3] = (Math.random() - 0.5) * 34;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = -4 - Math.random() * 16;
    }
    sizes[i] = 0.6 + Math.random() * 1.9;
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uScroll: { value: 0 },
      uIntro: { value: 0 },
      uAlpha: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uScroll;
      uniform float uIntro;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * 0.35 + aSeed * 6.2831;
        p.x += cos(t + p.z * 0.25) * 0.12;
        p.y += sin(t * 1.3 + p.x * 0.3) * 0.14;
        p *= mix(0.35, 1.0, uIntro) * (1.0 + uScroll * 0.35);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aSize * uPixelRatio * (18.0 / -mv.z), 22.0 * uPixelRatio);
        float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 40.0);
        vAlpha = twinkle * uIntro * smoothstep(40.0, 6.0, -mv.z);
        vColor = aColor;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 1.8);
        gl_FragColor = vec4(vColor, a * vAlpha * uAlpha);
      }
    `,
  });
  return new THREE.Points(geometry, material);
}

function buildRings(glowTexture) {
  const group = new THREE.Group();
  const defs = [
    { r: 2.45, rot: [1.25, 0.18, 0.1], speed: 0.32, opacity: 0.34, dash: 0.12 },
    { r: 2.9, rot: [1.42, -0.55, 0.35], speed: -0.21, opacity: 0.4, dash: 0 },
    { r: 3.45, rot: [1.05, 0.62, -0.25], speed: 0.14, opacity: 0.22, dash: 0.05 },
  ];
  const rings = defs.map((d, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(...d.rot);
    const pts = [];
    const seg = 220;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * d.r, Math.sin(a) * d.r, 0));
    }
    // Construction lines: two of the orbits are dashed, like guides on a drawing.
    const material = d.dash
      ? new THREE.LineDashedMaterial({ transparent: true, opacity: d.opacity, depthWrite: false, dashSize: d.dash, gapSize: d.dash * 1.4 })
      : new THREE.LineBasicMaterial({ transparent: true, opacity: d.opacity, depthWrite: false });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material);
    if (d.dash) line.computeLineDistances();
    pivot.add(line);

    const satMat = new THREE.MeshBasicMaterial();
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), satMat);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.scale.setScalar(0.32);
    sat.add(glow);
    pivot.add(sat);
    group.add(pivot);
    return { pivot, line, sat, glow, r: d.r, speed: d.speed, phase: i * 2.1, baseOpacity: d.opacity };
  });
  return { group, rings };
}

export function createHeroScene(canvas, { reducedMotion = false, theme = 'dark', rtl = false, onReady, onFrame } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  const isSmall = () => window.innerWidth < 768;
  const maxDpr = isSmall() ? 1.5 : 1.75;
  // Adaptive resolution: start sharp, step down if the GPU can't keep up.
  const quality = { dpr: Math.min(window.devicePixelRatio || 1, maxDpr), min: 0.65, frames: 0, total: 0 };
  renderer.setPixelRatio(quality.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 6);
  scene.add(key);
  const redLight = new THREE.PointLight('#c1292e', 38, 14, 2);
  const yellowLight = new THREE.PointLight('#f5d547', 26, 14, 2);
  const blueLight = new THREE.PointLight('#4f6f89', 40, 16, 2);
  blueLight.position.set(0, 2, -4);
  scene.add(redLight, yellowLight, blueLight);

  const glowTexture = makeGlowTexture();
  const logo = buildLogo();
  const rig = new THREE.Group();
  const tilt = new THREE.Group();
  rig.add(tilt);
  tilt.add(logo.group);

  const { group: ringGroup, rings } = buildRings(glowTexture);
  tilt.add(ringGroup);

  const particles = buildParticles(isSmall() ? 800 : 1700);
  particles.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  rig.add(particles);
  scene.add(rig);

  function applyTheme(name) {
    const th = THEMES[name] || THEMES.dark;
    logo.darkMat.color.copy(th.dark);
    logo.lightMat.color.copy(th.light);
    logo.edgeMat.color.copy(th.edge);
    rings.forEach((ring, i) => {
      ring.line.material.color.copy(th.rings[i]);
      ring.sat.material.color.copy(th.sats[i]);
      ring.glow.material.color.copy(th.sats[i]);
      ring.glow.material.blending = th.blending;
      ring.glow.material.needsUpdate = true;
    });
    const colors = particles.geometry.getAttribute('aColor');
    const pick = () => {
      let r = Math.random();
      for (const [c, w] of th.particles) if ((r -= w) <= 0) return c;
      return th.particles[0][0];
    };
    for (let i = 0; i < colors.count; i++) {
      const c = pick();
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
    particles.material.blending = th.blending;
    particles.material.uniforms.uAlpha.value = th.particleAlpha;
    particles.material.needsUpdate = true;
    renderer.toneMappingExposure = th.exposure;
    scene.environmentIntensity = th.env;
  }
  applyTheme(theme);

  // ---- state
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let progress = 0;
  let smoothProgress = 0;
  let introStart = -1;
  let running = false;
  let allowLoop = false;
  let visible = true;
  let rafId = 0;
  let isPortrait = false;
  let baseScale = 1;
  const home = new THREE.Vector3();
  const centered = new THREE.Vector3();
  const clock = { elapsedTime: 0, last: performance.now() };
  const tick = () => {
    const now = performance.now();
    const dt = Math.min((now - clock.last) / 1000, 0.05);
    clock.last = now;
    clock.elapsedTime += dt;
    return dt;
  };

  const size = { w: 1, h: 1 };
  function layout() {
    const parent = canvas.parentElement;
    size.w = parent.clientWidth;
    size.h = parent.clientHeight;
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();

    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    isPortrait = camera.aspect <= 1.05;
    let s;
    if (!isPortrait) {
      // Landscape: copy on one side, mark on the other (mirrored for RTL).
      s = Math.min(1, (visW * 0.34) / logo.width);
      home.set(visW * 0.225 * (rtl ? -1 : 1), 0.05, 0);
      centered.set(0, 0.62, 0);
    } else {
      // Portrait: the mark sits in the band between the nav and the copy,
      // which starts at about 40% of the screen height (see .hero__content).
      s = Math.min(0.78, (visW * 0.6) / logo.width, (visH * 0.23) / logo.height);
      home.set(0, visH * 0.27, -0.5);
      centered.set(0, visH * 0.08, -0.5);
    }
    baseScale = s;
    rig.scale.setScalar(s);
  }

  function onPointerMove(e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }

  const tmp = new THREE.Vector3();
  const parts = PART_ORDER.map((id) => ({ id, x: 0, y: 0, side: 1 }));
  const frameInfo = { parts, explode: 0, progress: 0, intro: 0 };

  function update() {
    const dt = tick();
    const t = clock.elapsedTime;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    smoothProgress += (progress - smoothProgress) * 0.12;
    const p = smoothProgress;
    const motion = reducedMotion ? 0.25 : 1;
    const e = smoothstep(0.08, 0.62, p);

    // The mark glides to the center of the screen as it comes apart.
    const c = smoothstep(0.04, 0.5, p);
    rig.position.set(lerp(home.x, centered.x, c), lerp(home.y, centered.y, c), lerp(home.z, centered.z, c));
    rig.scale.setScalar(baseScale * lerp(1, isPortrait ? 0.95 : 0.64, e));

    const introT = introStart < 0 ? 0 : t - introStart;
    let introAll = 1;
    logo.pieces.forEach((piece) => {
      piece.intro = introStart < 0 ? 0 : easeOutExpo(clamp((introT - piece.delay * (reducedMotion ? 0.5 : 1)) / (reducedMotion ? 1.1 : 1.9)));
      introAll = Math.min(introAll, piece.intro);
      const k = 1 - piece.intro;
      const ex = EXPLODE[piece.id];
      piece.mesh.position.set(
        piece.base.x + piece.scatter.x * k + ex.pos[0] * e,
        piece.base.y + piece.scatter.y * k + ex.pos[1] * e,
        piece.base.z + piece.scatter.z * k + ex.pos[2] * e
      );
      piece.mesh.rotation.set(
        piece.scatterRot.x * k + ex.rot[0] * e + Math.sin(t * 0.6 + piece.delay * 9) * 0.04 * e,
        piece.scatterRot.y * k + ex.rot[1] * e,
        piece.scatterRot.z * k + ex.rot[2] * e
      );
      piece.mesh.scale.setScalar(0.35 + 0.65 * piece.intro);
    });

    // Edges flash during assembly and stay drawn while exploded.
    const introFlash = introStart < 0 ? 0 : (1 - introAll) * 0.9;
    logo.edgeMat.opacity = Math.max(introFlash, smoothstep(0.08, 0.5, p) * 0.9);

    // Less spin when exploded, so the labels stay readable.
    const calm = 1 - e * 0.7;
    tilt.rotation.y = (Math.sin(t * 0.35) * 0.28 * motion + pointer.x * 0.42) * calm + p * 0.3;
    tilt.rotation.x = (Math.sin(t * 0.27) * 0.06 * motion + pointer.y * 0.22) * calm - p * 0.12;
    tilt.position.y = Math.sin(t * 0.8) * 0.07 * motion;

    rings.forEach((ring) => {
      const a = t * ring.speed * motion + ring.phase;
      ring.sat.position.set(Math.cos(a) * ring.r, Math.sin(a) * ring.r, 0);
      ring.pivot.rotation.z += dt * ring.speed * 0.15 * motion;
      ring.pivot.scale.setScalar(1 + p * 0.55);
      ring.line.material.opacity = ring.baseOpacity * introAll * (1 - e * 0.6);
    });
    ringGroup.visible = introStart >= 0;

    particles.rotation.y = t * 0.025 * motion + pointer.x * 0.08 + p * 0.6;
    particles.rotation.x = 0.12 + pointer.y * 0.05;
    const u = particles.material.uniforms;
    u.uTime.value = t;
    u.uScroll.value = p;
    u.uIntro.value = introStart < 0 ? 0 : clamp(introT / 1.6);

    redLight.position.set(Math.cos(t * 0.4) * 4.5, Math.sin(t * 0.3) * 2 - 1, 2.5 + Math.sin(t * 0.4) * 1.5);
    yellowLight.position.set(Math.cos(t * 0.33 + 2.5) * 4 + pointer.x * 2, 2.2 - pointer.y * 2, 3.5);

    camera.position.z = 10 - p * 0.5;
    camera.position.x = pointer.x * 0.25 * calm;
    camera.position.y = -pointer.y * 0.15 * calm;
    camera.lookAt(rig.position.x * 0.15, rig.position.y * 0.15, 0);

    renderer.render(scene, camera);

    if (onFrame) {
      const cx = rig.position.clone().project(camera).x;
      logo.pieces.forEach((piece) => {
        const part = parts[PART_ORDER.indexOf(piece.id)];
        piece.mesh.getWorldPosition(tmp);
        tmp.project(camera);
        part.x = (tmp.x * 0.5 + 0.5) * size.w;
        part.y = (-tmp.y * 0.5 + 0.5) * size.h;
        part.side = tmp.x < cx ? -1 : 1;
      });
      frameInfo.explode = e;
      frameInfo.progress = p;
      frameInfo.intro = introAll;
      onFrame(frameInfo);
    }
  }

  function adaptQuality(frameMs) {
    if (frameMs > 120) return; // throttled or hidden; ignore
    quality.frames += 1;
    quality.total += frameMs;
    if (quality.frames < 45) return;
    const avg = quality.total / quality.frames;
    quality.frames = 0;
    quality.total = 0;
    if (avg > 23 && quality.dpr > quality.min) {
      quality.dpr = Math.max(quality.min, +(quality.dpr - 0.25).toFixed(2));
      renderer.setPixelRatio(quality.dpr);
      particles.material.uniforms.uPixelRatio.value = quality.dpr;
      layout();
    }
  }

  let lastFrame = 0;
  function loop(now) {
    if (!running) return;
    if (lastFrame) adaptQuality(now - lastFrame);
    lastFrame = now;
    update();
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (running || !allowLoop || !visible || document.hidden) return;
    lastFrame = 0;
    running = true;
    clock.last = performance.now();
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0 }
  );
  io.observe(canvas);

  const ro = new ResizeObserver(() => {
    layout();
    if (!running) update();
  });
  ro.observe(canvas.parentElement);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  layout();
  renderer.compile(scene, camera);
  update();
  if (onReady) onReady();

  return {
    intro() {
      clock.last = performance.now();
      introStart = clock.elapsedTime;
      allowLoop = true;
      start();
    },
    setProgress(value) {
      progress = clamp(value);
    },
    setTheme(name) {
      applyTheme(name);
      if (!running) update();
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
    },
  };
}
