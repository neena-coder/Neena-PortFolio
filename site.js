import { loadVideos } from './data.js';
import { parseVideoUrl, ratioValue } from './video-utils.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- page chrome ---------- */
const progress = document.getElementById('progress');
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');

function setMenu(open){
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

const links = document.querySelectorAll('#menu a[href^="#"]:not(.pill)');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('#work, #about').forEach(s => sectionObserver.observe(s));

/* hero spotlight follows the pointer a little */
const hero = document.getElementById('hero');
if (!reduceMotion) {
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    hero.style.setProperty('--mx', (35 + x * 0.3).toFixed(1) + '%');
  });
}

/* ---------- works stack ---------- */
const stack = document.getElementById('stack');
const stackState = document.getElementById('stackState');
let panels = [];

function buildPanel(video, index, total) {
  const media = parseVideoUrl(video.url);

  const panel = document.createElement('article');
  panel.className = 'panel';
  panel.style.zIndex = String(index + 1);

  const inner = document.createElement('div');
  inner.className = 'panel-inner';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const count = document.createElement('div');
  count.className = 'count';
  const pad = n => String(n).padStart(2, '0');
  count.textContent = pad(index + 1) + ' ';
  const of = document.createElement('span');
  of.textContent = '/ ' + pad(total);
  count.appendChild(of);
  meta.appendChild(count);

  if (video.tag) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = video.tag;
    meta.appendChild(tag);
  }
  const h3 = document.createElement('h3');
  h3.textContent = video.title || 'Untitled';
  meta.appendChild(h3);
  if (video.description) {
    const p = document.createElement('p');
    p.textContent = video.description;
    meta.appendChild(p);
  }

  const vwrap = document.createElement('div');
  vwrap.className = 'vwrap';
  const frame = document.createElement('div');
  frame.className = 'vframe';
  frame.style.setProperty('--r', ratioValue(video.ratio).toFixed(4));
  const ph = document.createElement('div');
  ph.className = 'ph';
  ph.textContent = media ? '' : 'Video unavailable';
  frame.appendChild(ph);

  // A dedicated touch-friendly control makes fullscreen easy to discover.
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'fullscreen-btn';
  fullscreenBtn.type = 'button';
  fullscreenBtn.setAttribute('aria-label', 'View video fullscreen');
  fullscreenBtn.title = 'View fullscreen';
  fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></svg>';
  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (frame.requestFullscreen) {
        await frame.requestFullscreen();
      } else if (frame.webkitRequestFullscreen) {
        frame.webkitRequestFullscreen();
      } else if (p.node && p.node.tagName === 'VIDEO' && p.node.webkitEnterFullscreen) {
        p.node.webkitEnterFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen could not be opened:', error);
    }
  });
  frame.appendChild(fullscreenBtn);
  vwrap.appendChild(frame);

  const shade = document.createElement('div');
  shade.className = 'shade';

  inner.append(meta, vwrap, shade);
  panel.appendChild(inner);

  return { el: panel, inner, shade, frame, media, title: video.title || 'Video', node: null };
}

// Only the current and next video are loaded. Covered videos are unloaded,
// which also stops any sound from a video that is now hidden underneath.
function mount(p) {
  if (p.node || !p.media) return;
  let node;
  if (p.media.type === 'iframe') {
    node = document.createElement('iframe');
    node.src = p.media.src;
    node.title = p.title;
    node.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    node.setAttribute('allowfullscreen', '');
    node.referrerPolicy = 'strict-origin-when-cross-origin';
  } else {
    node = document.createElement('video');
    node.src = p.media.src;
    node.controls = true;
    node.playsInline = true;
    node.preload = 'metadata';
    node.setAttribute('aria-label', p.title);
  }
  p.frame.appendChild(node);
  p.node = node;
}

function unmount(p) {
  if (!p.node) return;
  if (p.node.tagName === 'VIDEO') { p.node.pause(); p.node.removeAttribute('src'); p.node.load(); }
  p.node.remove();
  p.node = null;
}

function update() {
  if (!panels.length) return;
  const vh = window.innerHeight;
  const sr = stack.getBoundingClientRect();
  const near = sr.top < vh * 1.4 && sr.bottom > -vh * 0.2;

  let active = 0;
  panels.forEach((p, i) => {
    if (p.el.getBoundingClientRect().top <= vh * 0.5) active = i;
  });

  panels.forEach((p, i) => {
    const next = panels[i + 1];
    let cover = 0;
    if (next) cover = Math.min(1, Math.max(0, 1 - next.el.getBoundingClientRect().top / vh));
    if (!reduceMotion) {
      p.inner.style.transform = cover ? `scale(${(1 - cover * 0.07).toFixed(4)})` : '';
    }
    p.shade.style.opacity = (cover * 0.7).toFixed(3);

    const wanted = near && (i === active || i === active + 1);
    wanted ? mount(p) : unmount(p);
  });
}

let ticking = false;
function onScroll() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

async function init() {
  try {
    const videos = (await loadVideos()).filter(v => v && v.url);
    if (!videos.length) {
      stackState.textContent = 'New work is on the way.';
      return;
    }
    stack.innerHTML = '';
    panels = videos.map((v, i) => buildPanel(v, i, videos.length));
    panels.forEach(p => stack.appendChild(p.el));
    update();
  } catch (err) {
    console.error(err);
    stackState.textContent = "Couldn't load the work right now. Please refresh.";
  }
}
init();
onScroll();
