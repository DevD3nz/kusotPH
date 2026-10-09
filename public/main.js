const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('year').textContent = String(new Date().getFullYear());

// ---------- Nav background once the page scrolls ----------
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
onScrollNav();
window.addEventListener('scroll', onScrollNav, { passive: true });

// ---------- Reveal on scroll ----------
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  if (el.closest('.hero')) el.style.transitionDelay = `${i * 90}ms`;
  revealObserver.observe(el);
});

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

// ---------- 3D scene, driven by whichever section is in the middle of the screen ----------
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
  import('./scene.js?v=4')
    .then((m) => { scene = m.initScene(canvas, { reducedMotion }); pickScene(); })
    .catch((err) => {
      console.warn('3D scene unavailable', err);
      document.documentElement.classList.add('no-webgl');
      canvas.remove();
    });
} else {
  document.documentElement.classList.add('no-webgl');
  canvas.remove();
}

const sceneEls = Array.from(document.querySelectorAll('[data-scene]'));
let ticking = false;
function pickScene() {
  ticking = false;
  if (!scene) return;
  const mid = window.innerHeight * 0.5;
  let best = null;
  let bestDist = Infinity;
  for (const el of sceneEls) {
    const r = el.getBoundingClientRect();
    if (r.top > mid || r.bottom < mid) continue;
    // Prefer the innermost element (a chapter over its whole section).
    const dist = r.height;
    if (dist < bestDist) { best = el; bestDist = dist; }
  }
  if (best) scene.setScene(best.dataset.scene);
}
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(pickScene); }
}, { passive: true });
