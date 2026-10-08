// Hero scene: the HAZEON monogram as a real-time 3D object, wrapped in
// orbit rings and a particle nebula. Pieces assemble on intro and pull
// apart into an "exploded view" as the user scrolls through the hero.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.min.js';
import { HZ_PIECES, HZ_BOUNDS } from './logo-shapes.js';

const BRAND = {
  navy: new THREE.Color('#0c3a58'),
  mist: new THREE.Color('#9eadc8'),
  steel: new THREE.Color('#4f6f89'),
  red: new THREE.Color('#c1292e'),
  yellow: new THREE.Color('#f5d547'),
  white: new THREE.Color('#ffffff'),
};

// Direction each piece travels in the exploded view (scaled by scroll progress).
const EXPLODE = {
  h: { pos: [-1.35, 0.15, 0.9], rot: [0.25, -0.7, -0.12] },
  'h-shade': { pos: [-0.35, 0.95, -1.6], rot: [-0.6, 0.4, 0.2] },
  z: { pos: [1.15, -0.1, 1.1], rot: [-0.2, 0.75, 0.1] },
  'z-shade': { pos: [1.35, -1.0, -1.3], rot: [0.55, -0.35, -0.25] },
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function makeGlowTexture() {
  const size = 128;
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
    color: BRAND.navy,
    metalness: 0.55,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.15,
  });
  const lightMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#b9c7de'),
    metalness: 0.35,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.3,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: BRAND.yellow,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const pieces = HZ_PIECES.map((piece, index) => {
    // Build each piece around its own centroid so it can spin in place.
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

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), edgeMat);
    mesh.add(edges);

    // Random scatter used by the intro animation.
    const scatter = new THREE.Vector3(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 6,
      -4 - Math.random() * 6
    );
    const scatterRot = new THREE.Euler(
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI
    );

    group.add(mesh);
    return { id: piece.id, mesh, base, scatter, scatterRot, intro: 0, delay: index * 0.13 };
  });

  return { group, pieces, edgeMat, width: (HZ_BOUNDS.maxX - HZ_BOUNDS.minX) * scale, height };
}

function buildParticles(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const palette = [
    [BRAND.mist, 0.62],
    [BRAND.white, 0.16],
    [BRAND.yellow, 0.12],
    [BRAND.red, 0.1],
  ];
  const pick = () => {
    let r = Math.random();
    for (const [c, w] of palette) {
      if ((r -= w) <= 0) return c;
    }
    return BRAND.mist;
  };

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    if (i < count * 0.58) {
      // Galaxy disk around the monogram.
      const r = 2.6 + Math.pow(Math.random(), 0.7) * 6.5;
      const a = Math.random() * Math.PI * 2;
      positions[i3] = Math.cos(a) * r;
      positions[i3 + 1] = (Math.random() - 0.5) * (0.35 + r * 0.06);
      positions[i3 + 2] = Math.sin(a) * r;
    } else {
      // Deep background field.
      positions[i3] = (Math.random() - 0.5) * 34;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = -4 - Math.random() * 16;
    }
    const c = pick();
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
    sizes[i] = 0.6 + Math.random() * 1.9;
    seeds[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uScroll: { value: 0 },
      uIntro: { value: 0 },
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
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 1.8);
        gl_FragColor = vec4(vColor, a * vAlpha);
      }
    `,
  });

  return new THREE.Points(geometry, material);
}

function buildRings(glowTexture) {
  const group = new THREE.Group();
  const defs = [
    { r: 2.45, rot: [1.25, 0.18, 0.1], speed: 0.32, color: BRAND.mist, sat: BRAND.yellow, opacity: 0.28 },
    { r: 2.9, rot: [1.42, -0.55, 0.35], speed: -0.21, color: BRAND.steel, sat: BRAND.red, opacity: 0.32 },
    { r: 3.45, rot: [1.05, 0.62, -0.25], speed: 0.14, color: BRAND.mist, sat: BRAND.white, opacity: 0.16 },
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
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: d.opacity, depthWrite: false })
    );
    pivot.add(line);

    const sat = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: d.sat })
    );
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: d.sat,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.scale.setScalar(0.55);
    sat.add(glow);
    pivot.add(sat);
    group.add(pivot);
    return { pivot, line, sat, r: d.r, speed: d.speed, phase: i * 2.1, baseOpacity: d.opacity };
  });
  return { group, rings };
}

export function createHeroScene(canvas, { reducedMotion = false, onReady } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    return null;
  }

  const isSmall = () => window.innerWidth < 768;
  const maxDpr = isSmall() ? 1.5 : 1.75;
  // Adaptive resolution: start sharp, step down if the GPU can't keep up.
  const quality = { dpr: Math.min(window.devicePixelRatio || 1, maxDpr), min: 0.65, frames: 0, total: 0 };
  renderer.setPixelRatio(quality.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  // Lights: a white key plus brand-colored accents that orbit slowly.
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 6);
  scene.add(key);
  const redLight = new THREE.PointLight(BRAND.red, 38, 14, 2);
  const yellowLight = new THREE.PointLight(BRAND.yellow, 26, 14, 2);
  const blueLight = new THREE.PointLight(BRAND.steel, 40, 16, 2);
  blueLight.position.set(0, 2, -4);
  scene.add(redLight, yellowLight, blueLight);

  const glowTexture = makeGlowTexture();
  const logo = buildLogo();
  const rig = new THREE.Group(); // positioned per layout
  const tilt = new THREE.Group(); // pointer + idle motion
  rig.add(tilt);
  tilt.add(logo.group);

  const { group: ringGroup, rings } = buildRings(glowTexture);
  tilt.add(ringGroup);

  const particleCount = isSmall() ? 800 : 1700;
  const particles = buildParticles(particleCount);
  particles.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  rig.add(particles);
  scene.add(rig);

  // ---- State -------------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let progress = 0; // scroll progress through the hero (0..1)
  let smoothProgress = 0;
  let introStart = -1;
  let running = false;
  let allowLoop = false; // the loop starts with the intro (keeps the preloader smooth)
  let visible = true;
  let rafId = 0;
  let layoutScale = 1;
  // Simple frame timer (THREE.Clock is deprecated).
  const clock = { elapsedTime: 0, last: performance.now() };
  const tick = () => {
    const now = performance.now();
    const dt = Math.min((now - clock.last) / 1000, 0.05);
    clock.last = now;
    clock.elapsedTime += dt;
    return dt;
  };

  function layout() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    if (camera.aspect > 1.05) {
      // Desktop: text on the left, mark on the right.
      layoutScale = Math.min(1, (visW * 0.36) / logo.width);
      rig.position.set(visW * 0.2, 0.05, 0);
    } else {
      // Portrait / mobile: mark floats above the copy.
      layoutScale = Math.min(0.78, (visW * 0.62) / logo.width);
      rig.position.set(0, visH * 0.2, -0.5);
    }
    rig.scale.setScalar(layoutScale);
  }

  function onPointerMove(e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function update() {
    const dt = tick();
    const t = clock.elapsedTime;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    smoothProgress += (progress - smoothProgress) * 0.12;
    const p = smoothProgress;
    const motion = reducedMotion ? 0.25 : 1;

    // Intro assembly.
    const introT = introStart < 0 ? 0 : t - introStart;
    let introAll = 1;
    logo.pieces.forEach((piece) => {
      piece.intro = introStart < 0 ? 0 : easeOutExpo(clamp((introT - piece.delay * (reducedMotion ? 0.5 : 1)) / (reducedMotion ? 1.1 : 1.9)));
      introAll = Math.min(introAll, piece.intro);
      const k = 1 - piece.intro;
      const ex = EXPLODE[piece.id];
      const e = smoothstep(0.02, 0.85, p);
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

    // Blueprint edges: flash during intro, glow while exploded.
    const introFlash = introStart < 0 ? 0 : (1 - introAll) * 0.9;
    logo.edgeMat.opacity = Math.max(introFlash, smoothstep(0.08, 0.6, p) * 0.85);

    // Idle float + pointer tilt + scroll spin.
    tilt.rotation.y = Math.sin(t * 0.35) * 0.28 * motion + pointer.x * 0.42 + p * 1.1;
    tilt.rotation.x = Math.sin(t * 0.27) * 0.06 * motion + pointer.y * 0.22 - p * 0.2;
    tilt.position.y = Math.sin(t * 0.8) * 0.07 * motion;

    rings.forEach((ring) => {
      const a = t * ring.speed * motion + ring.phase;
      ring.sat.position.set(Math.cos(a) * ring.r, Math.sin(a) * ring.r, 0);
      ring.pivot.rotation.z += dt * ring.speed * 0.15 * motion;
      const s = 1 + p * 0.55;
      ring.pivot.scale.setScalar(s);
      ring.line.material.opacity = ring.baseOpacity * introAll * (1 - p * 0.4);
    });
    ringGroup.visible = introStart >= 0;

    particles.rotation.y = t * 0.025 * motion + pointer.x * 0.08 + p * 0.6;
    particles.rotation.x = 0.12 + pointer.y * 0.05;
    const u = particles.material.uniforms;
    u.uTime.value = t;
    u.uScroll.value = p;
    u.uIntro.value = introStart < 0 ? 0 : clamp(introT / 1.6);

    // Accent lights orbit for living reflections.
    redLight.position.set(Math.cos(t * 0.4) * 4.5, Math.sin(t * 0.3) * 2 - 1, 2.5 + Math.sin(t * 0.4) * 1.5);
    yellowLight.position.set(Math.cos(t * 0.33 + 2.5) * 4 + pointer.x * 2, 2.2 - pointer.y * 2, 3.5);

    camera.position.z = 10 - p * 1.6;
    camera.position.x = pointer.x * 0.25;
    camera.position.y = -pointer.y * 0.15;
    camera.lookAt(rig.position.x * 0.15, rig.position.y * 0.15, 0);

    renderer.render(scene, camera);
  }

  function adaptQuality(frameMs) {
    // Ignore hiccups and throttled frames (hidden tabs/panes).
    if (frameMs > 120) return;
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

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  layout();
  // Render one frame so the GPU compiles shaders before the intro starts.
  renderer.compile(scene, camera);
  update();
  start();
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
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
    },
  };
}
