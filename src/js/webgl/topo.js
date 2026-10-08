// Contact background: a slowly shifting topographic map, drawn as contour
// lines. The pointer raises a hill under it. One full-screen fragment shader.
import * as THREE from 'three';

const PALETTES = {
  dark: { bg: '#00141f', line: '#9eadc8', major: '#4f6f89', accent: '#f5d547', lineAlpha: 0.2, majorAlpha: 0.55 },
  light: { bg: '#f4f1ea', line: '#4f6f89', major: '#003049', accent: '#c1292e', lineAlpha: 0.22, majorAlpha: 0.42 },
};

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uHill;
  uniform vec3 uBg;
  uniform vec3 uLine;
  uniform vec3 uMajor;
  uniform vec3 uAccent;
  uniform float uLineAlpha;
  uniform float uMajorAlpha;
  varying vec2 vUv;

  // 2D simplex noise (Ashima Arts, MIT)
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float height(vec2 p, float t) {
    vec2 q = vec2(snoise(p * 0.9 + vec2(0.0, t)), snoise(p * 0.9 + vec2(4.1, -t)));
    float h = snoise(p * 0.7 + q * 0.6) * 0.65 + snoise(p * 1.6 - q * 0.3 + t) * 0.25;
    return h;
  }

  // Anti-aliased iso-line at a given density.
  float iso(float h, float density, float width) {
    float v = h * density;
    float d = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4);
    return 1.0 - smoothstep(width - 0.5, width + 0.5, d);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 2.2;
    float t = uTime * 0.035;
    float h = height(p, t);

    vec2 m = (uPointer - 0.5) * vec2(aspect, 1.0) * 2.2;
    float hill = exp(-dot(p - m, p - m) * 2.4) * uHill;
    h += hill * 0.9;

    float minor = iso(h, 9.0, 0.6);
    float major = iso(h, 9.0 / 5.0, 0.9);
    float peak = iso(h, 9.0, 0.8) * smoothstep(0.35, 0.8, hill);

    vec3 col = uBg;
    col = mix(col, uLine, minor * uLineAlpha);
    col = mix(col, uMajor, major * uMajorAlpha);
    col = mix(col, uAccent, peak * 0.9);

    // Fade toward the edges so the section blends with the page.
    float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    col = mix(uBg, col, edge);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createTopo(canvas, { reducedMotion = false, theme = 'dark' } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 12 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0.72, 0.45) },
    uHill: { value: 0 },
    uBg: { value: new THREE.Color() },
    uLine: { value: new THREE.Color() },
    uMajor: { value: new THREE.Color() },
    uAccent: { value: new THREE.Color() },
    uLineAlpha: { value: 0.2 },
    uMajorAlpha: { value: 0.5 },
  };
  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader,
      })
    )
  );

  function applyTheme(name) {
    const pal = PALETTES[name] || PALETTES.dark;
    // Colors are compared against CSS hex values, so skip color management.
    uniforms.uBg.value.setStyle(pal.bg, THREE.LinearSRGBColorSpace);
    uniforms.uLine.value.setStyle(pal.line, THREE.LinearSRGBColorSpace);
    uniforms.uMajor.value.setStyle(pal.major, THREE.LinearSRGBColorSpace);
    uniforms.uAccent.value.setStyle(pal.accent, THREE.LinearSRGBColorSpace);
    uniforms.uLineAlpha.value = pal.lineAlpha;
    uniforms.uMajorAlpha.value = pal.majorAlpha;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  applyTheme(theme);

  const target = new THREE.Vector2(0.72, 0.45);
  let hillTarget = 0;
  let running = false;
  let rafId = 0;
  let last = performance.now();

  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  }

  function frame() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    uniforms.uTime.value += dt * (reducedMotion ? 0 : 1);
    uniforms.uPointer.value.lerp(target, 0.06);
    uniforms.uHill.value += (hillTarget - uniforms.uHill.value) * 0.05;
    renderer.render(scene, camera);
  }

  // ~30 fps is plenty for slow contours and halves the GPU cost.
  let skip = false;
  function loop() {
    if (!running) return;
    skip = !skip;
    if (!skip) frame();
    rafId = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running && !reducedMotion) {
      running = true;
      last = performance.now();
      loop();
    } else if (!entry.isIntersecting) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  });
  io.observe(canvas);

  const ro = new ResizeObserver(() => {
    resize();
    frame();
  });
  ro.observe(canvas.parentElement);

  const host = canvas.parentElement;
  host.addEventListener(
    'pointermove',
    (e) => {
      const rect = canvas.getBoundingClientRect();
      target.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
      hillTarget = 1;
    },
    { passive: true }
  );
  host.addEventListener('pointerleave', () => (hillTarget = 0));

  resize();
  frame();
  return {
    setTheme(name) {
      applyTheme(name);
      frame();
    },
  };
}
