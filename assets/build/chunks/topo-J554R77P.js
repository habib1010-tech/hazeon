import{E as T,G as H,N as A,Q as S,f as n,h as u,m as l,n as R,t as y}from"./chunk-QMMSUUVH.js";var C={dark:{bg:"#00141f",line:"#9eadc8",major:"#4f6f89",accent:"#f5d547",lineAlpha:.2,majorAlpha:.55},light:{bg:"#f4f1ea",line:"#4f6f89",major:"#003049",accent:"#c1292e",lineAlpha:.22,majorAlpha:.42}},M=`
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
`;function P(a,{reducedMotion:p=!1,theme:L="dark"}={}){let i;try{i=new S({canvas:a,antialias:!1,alpha:!1,powerPreference:"low-power"})}catch{return null}i.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));let f=new R,j=new A(-1,1,1,-1,0,1),t={uTime:{value:12},uResolution:{value:new u(1,1)},uPointer:{value:new u(.72,.45)},uHill:{value:0},uBg:{value:new l},uLine:{value:new l},uMajor:{value:new l},uAccent:{value:new l},uLineAlpha:{value:.2},uMajorAlpha:{value:.5}};f.add(new y(new T(2,2),new H({uniforms:t,vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",fragmentShader:M})));function h(o){let e=C[o]||C.dark;t.uBg.value.setStyle(e.bg,n),t.uLine.value.setStyle(e.line,n),t.uMajor.value.setStyle(e.major,n),t.uAccent.value.setStyle(e.accent,n),t.uLineAlpha.value=e.lineAlpha,t.uMajorAlpha.value=e.majorAlpha}i.outputColorSpace=n,h(L);let x=new u(.72,.45),s=0,r=!1,d=0,v=performance.now();function E(){let o=a.parentElement.clientWidth,e=a.parentElement.clientHeight;i.setSize(o,e,!1),t.uResolution.value.set(o,e)}function c(){let o=performance.now(),e=Math.min((o-v)/1e3,.05);v=o,t.uTime.value+=e*(p?0:1),t.uPointer.value.lerp(x,.06),t.uHill.value+=(s-t.uHill.value)*.05,i.render(f,j)}let m=!1;function w(){r&&(m=!m,m||c(),d=requestAnimationFrame(w))}new IntersectionObserver(([o])=>{o.isIntersecting&&!r&&!p?(r=!0,v=performance.now(),w()):o.isIntersecting||(r=!1,cancelAnimationFrame(d))}).observe(a),new ResizeObserver(()=>{E(),c()}).observe(a.parentElement);let g=a.parentElement;return g.addEventListener("pointermove",o=>{let e=a.getBoundingClientRect();x.set((o.clientX-e.left)/e.width,1-(o.clientY-e.top)/e.height),s=1},{passive:!0}),g.addEventListener("pointerleave",()=>s=0),E(),c(),{setTheme(o){h(o),c()}}}export{P as createTopo};
