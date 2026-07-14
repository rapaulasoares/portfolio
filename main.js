import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════ THREE.JS — hero particle globe + drifting field ═══════════ */
function initThree() {
  const canvas = document.getElementById('webgl');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 7;

  // particle sphere (a quiet planet of data points)
  const COUNT = 2600;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = 2.6 + (Math.random() - 0.5) * 0.06;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const sphereGeo = new THREE.BufferGeometry();
  sphereGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sphere = new THREE.Points(sphereGeo, new THREE.PointsMaterial({
    color: 0x14b8a6, size: 0.022, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));

  // sparse ambient dust
  const DUST = 500;
  const dpos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST * 3; i++) dpos[i] = (Math.random() - 0.5) * 16;
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xf7c03e, size: 0.02, transparent: true, opacity: 0.35,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));

  const group = new THREE.Group();
  group.add(sphere, dust);
  group.position.x = 2.2;
  scene.add(group);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    group.position.x = w > 960 ? 2.2 : 0;
  }
  resize();
  window.addEventListener('resize', resize);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  });

  const clock = new THREE.Clock();
  let inView = true;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0 })
    .observe(canvas);

  renderer.setAnimationLoop(() => {
    if (!inView) return;
    const t = clock.getElapsedTime();
    sphere.rotation.y = t * 0.06;
    sphere.rotation.x = Math.sin(t * 0.12) * 0.08;
    dust.rotation.y = -t * 0.02;
    group.rotation.x += (my * 0.25 - group.rotation.x) * 0.04;
    group.rotation.z += (mx * 0.12 - group.rotation.z) * 0.04;
    renderer.render(scene, camera);
  });

  // gentle parallax out on scroll
  gsap.to(group.position, {
    y: 1.6,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ═══════════ helpers ═══════════ */
function splitIntoLines(el) {
  // wrap each word, measure line breaks, group into masked lines.
  // Element children (e.g. the script-accent <em>) are kept intact as single units.
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = [];
  [...el.childNodes].forEach(n => {
    if (n.nodeType === Node.TEXT_NODE) {
      n.textContent.split(/\s+/).filter(Boolean).forEach(w =>
        parts.push(`<span class="w" style="display:inline-block">${esc(w)}</span>`));
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      n.style.display = 'inline-block';
      n.classList.add('w');
      parts.push(n.outerHTML);
    }
  });
  el.innerHTML = parts.join(' ');
  const spans = [...el.querySelectorAll(':scope > .w')];
  // tolerance scales with font size — the script accent sits on the same visual
  // line but its box top differs from the serif words'
  const tol = parseFloat(getComputedStyle(el).fontSize) * 0.75;
  const lines = [];
  let top = null, current = [];
  spans.forEach(s => {
    if (top === null || Math.abs(s.offsetTop - top) > tol) { top = s.offsetTop; current = []; lines.push(current); }
    current.push(s);
  });
  el.innerHTML = lines.map(line =>
    `<span class="sl-line"><span class="sl-inner">${line.map(s => s.outerHTML).join(' ')}</span></span>`
  ).join('');
  return [...el.querySelectorAll('.sl-inner')];
}

/* nav theme + scrolled state — measured live so layout shifts can't break it */
function initNavTheme() {
  const nav = document.getElementById('nav');
  const lights = [...document.querySelectorAll('.section-light, .marquee-band')];
  const update = () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
    const probe = 60; // y position the nav content sits at
    const onLight = lights.some(sec => {
      const r = sec.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe;
    });
    nav.classList.toggle('on-light', onLight);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ═══════════ GSAP choreography ═══════════ */
function initAnimations() {
  /* preloader + hero intro */
  const intro = gsap.timeline();
  intro
    .from('.preloader .pre-first', { y: 40, opacity: 0, duration: .7, ease: 'power3.out' })
    .from('.preloader .pre-script', { y: 30, opacity: 0, duration: .7, ease: 'power3.out' }, '-=.45')
    .to('.preloader', { yPercent: -100, duration: .9, ease: 'power4.inOut', delay: .35 })
    .set('.preloader', { display: 'none' })
    .from('.hero-label', { x: -30, opacity: 0, duration: .6, ease: 'power3.out' }, '-=.5')
    .from('.ht-word', { yPercent: 130, duration: 1.1, stagger: .12, ease: 'power4.out' }, '-=.4')
    .from('.hero-sub, .hero-meta', { y: 24, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' }, '-=.6')
    .from('.hero-photo', { x: 80, opacity: 0, duration: 1.1, ease: 'power3.out' }, '-=.9')
    .from('.nav', { y: -20, opacity: 0, duration: .6, ease: 'power3.out' }, '-=.8');

  /* split-line headline reveals */
  document.querySelectorAll('.split-lines, .about-title').forEach(el => {
    const inners = splitIntoLines(el);
    gsap.from(inners, {
      yPercent: 210, duration: 1, stagger: .1, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
  });

  /* paragraph + generic reveals */
  gsap.utils.toArray('.reveal-p, .about-langs, .skill-group, .logo-item, .cert-item, .pub-item').forEach((el, i) => {
    gsap.from(el, {
      y: 36, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* other engagements — cascade scrubbed to scroll */
  document.querySelectorAll('.engage-list').forEach(list => {
    const items = list.querySelectorAll(':scope > *');
    gsap.set(items, { autoAlpha: 0, y: 48 });
    gsap.to(items, {
      autoAlpha: 1, y: 0, ease: 'power2.out',
      stagger: .15, duration: .5,
      scrollTrigger: {
        trigger: list, start: 'top 92%', end: 'bottom 65%',
        scrub: 0.4,
      },
    });
  });

  /* curiosities — one-shot cascade, styles cleared so the CSS hover works */
  gsap.set('.curio-item', { autoAlpha: 0, y: 48 });
  ScrollTrigger.batch('.curio-item', {
    start: 'top 92%',
    once: true,
    onEnter: (els) => gsap.to(els, {
      autoAlpha: 1, y: 0, duration: .9, ease: 'power3.out',
      stagger: .1, clearProps: 'all',
    }),
  });

  /* about trend chart — axes draw in, line rises with scroll */
  const acLine = document.querySelector('.ac-line');
  if (acLine) {
    const prep = (el) => {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      return len;
    };
    ['.ac-axis-y', '.ac-axis-x'].forEach(s => prep(document.querySelector(s)));
    prep(acLine);
    gsap.set('.ac-grid line', { scaleX: 0, transformOrigin: 'left center' });
    gsap.set(['.ac-dot', '.ac-pulse'], { scale: 0, transformOrigin: 'center', opacity: 0 });

    const chartTl = gsap.timeline({
      scrollTrigger: { trigger: '.about-chart', start: 'top 85%', end: 'top 25%', scrub: 0.8 },
    });
    chartTl
      .to('.ac-axis-y', { strokeDashoffset: 0, duration: .5, ease: 'none' })
      .to('.ac-axis-x', { strokeDashoffset: 0, duration: .5, ease: 'none' }, '<.15')
      .to('.ac-grid line', { scaleX: 1, duration: .5, stagger: .06, ease: 'none' }, '<')
      .to('.ac-line', { strokeDashoffset: 0, duration: 1.6, ease: 'none' }, '-=.2')
      .to('.ac-area', { opacity: .1, duration: .5, ease: 'none' }, '-=.5')
      .to(['.ac-dot', '.ac-pulse'], { scale: 1, opacity: 1, duration: .3, ease: 'back.out(2)' }, '-=.1');

    // endless soft pulse on the endpoint (starts once dot is visible)
    ScrollTrigger.create({
      trigger: '.about-chart', start: 'top 30%', once: true,
      onEnter: () => gsap.fromTo('.ac-pulse',
        { scale: 1, opacity: .8 },
        { scale: 2.6, opacity: 0, duration: 1.6, repeat: -1, ease: 'power1.out', transformOrigin: 'center' }),
    });
  }

  /* counters */
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.dataset.count;
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(el, {
        innerText: target, duration: 1.6, ease: 'power2.out', snap: { innerText: 1 },
      }),
    });
  });

  /* ═══ THE AMPERSAND — & cuts through and pushes keywords apart ═══ */
  const amp = document.getElementById('ampMark');
  const rows = gsap.utils.toArray('.amp-row');
  const sideMargin = () => Math.max(window.innerWidth * 0.07, 20);
  // each word travels its own distance so both columns land flush-aligned
  const pushLeft = (i, el) => sideMargin() - el.getBoundingClientRect().left + (gsap.getProperty(el, 'x') || 0);
  const pushRight = (i, el) => (window.innerWidth - sideMargin()) - el.getBoundingClientRect().right + (gsap.getProperty(el, 'x') || 0);

  const ampTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.amp-section', start: 'top top',
      end: '+=2600', pin: true, scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  gsap.set(amp, { scale: 0, rotate: -20 });
  ampTl
    // rows drift in tight together
    .from(rows, { opacity: 0, yPercent: 40, stagger: .06, duration: .5, ease: 'power2.out' })
    // & punches through the middle
    .to(amp, { scale: 1, rotate: 0, duration: 1.4, ease: 'power3.inOut' }, '+=.1')
    // ...and pushes every left word left / right word right, staggered from center row
    .to('.amp-l', {
      x: pushLeft, duration: 1.4, ease: 'power3.inOut',
      stagger: { each: .07, from: 'center' },
    }, '<')
    .to('.amp-r', {
      x: pushRight, duration: 1.4, ease: 'power3.inOut',
      stagger: { each: .07, from: 'center' },
    }, '<')
    // slow breathing hold with slight parallax between rows
    .to(rows, { yPercent: (i) => (i - 3) * -6, duration: 1, ease: 'none' })
    .to('.amp-caption', { opacity: 1, y: -6, duration: .5, ease: 'power2.out' }, '-=.6')
    .to({}, { duration: .4 }); // resting beat before unpin

  /* timeline: progress line + item activation */
  gsap.to('#tlProgress', {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.tl', start: 'top 70%', end: 'bottom 55%', scrub: true },
  });
  gsap.utils.toArray('.tl-item').forEach(item => {
    gsap.from(item, {
      x: -40, opacity: 0, duration: .8, ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 80%' },
    });
    ScrollTrigger.create({
      trigger: item, start: 'top 62%',
      onEnter: () => item.classList.add('active'),
      onLeaveBack: () => item.classList.remove('active'),
    });
  });

  /* project cards */
  gsap.utils.toArray('.card').forEach(card => {
    gsap.from(card, {
      y: 60, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: card, start: 'top 88%' },
    });
  });

  /* marquees — scroll-velocity driven drift */
  const m1 = gsap.to('#marquee1', { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
  const m2 = gsap.fromTo('#marquee2', { xPercent: -50 }, { xPercent: 0, ease: 'none', duration: 34, repeat: -1 });
  ScrollTrigger.create({
    trigger: '.marquee-band', start: 'top bottom', end: 'bottom top',
    onUpdate: self => {
      const v = 1 + Math.min(Math.abs(self.getVelocity()) / 900, 3);
      gsap.to([m1, m2], { timeScale: v, duration: .4, overwrite: true });
    },
  });

  /* courses accordion reveal */
  gsap.utils.toArray('.acc-item').forEach(item => {
    gsap.from(item, {
      y: 30, opacity: 0, duration: .8, ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 90%' },
    });
  });

  /* contact big reveal */
  gsap.from('.ct-line', {
    yPercent: 60, opacity: 0, duration: 1.1, stagger: .12, ease: 'power4.out',
    scrollTrigger: { trigger: '.contact', start: 'top 70%' },
  });
  gsap.from('.contact-email, .contact-links', {
    y: 24, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact-title', start: 'top 60%' },
  });
}

/* courses accordion toggle (works with or without reduced motion) */
function initAccordion() {
  document.querySelectorAll('.acc-item').forEach(item => {
    const head = item.querySelector('.acc-head');
    const body = item.querySelector('.acc-body');
    head.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      head.setAttribute('aria-expanded', open);
      gsap.to(body, {
        height: open ? 'auto' : 0,
        duration: prefersReduced ? 0 : .55,
        ease: 'power3.inOut',
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
  });
}

/* debug handle (harmless in prod) */
window.__gsap = gsap;
window.__ST = ScrollTrigger;

/* ═══════════ boot ═══════════ */
initThree();
if (prefersReduced) {
  document.getElementById('preloader').style.display = 'none';
  document.body.classList.add('reduced-motion');
  initNavTheme();
  initAccordion();
} else {
  window.addEventListener('load', () => {
    initNavTheme();
    initAccordion();
    initAnimations();
    ScrollTrigger.refresh();
  });
}
