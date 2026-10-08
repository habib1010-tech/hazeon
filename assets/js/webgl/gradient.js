// Flowing brand-colored gradient rendered with a single full-screen shader.
// Used as the living background of the contact section.
import * as THREE from 'three';

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  varying vec2 vUv;

  // 2D simplex noise (Ashima Arts, MIT).
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

  float fbm(vec2 p) {
    float f = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      f += a * snoise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return f;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float t = uTime * 0.06;

    // Domain warping for silky, liquid motion.
    vec2 q = vec2(fbm(p * 1.2 + vec2(0.0, t)), fbm(p * 1.2 + vec2(5.2, -t)));
    vec2 r = vec2(fbm(p * 1.4 + 2.0 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p * 1.4 + 2.0 * q + vec2(8.3, 2.8) - t * 0.4));
    float n = fbm(p * 1.1 + 2.2 * r);

    vec3 deep   = vec3(0.0, 0.055, 0.09);
    vec3 navy   = vec3(0.0, 0.188, 0.286);
    vec3 steel  = vec3(0.31, 0.435, 0.537);
    vec3 red    = vec3(0.757, 0.161, 0.18);
    vec3 yellow = vec3(0.961, 0.835, 0.278);

    vec3 col = mix(deep, navy, smoothstep(-0.6, 0.4, n));
    col = mix(col, steel, smoothstep(0.15, 0.85, length(q)) * 0.55);
    col = mix(col, red, smoothstep(0.35, 0.95, r.x) * 0.55);
    col += yellow * smoothstep(0.55, 1.1, r.y + n * 0.4) * 0.22;

    // Soft light that follows the pointer.
    float d = length(uv - uPointer);
    col += steel * 0.35 * smoothstep(0.55, 0.0, d);

    // Vignette + subtle grain.
    col *= 1.0 - 0.55 * pow(length(uv - 0.5) * 1.25, 2.0);
    float grain = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.025;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createGradient(canvas, { reducedMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (err) {
    return null;
  }
  // The gradient is soft, so render at reduced resolution for performance.
  renderer.setPixelRatio(0.5);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0.7, 0.4) },
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader,
    })
  );
  scene.add(mesh);

  const target = new THREE.Vector2(0.7, 0.4);
  let running = false;
  let rafId = 0;
  let last = performance.now();
  let elapsed = 8;

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
    elapsed += dt * (reducedMotion ? 0.2 : 1);
    uniforms.uTime.value = elapsed;
    uniforms.uPointer.value.lerp(target, 0.04);
    renderer.render(scene, camera);
  }

  // ~30fps is plenty for a slow-moving gradient and halves GPU cost.
  let skip = false;
  function loop() {
    if (!running) return;
    skip = !skip;
    if (!skip) frame();
    rafId = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
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

  canvas.parentElement.addEventListener(
    'pointermove',
    (e) => {
      const rect = canvas.getBoundingClientRect();
      target.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
    },
    { passive: true }
  );

  resize();
  frame();
  return { canvas };
}
