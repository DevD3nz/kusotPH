const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);

document.getElementById('year').textContent = String(new Date().getFullYear());

// ---------- Nav background once the page scrolls ----------
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
onScrollNav();
window.addEventListener('scroll', onScrollNav, { passive: true });

// ---------- Kinetic type: split headings into words so they can animate one by one ----------
// Hero lines keep their gradient and animate as whole lines (see CSS); everything else is split.
function splitWords(el) {
  if (el.dataset.split) return;
  el.dataset.split = '1';
  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.className = 'wi';
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    }
  };
  walk(el);
  el.querySelectorAll('.wi').forEach((wi, i) => { wi.style.setProperty('--i', i); });
  el.classList.add('kinetic');
}
if (!reducedMotion) {
  document.querySelectorAll('.section-head h2, .chapter h3, .demo-copy h2, .maker h3, .edition h2').forEach(splitWords);
}

// ---------- Reveal on scroll ----------
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
document.querySelectorAll('.reveal, .kinetic').forEach((el, i) => {
  if (el.closest('.hero')) el.style.transitionDelay = `${i * 90}ms`;
  revealObserver.observe(el);
});

// ---------- Hero headline follows the scroll (weight, tracking, lift) ----------
const heroH1 = document.querySelector('.hero h1');
const heroSection = document.querySelector('.hero');
function heroScroll() {
  if (!heroH1 || reducedMotion) return;
  const hp = clamp01(window.scrollY / (window.innerHeight * 0.85));
  heroH1.style.setProperty('--hp', hp.toFixed(4));
  heroSection.style.setProperty('--hp', hp.toFixed(4));
}

// ---------- 3D tilt on cards (mouse only) ----------
if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transform = `rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateZ(0)`;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1), opacity .9s, border-color .3s';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 600);
    });
  });
}

// ---------- Fluid wave dividers (SVG path morph) ----------
const dividers = Array.from(document.querySelectorAll('.divider')).map((svg, idx) => {
  const [fill, line] = svg.querySelectorAll('path');
  const seed = idx * 1.7;
  let visible = false;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '20% 0px' });
  io.observe(svg);
  return { fill, line, seed, get visible() { return visible; } };
});
let scrollVel = 0, lastY = window.scrollY;
function drawDividers(time) {
  for (const d of dividers) {
    if (!d.visible) continue;
    const N = 48;
    const tm = time * 0.0006 + d.seed;
    const amp = 8 + Math.min(Math.abs(scrollVel), 40) * 0.3;
    let s = '';
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * 1000;
      const u = i / N;
      const y = 40
        + Math.sin(u * 6.28 * 1.3 + tm * 2.1) * amp
        + Math.sin(u * 6.28 * 2.7 - tm * 1.4) * amp * 0.35
        + Math.sin(u * 6.28 * 0.6 + tm * 0.8) * amp * 0.5;
      s += `${i ? ' L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d.line.setAttribute('d', s);
    d.fill.setAttribute('d', `M0 80 L${s.slice(1)} L1000 80 Z`);
  }
}

// ---------- 3D scene, driven continuously by scroll position ----------
const canvas = document.getElementById('scene');
let scene = null;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

if (webglAvailable()) {
  import('./scene.js?v=5')
    .then((m) => { scene = m.initScene(canvas, { reducedMotion }); buildKeys(); update(); })
    .catch((err) => {
      console.warn('3D scene unavailable', err);
      document.documentElement.classList.add('no-webgl');
      canvas.remove();
    });
} else {
  document.documentElement.classList.add('no-webgl');
  canvas.remove();
}

// Keyframes: the innermost [data-scene] elements, keyed by the page y of their centre.
const sceneEls = Array.from(document.querySelectorAll('[data-scene]'))
  .filter((el) => !el.querySelector('[data-scene]'));
let keys = [];
function buildKeys() {
  const sy = window.scrollY;
  keys = sceneEls.map((el) => {
    const r = el.getBoundingClientRect();
    return { name: el.dataset.scene, y: sy + r.top + r.height / 2 };
  }).sort((a, b) => a.y - b.y);
}

let ticking = false;
function update() {
  ticking = false;
  heroScroll();
  if (!scene || !keys.length) return;
  const y = window.scrollY + window.innerHeight * 0.5;
  if (y <= keys[0].y) { scene.setBlend(keys[0].name, keys[0].name, 0); return; }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (y >= a.y && y < b.y) {
      const t = smooth((y - a.y) / Math.max(b.y - a.y, 1));
      scene.setBlend(a.name, b.name, t);
      return;
    }
  }
  const last = keys[keys.length - 1];
  scene.setBlend(last.name, last.name, 0);
}
function requestUpdate() {
  if (!ticking) { ticking = true; requestAnimationFrame(update); }
}
window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', () => { buildKeys(); requestUpdate(); });
// Layout shifts as fonts load and <details> open: keep the keyframes current.
if ('ResizeObserver' in window) {
  new ResizeObserver(() => { buildKeys(); requestUpdate(); }).observe(document.body);
}
heroScroll();

if (!reducedMotion && dividers.length) {
  const loop = (time) => {
    const yNow = window.scrollY;
    scrollVel += ((yNow - lastY) - scrollVel) * 0.15;
    lastY = yNow;
    drawDividers(time);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
