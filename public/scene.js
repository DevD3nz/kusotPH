import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

// One keyframe per page section. The page scroll blends between neighbouring keyframes,
// so the camera and the washer move continuously instead of snapping per section.
//   x       washer x as a fraction of the visible half-width (world units on phones: always 0)
//   y       washer y in world units
//   orbit   camera orbit angle around the scene centre (radians)
//   camY    camera height
//   camZ    camera distance multiplier (dolly)
//   blob    size of the morphing blob behind the washer (0 = hidden)
//   warm    blob colour: 0 = teal, 1 = amber
//   phone   size of the floating phone (0 = hidden)
const STATES = {
  hero:     { x: 0.6,   y: 0.05, rotY: -0.55, rotX: 0.08, scale: 1.0,  spin: 1.4, tickets: 1, ready: 0, dim: 1,    orbit: -0.05, camY: 0.3,  camZ: 1.0,  blob: 1.0,  warm: 0,   phone: 0 },
  story:    { x: 0.62,  y: 0.0,  rotY: -0.95, rotX: 0.14, scale: 0.85, spin: 0.35, tickets: 0, ready: 0, dim: 0.55, orbit: -0.16, camY: 0.7,  camZ: 1.08, blob: 0.45, warm: 0,   phone: 0 },
  turn:     { x: -0.62, y: 0.2,  rotY: 0.85,  rotX: 0.1,  scale: 0.8,  spin: 0.2, tickets: 0, ready: 0, dim: 0.4,  orbit: 0.2,   camY: 0.15, camZ: 1.16, blob: 0.7,  warm: 1,   phone: 0 },
  answer:   { x: 0.6,   y: 0.1,  rotY: -0.7,  rotX: 0.06, scale: 0.9,  spin: 2.4, tickets: 1, ready: 1, dim: 0.6,  orbit: -0.12, camY: 0.1,  camZ: 1.0,  blob: 0.3,  warm: 0,   phone: 1 },
  owner:    { x: -0.6,  y: 0.0,  rotY: 0.7,   rotX: 0.1,  scale: 0.85, spin: 1.2, tickets: 1, ready: 1, dim: 0.5,  orbit: 0.16,  camY: 0.55, camZ: 1.05, blob: 0.2,  warm: 0.5, phone: 0.6 },
  cycle:    { x: 0,     y: 2.3,  rotY: -0.2,  rotX: 0.5,  scale: 0.6,  spin: 3.4, tickets: 0, ready: 0, dim: 0.28, orbit: 0.0,   camY: -0.3, camZ: 1.22, blob: 0,    warm: 0,   phone: 0 },
  features: { x: 0.66,  y: -1.2, rotY: -1.2,  rotX: 0.2,  scale: 0.7,  spin: 1.6, tickets: 0, ready: 1, dim: 0.25, orbit: -0.22, camY: 0.3,  camZ: 1.1,  blob: 0.35, warm: 0.3, phone: 0 },
  demo:     { x: 0.6,   y: -0.4, rotY: -0.65, rotX: 0.08, scale: 0.85, spin: 2.0, tickets: 0, ready: 1, dim: 0.35, orbit: -0.1,  camY: 0.2,  camZ: 1.0,  blob: 0.5,  warm: 0.6, phone: 1 },
};

const MOBILE_Y = { hero: 2.05 };

function roundedBox(w, h, d, r, hole, bevel = 0.09) {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r;
  s.moveTo(x, y - r);
  s.lineTo(x + iw, y - r);
  s.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y);
  s.lineTo(x + iw + r, y + ih);
  s.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r);
  s.lineTo(x, y + ih + r);
  s.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih);
  s.lineTo(x - r, y);
  s.quadraticCurveTo(x - r, y - r, x, y - r);
  if (hole) {
    const p = new THREE.Path();
    p.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 5, curveSegments: 10,
  });
  g.center();
  return g;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function ticketTexture(no, status, color, kilos, ready) {
  return canvasTexture(512, 300, (ctx, w, h) => {
    rr(ctx, 0, 0, w, h, 26); ctx.fillStyle = '#f8fafc'; ctx.fill();
    ctx.fillStyle = '#0f766e'; ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('KUSOTPH · CLAIM TICKET', 32, 52);
    ctx.fillStyle = '#0f172a'; ctx.font = '800 54px "Bricolage Grotesque", sans-serif';
    ctx.fillText(no, 32, 122);
    rr(ctx, w - 200, 76, 168, 50, 25); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#0b1220'; ctx.font = '700 22px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(status, w - 116, 109); ctx.textAlign = 'left';
    ctx.strokeStyle = '#cbd5e1'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, 160); ctx.lineTo(w - 32, 160); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#475569'; ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText(kilos, 32, 208);
    ctx.fillText('Ready by', 32, 252);
    ctx.fillStyle = '#0f172a'; ctx.font = '700 24px Inter, sans-serif';
    ctx.fillText(ready, 150, 252);
  });
}

function displayTexture() {
  return canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#04201c'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5eead4'; ctx.font = '700 46px "Courier New", monospace'; ctx.textAlign = 'center';
    ctx.fillText('00:42', w / 2, 64);
  });
}

// The customer's phone: a tracking page with the order marked Ready and the SMS on top.
function phoneTexture() {
  return canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w, h);
    // status bar
    ctx.fillStyle = '#94a3b8'; ctx.font = '600 24px Inter, sans-serif';
    ctx.fillText('4:31', 40, 58); ctx.textAlign = 'right'; ctx.fillText('●●● ▮', w - 40, 58); ctx.textAlign = 'left';
    // SMS notification
    rr(ctx, 32, 92, w - 64, 170, 28); ctx.fillStyle = '#16233a'; ctx.fill();
    ctx.fillStyle = '#2dd4bf'; ctx.font = '700 20px Inter, sans-serif'; ctx.fillText('SMS · now', 60, 136);
    ctx.fillStyle = '#e9f1f6'; ctx.font = '500 25px Inter, sans-serif';
    ctx.fillText('Hi Ana, order #ORD-0247 is', 60, 182);
    ctx.fillText('ready for pickup at Main', 60, 216);
    ctx.fillText('Branch. — KusotPh', 60, 250);
    // tracking card
    rr(ctx, 32, 300, w - 64, 560, 32); ctx.fillStyle = '#0e1828'; ctx.fill();
    ctx.strokeStyle = 'rgba(148,184,204,.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#95a7ba'; ctx.font = '600 20px Inter, sans-serif'; ctx.fillText('ORDER', 72, 352);
    ctx.fillStyle = '#e9f1f6'; ctx.font = '800 44px "Bricolage Grotesque", sans-serif'; ctx.fillText('#ORD-0247', 72, 404);
    const steps = ['Received', 'Washing', 'Drying', 'Ready'];
    steps.forEach((s, i) => {
      const y = 470 + i * 80;
      const now = i === 3;
      ctx.beginPath(); ctx.arc(96, y - 10, 16, 0, Math.PI * 2);
      ctx.fillStyle = now ? '#fbbf24' : '#2dd4bf'; ctx.fill();
      if (i < 3) { ctx.fillStyle = 'rgba(45,212,191,.4)'; ctx.fillRect(94, y + 8, 4, 44); }
      ctx.fillStyle = now ? '#fbbf24' : '#cfdbe6'; ctx.font = `${now ? 800 : 500} 28px Inter, sans-serif`;
      ctx.fillText(s, 136, y);
    });
    rr(ctx, 72, 770, w - 144, 60, 30); ctx.fillStyle = 'rgba(251,191,36,.14)'; ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.font = '700 24px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Ready by  Today, 4:30 PM', w / 2, 810); ctx.textAlign = 'left';
    // home bar
    rr(ctx, w / 2 - 70, h - 40, 140, 8, 4); ctx.fillStyle = '#334155'; ctx.fill();
  });
}

function shadowTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0b1626, side: THREE.BackSide }),
  );
  env.add(sky);
  const panel = (color, intensity, pos, size) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(0xffffff, 3, [3, 5, 4], [6, 3]);
  panel(0x5eead4, 2.2, [-6, 1, 1], [3, 6]);
  panel(0xfbbf24, 1.2, [4, -3, 3], [3, 2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

// ---- Morphing blob: a sphere displaced by 3D simplex noise in the vertex shader ----
const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

const BLOB_VERT = /* glsl */`
uniform float uTime;
uniform float uAmp;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;
${NOISE_GLSL}
float field(vec3 p) {
  return snoise(p * 1.15 + uTime * 0.18) * 0.7 + snoise(p * 2.6 - uTime * 0.11) * 0.3;
}
void main() {
  float d = field(position);
  vec3 pos = position + normal * d * uAmp;
  // Recompute the normal from neighbouring displaced points so the lighting follows the morph.
  float e = 0.08;
  vec3 t = normalize(cross(normal, vec3(0.0, 1.0, 0.0) + vec3(0.001)));
  vec3 b = normalize(cross(normal, t));
  vec3 p1 = position + t * e; p1 += normal * field(p1) * uAmp;
  vec3 p2 = position + b * e; p2 += normal * field(p2) * uAmp;
  vec3 n = normalize(cross(p1 - pos, p2 - pos));
  if (dot(n, normal) < 0.0) n = -n;
  vNormal = normalize(normalMatrix * n);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  vDisp = d;
  gl_Position = projectionMatrix * mv;
}`;

const BLOB_FRAG = /* glsl */`
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;
void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
  float light = max(dot(vNormal, normalize(vec3(0.5, 0.8, 0.6))), 0.0);
  vec3 base = mix(uColorA, uColorB, smoothstep(-0.6, 0.7, vDisp));
  vec3 col = base * (0.25 + light * 0.55) + uColorC * fresnel * 1.4;
  float alpha = (0.55 + fresnel * 0.45) * uOpacity;
  gl_FragColor = vec4(col, alpha);
}`;

export function initScene(canvas, { reducedMotion = false } = {}) {
  const narrow = window.innerWidth < 900;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.environment = buildEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.3, 11);

  scene.add(new THREE.HemisphereLight(0xc8fff4, 0x08111e, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0x2dd4bf, 60, 18);
  rim.position.set(-4, 2, -2);
  scene.add(rim);
  const warm = new THREE.PointLight(0xfbbf24, 18, 14);
  warm.position.set(3, -3, 4);
  scene.add(warm);

  // ---- Washer ----
  const rig = new THREE.Group();     // follows scroll state
  const washer = new THREE.Group();  // tilts with the pointer
  rig.add(washer);
  scene.add(rig);

  const W = 2.6, H = 3.2, D = 2.2, FRONT = D / 2, DOOR_Y = -0.28;
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xeef4f5, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 });
  washer.add(new THREE.Mesh(roundedBox(W, H, D, 0.28, { x: 0, y: DOOR_Y, r: 0.86 }), bodyMat));

  const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x0f1a2a, roughness: 0.25, metalness: 0.3, clearcoat: 1 });
  const ctrl = new THREE.Mesh(roundedBox(W - 0.3, 0.52, 0.08, 0.12), panelMat);
  ctrl.position.set(0, 1.18, FRONT + 0.02);
  washer.add(ctrl);

  const screenMat = new THREE.MeshBasicMaterial({ map: displayTexture(), toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.23), screenMat);
  screen.position.set(-0.55, 1.18, FRONT + 0.065);
  washer.add(screen);

  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.1, 40),
    new THREE.MeshPhysicalMaterial({ color: 0xd8e2e6, metalness: 0.9, roughness: 0.25 }),
  );
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.72, 1.18, FRONT + 0.1);
  washer.add(knob);

  const ledMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, toneMapped: false });
  const readyLed = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), ledMat);
  readyLed.position.set(0.22, 1.18, FRONT + 0.065);
  washer.add(readyLed);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.93, 0.12, 28, 80),
    new THREE.MeshPhysicalMaterial({ color: 0xc9d4d9, metalness: 1, roughness: 0.22 }),
  );
  ring.position.set(0, DOOR_Y, FRONT + 0.06);
  washer.add(ring);

  const tub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.87, 0.87, 0.9, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x9fb1bf, metalness: 0.85, roughness: 0.35, side: THREE.BackSide }),
  );
  tub.rotation.x = Math.PI / 2;
  tub.position.set(0, DOOR_Y, FRONT - 0.45);
  washer.add(tub);

  const back = new THREE.Mesh(new THREE.CircleGeometry(0.88, 48), new THREE.MeshStandardMaterial({ color: 0x0c1522, metalness: 0.6, roughness: 0.5 }));
  back.position.set(0, DOOR_Y, FRONT - 0.88);
  washer.add(back);

  // Drum contents spin together.
  const drum = new THREE.Group();
  drum.position.set(0, DOOR_Y, FRONT - 0.5);
  washer.add(drum);

  const ribMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b3, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.6), ribMat);
    const a = (i / 3) * Math.PI * 2;
    rib.position.set(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0);
    rib.rotation.z = a;
    drum.add(rib);
  }

  const drumLight = new THREE.PointLight(0xe6fffb, 6, 2.5);
  drumLight.position.set(0, DOOR_Y + 0.3, FRONT - 0.05);
  washer.add(drumLight);

  const clothes = [];
  const clothColors = [0xf472b6, 0xfbbf24, 0x60a5fa, 0xffffff, 0x34d399, 0xfb7185, 0xa78bfa, 0x38bdf8];
  clothColors.forEach((color, i) => {
    const g = new THREE.IcosahedronGeometry(0.2, 2);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const k = 0.75 + Math.sin(v * 12.9898 + i * 78.233) * 0.25;
      p.setXYZ(v, p.getX(v) * k * 1.3, p.getY(v) * k * 0.8, p.getZ(v) * k);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    const a = (i / clothColors.length) * Math.PI * 2;
    const r = 0.35 + (i % 3) * 0.13;
    m.position.set(Math.cos(a) * r, Math.sin(a) * r, (i % 2 ? 0.12 : -0.1));
    m.userData.spin = new THREE.Vector3(0.6 + i * 0.13, 0.4 + i * 0.07, 0.3);
    drum.add(m);
    clothes.push(m);
  });

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.86, 48, Math.PI * 1.05, Math.PI * 0.9),
    new THREE.MeshPhysicalMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.35, roughness: 0.1, emissive: 0x0d9488, emissiveIntensity: 0.35 }),
  );
  water.position.set(0, DOOR_Y, FRONT - 0.12);
  washer.add(water);

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 64),
    new THREE.MeshPhysicalMaterial({ color: 0x0b2a2e, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, clearcoat: 1, envMapIntensity: 0.6, depthWrite: false }),
  );
  glass.position.set(0, DOOR_Y, FRONT + 0.07);
  washer.add(glass);

  const footMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 20), footMat);
    f.position.set(sx * (W / 2 - 0.3), -H / 2 - 0.05, sz * (D / 2 - 0.3));
    washer.add(f);
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 3.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -H / 2 - 0.12;
  rig.add(shadow);

  // ---- Floating claim tickets ----
  const tickets = [
    { tex: ticketTexture('#B1-0247', 'READY', '#fbbf24', '4.5 kg · Wash-Dry-Fold', 'Today 4:30 PM'), pos: [-2.1, 1.35, 0.9], rot: [0.05, 0.45, 0.12], s: 1.0 },
    { tex: ticketTexture('#B1-0248', 'DRYING', '#a78bfa', '6.0 kg · Wash-Dry', 'Today 5:15 PM'), pos: [1.95, -1.25, 1.3], rot: [-0.08, -0.4, -0.1], s: 0.85 },
    { tex: ticketTexture('#B2-0112', 'WASHING', '#5eead4', '3.0 kg · Rush', 'Today 3:00 PM'), pos: [1.7, 2.0, -0.6], rot: [0.1, -0.3, 0.06], s: 0.7 },
  ].map((t, i) => {
    const mat = new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * t.s, 0.94 * t.s), mat);
    m.position.set(...t.pos);
    m.rotation.set(...t.rot);
    m.userData = { base: new THREE.Vector3(...t.pos), phase: i * 2.1 };
    rig.add(m);
    return m;
  });

  // ---- The customer's phone ----
  const phone = new THREE.Group();
  const PW = 0.92, PH = 1.9;
  phone.add(new THREE.Mesh(
    roundedBox(PW, PH, 0.1, 0.14, null, 0.025),
    new THREE.MeshPhysicalMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1 }),
  ));
  const phoneScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(PW - 0.1, PH - 0.1),
    new THREE.MeshBasicMaterial({ map: phoneTexture(), toneMapped: false }),
  );
  phoneScreen.position.z = 0.052;
  phone.add(phoneScreen);
  const phoneGlow = new THREE.PointLight(0x5eead4, 4, 2.5);
  phoneGlow.position.set(0, 0, 0.5);
  phone.add(phoneGlow);
  phone.userData.base = new THREE.Vector3(1.75, -0.85, 1.4);
  phone.position.copy(phone.userData.base);
  phone.rotation.set(0.05, -0.5, 0.05);
  phone.visible = false;
  rig.add(phone);

  // ---- Morphing blob ----
  const blobMat = new THREE.ShaderMaterial({
    vertexShader: BLOB_VERT,
    fragmentShader: BLOB_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.32 },
      uOpacity: { value: 1 },
      uColorA: { value: new THREE.Color(0x0d9488) },
      uColorB: { value: new THREE.Color(0x2dd4bf) },
      uColorC: { value: new THREE.Color(0x99f6e4) },
    },
  });
  const blob = new THREE.Mesh(
    new THREE.SphereGeometry(1, narrow ? 72 : 128, narrow ? 54 : 96),
    blobMat,
  );
  blob.position.set(-3.2, 0.8, -3.5);
  scene.add(blob);
  const TEAL = { a: new THREE.Color(0x0d9488), b: new THREE.Color(0x2dd4bf), c: new THREE.Color(0x99f6e4) };
  const AMBER = { a: new THREE.Color(0xb45309), b: new THREE.Color(0xfbbf24), c: new THREE.Color(0xfde68a) };

  // ---- Bubbles ----
  const BUBBLES = window.innerWidth < 720 ? 30 : 60;
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9fffa, transparent: true, opacity: 0.12, roughness: 0, metalness: 0,
    iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 3, depthWrite: false,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), bubbleMat, BUBBLES);
  const bData = [];
  const tmp = new THREE.Object3D();
  for (let i = 0; i < BUBBLES; i++) {
    bData.push({
      x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 9, z: -4 + Math.random() * 6,
      r: 0.025 + Math.random() ** 3 * 0.16, v: 0.15 + Math.random() * 0.35, w: Math.random() * Math.PI * 2,
    });
  }
  scene.add(bubbles);

  // ---- State & animation ----
  const cur = { ...STATES.hero };
  let target = { ...STATES.hero };
  let blend = { from: 'hero', to: 'hero', t: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let mobile = false;
  let baseZ = 11;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    mobile = w < 900;
    baseZ = mobile ? 13.5 : 11;
    camera.fov = mobile ? 38 : 32;
    camera.updateProjectionMatrix();
    applyTarget();
  }

  // Turn a named keyframe into concrete world values for the current viewport.
  function resolve(name) {
    const s = STATES[name] || STATES.hero;
    const r = { ...s };
    if (!mobile) {
      const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * baseZ * camera.aspect;
      r.x = s.x * halfW;
      r.scale = s.scale * THREE.MathUtils.clamp(halfW / 5.6, 0.68, 1);
    } else {
      r.x = 0;
      r.y = MOBILE_Y[name] ?? 0.4;
      r.dim = name === 'hero' ? 0.9 : Math.min(s.dim, 0.3);
      r.scale = s.scale * 0.85;
      r.orbit = s.orbit * 0.5;
      r.blob = s.blob * 0.8;
      r.phone = name === 'hero' ? 0 : s.phone;
    }
    return r;
  }

  function applyTarget() {
    const a = resolve(blend.from), b = resolve(blend.to);
    const t = blend.t;
    target = {};
    for (const k in a) target[k] = a[k] + (b[k] - a[k]) * t;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const clock = new THREE.Clock();
  let running = true;
  let t = 0;

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const motion = reducedMotion ? 0 : 1;
    t += dt * motion;

    const k = 1 - Math.exp(-dt * 3.2);
    for (const key in target) cur[key] += (target[key] - cur[key]) * k;
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;

    rig.position.set(cur.x, cur.y + Math.sin(t * 0.8) * 0.06, 0);
    rig.scale.setScalar(cur.scale);
    washer.rotation.y = cur.rotY + pointer.x * 0.18;
    washer.rotation.x = cur.rotX + pointer.y * 0.08;
    shadow.rotation.z = -washer.rotation.y;

    drum.rotation.z -= dt * cur.spin * motion;
    for (const c of clothes) {
      c.rotation.x += dt * c.userData.spin.x * motion;
      c.rotation.y += dt * c.userData.spin.y * motion;
    }
    water.rotation.z = Math.sin(t * 2.2) * 0.12 * Math.min(cur.spin, 2);
    knob.rotation.y = t * 0.2;

    ledMat.color.setHex(cur.ready > 0.5 ? 0xfbbf24 : 0x2dd4bf);

    tickets.forEach((m) => {
      const { base, phase } = m.userData;
      m.position.y = base.y + Math.sin(t * 0.9 + phase) * 0.12;
      m.rotation.z = Math.sin(t * 0.6 + phase) * 0.06;
      m.material.opacity = cur.tickets;
      m.visible = cur.tickets > 0.02;
    });

    // Phone pops in with a little overshoot, then floats.
    const ps = cur.phone;
    phone.visible = ps > 0.02;
    if (phone.visible) {
      const ease = ps < 1 ? 1 - Math.pow(1 - ps, 3) : 1;
      phone.scale.setScalar(ease * (mobile ? 0.75 : 0.9));
      const b = phone.userData.base;
      phone.position.set(
        (mobile ? 1.6 : b.x) + (1 - ease) * 0.6,
        (mobile ? -1.3 : b.y) + Math.sin(t * 1.1 + 1.3) * 0.1,
        b.z,
      );
      phone.rotation.y = (mobile ? -0.35 : -0.5) + Math.sin(t * 0.5) * 0.08 + pointer.x * 0.12;
      phone.rotation.x = 0.05 + pointer.y * 0.06;
      phoneGlow.intensity = 4 * ease;
    }

    // Blob: morphs continuously; size and colour follow the scroll keyframes.
    const bs = cur.blob;
    blob.visible = bs > 0.02;
    if (blob.visible) {
      blobMat.uniforms.uTime.value = t;
      blobMat.uniforms.uOpacity.value = Math.min(bs * 1.4, 1) * 0.85;
      const size = (mobile ? 1.7 : 2.8) * (0.5 + bs * 0.5);
      blob.scale.setScalar(size);
      if (mobile) blob.position.set(0.3 + Math.sin(t * 0.3) * 0.3, 3.1 + Math.sin(t * 0.45) * 0.2, -4.5);
      else blob.position.set(cur.x * 0.8 + Math.sin(t * 0.3) * 0.3, cur.y * 0.6 + 1.1 + Math.sin(t * 0.45) * 0.2, -3.8);
      blob.rotation.y = t * 0.08;
      blobMat.uniforms.uColorA.value.lerpColors(TEAL.a, AMBER.a, cur.warm);
      blobMat.uniforms.uColorB.value.lerpColors(TEAL.b, AMBER.b, cur.warm);
      blobMat.uniforms.uColorC.value.lerpColors(TEAL.c, AMBER.c, cur.warm);
    }

    for (let i = 0; i < BUBBLES; i++) {
      const b = bData[i];
      b.y += b.v * dt * motion;
      if (b.y > 5) { b.y = -5; b.x = (Math.random() - 0.5) * 14; }
      tmp.position.set(b.x + Math.sin(t * 0.7 + b.w) * 0.25, b.y, b.z);
      tmp.scale.setScalar(b.r);
      tmp.updateMatrix();
      bubbles.setMatrixAt(i, tmp.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    // Camera: orbit + dolly from the keyframes, plus a little pointer parallax.
    const dist = baseZ * cur.camZ;
    camera.position.x = Math.sin(cur.orbit) * dist + pointer.x * 0.25;
    camera.position.z = Math.cos(cur.orbit) * dist;
    camera.position.y = cur.camY - pointer.y * 0.15;
    camera.lookAt(0, 0, 0);

    canvas.style.opacity = cur.dim.toFixed(3);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
  });

  resize();
  Object.assign(cur, target);
  requestAnimationFrame(frame);

  return {
    // Blend between two keyframes; t is 0..1 from `from` to `to`.
    setBlend(from, to, t) {
      if (!STATES[from]) from = 'hero';
      if (!STATES[to]) to = from;
      blend = { from, to, t: THREE.MathUtils.clamp(t, 0, 1) };
      applyTarget();
    },
    setScene(name) { this.setBlend(name, name, 0); },
  };
}
