/* jacobcritch.com: interactions.
   Works without JS/CDN libs; motion enhancements only when allowed. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = reduceMQ.matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Clock (St. John's, NT) + year ---------- */
  const clocks = document.querySelectorAll('.js-clock');
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/St_Johns', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => {
    const now = new Date();
    const t = fmt.format(now);
    clocks.forEach((el) => { el.textContent = t; el.setAttribute('datetime', now.toISOString()); });
  };
  tick(); setInterval(tick, 15000);
  document.querySelectorAll('.js-year').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Spotify facade (no third-party load until clicked) ---------- */
  document.querySelectorAll('.js-embed').forEach((wrap) => {
    const btn = wrap.querySelector('.embed__facade');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = wrap.dataset.src;
      iframe.title = 'Spotify player: Forever by Jacob Critch';
      iframe.loading = 'lazy';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      wrap.replaceChildren(iframe);
      iframe.focus();
    });
  });

  /* ---------- Active nav link ---------- */
  const navLinks = [...document.querySelectorAll('.nav__link')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Marquees: clone groups so the loop is seamless ---------- */
  const marquees = [...document.querySelectorAll('.marquee')];
  const buildMarquee = (m) => {
    const track = m.querySelector('.marquee__track');
    const group = track.querySelector('.marquee__group');
    if (!group || track.dataset.built) return;
    // Repeat the group until one "half" is wider than the viewport, then duplicate that half.
    const vw = Math.max(window.innerWidth, 800);
    const half = document.createElement('div');
    half.className = 'marquee__group';
    let w = 0, guard = 0;
    while (w < vw * 1.1 && guard < 12) {
      [...group.children].forEach((c) => half.appendChild(c.cloneNode(true)));
      track.replaceChildren(half);
      w = half.getBoundingClientRect().width; guard++;
    }
    const clone = half.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    track.dataset.built = '1';
    m.style.setProperty('--dur', (m.dataset.speed || 40) + 's');
  };
  if (!reduce) marquees.forEach(buildMarquee);

  /* ---------- Waveform canvas motif ---------- */
  const canvas = document.querySelector('.js-wave');
  let waveEnergy = 0; // boosted by scroll velocity
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, t0 = performance.now();
    let mouseX = -9999, targetMouseX = -9999;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(performance.now());
    };
    // Deterministic pseudo-random per bar for an organic "song" envelope
    const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const fmtTime = (s) => { const m = Math.floor(s / 60); const r = Math.floor(s % 60); return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0'); };
    const LOOP = 14; // seconds per playhead pass
    const SONG = 198; // "Forever" length in seconds (3:18), shown as timecode
    function draw(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const step = W < 600 ? 5 : 6;
      const bw = W < 600 ? 2 : 2;
      const n = Math.floor(W / step);
      const mid = H * 0.56;
      const prog = reduce ? 0.62 : ((t % LOOP) / LOOP);
      const px = prog * W;
      mouseX += (targetMouseX - mouseX) * 0.12;
      waveEnergy *= 0.94;
      for (let i = 0; i < n; i++) {
        const x = i * step + (W - n * step) / 2;
        const u = i / n;
        // song-like envelope: verses/chorus swells
        const env = 0.35 + 0.65 * Math.pow(Math.sin(u * Math.PI * 3.2 + 0.6) * 0.5 + 0.5, 1.6);
        const r = rand(i);
        const live = reduce ? 0 : Math.sin(t * 3 + i * 0.35) * 0.18 + Math.sin(t * 1.3 + i * 0.11) * 0.12;
        const near = Math.exp(-Math.pow((x - mouseX) / 90, 2)) * 0.9;
        const nearHead = Math.exp(-Math.pow((x - px) / 40, 2)) * 0.35;
        let h = (0.18 + r * 0.55 + live) * env + near + nearHead + waveEnergy * 0.5 * r;
        h = Math.max(0.04, Math.min(1, h)) * (H * 0.46);
        ctx.fillStyle = x <= px ? '#121212' : 'rgba(18,18,18,0.16)';
        ctx.fillRect(x, mid - h, bw, h * 2 * 0.78); // asymmetric mirror (reflection)
      }
      // playhead
      ctx.fillStyle = '#50b1fa';
      ctx.fillRect(px, 6, 1, H - 12);
      ctx.beginPath(); ctx.arc(px, 6, 3, 0, Math.PI * 2); ctx.fill();
      // timecode
      ctx.font = '400 10px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = '#555';
      const label = fmtTime(prog * SONG) + ' / ' + fmtTime(SONG);
      const tw = ctx.measureText(label).width;
      const lx = Math.min(Math.max(px + 8, 8), W - tw - 8);
      ctx.fillText(label, lx, 16);
    }
    const loop = (now) => { draw(now); if (visible && !reduce) raf = requestAnimationFrame(loop); };
    resize();
    window.addEventListener('resize', () => { resize(); }, { passive: true });
    if (!reduce) {
      const hero = document.querySelector('.hero');
      hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); targetMouseX = e.clientX - r.left; }, { passive: true });
      hero.addEventListener('pointerleave', () => { targetMouseX = -9999; });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          cancelAnimationFrame(raf);
          if (visible) raf = requestAnimationFrame(loop);
        }).observe(canvas);
      } else { raf = requestAnimationFrame(loop); }
      document.addEventListener('visibilitychange', () => {
        cancelAnimationFrame(raf);
        if (!document.hidden && visible) raf = requestAnimationFrame(loop);
      });
    } else {
      document.fonts && document.fonts.ready.then(() => draw(performance.now()));
    }
  }

  /* ---------- Custom cursor ---------- */
  if (finePointer && !reduce) {
    const cursor = document.querySelector('.cursor');
    const dot = cursor && cursor.querySelector('.cursor__dot');
    if (dot) {
      doc.classList.add('has-cursor');
      let x = -100, y = -100, cx = -100, cy = -100;
      window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; cursor.classList.remove('is-hidden'); }, { passive: true });
      document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
      const follow = () => {
        cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
        dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        requestAnimationFrame(follow);
      };
      requestAnimationFrame(follow);
      document.addEventListener('pointerover', (e) => {
        if (e.target.closest('a, button')) cursor.classList.add('is-hover');
      });
      document.addEventListener('pointerout', (e) => {
        if (e.target.closest('a, button')) cursor.classList.remove('is-hover');
      });
    }
  }

  /* ---------- Motion: Lenis + GSAP ---------- */
  if (reduce || !hasGSAP) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  doc.classList.add('motion', 'gsap-on');

  // Smooth scroll
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, anchors: { offset: -60 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Split headings into words (keeps <br> and inline spans)
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = p;
            w.appendChild(inner); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  };
  document.querySelectorAll('.split').forEach(splitWords);
  gsap.set('.split .w > span', { y: 0, yPercent: 105 });
  document.querySelectorAll('.split').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(el.querySelectorAll('.w > span'), { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.04, overwrite: true }),
    });
  });

  // Hero intro
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('.hero__title .line__inner', { yPercent: 110, duration: 1.5, stagger: 0.09 }, 0.1)
    .from('.hero__meta > *', { opacity: 0, y: 10, duration: 1, stagger: 0.06 }, 0.3)
    .from('.hero__sub > *', { opacity: 0, y: 20, duration: 1.2, stagger: 0.1 }, 0.55)
    .from('.hero__wave', { opacity: 0, duration: 1.6 }, 0.6)
    .from('.hero__bar', { opacity: 0, duration: 1 }, 0.8);

  // Hero title parallax on scroll
  gsap.to('.hero__title', {
    yPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Reveal batches
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });

  // Count-up stats
  document.querySelectorAll('.js-count').forEach((el) => {
    const to = parseFloat(el.dataset.to || el.textContent);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const obj = { v: 0 };
    el.textContent = (0).toFixed(dec);
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(obj, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = obj.v.toFixed(dec); } }),
    });
  });

  // Marquees: GSAP loops whose speed reacts to scroll velocity
  const loops = marquees.map((m) => {
    const track = m.querySelector('.marquee__track');
    const rev = m.classList.contains('marquee--reverse');
    const dur = parseFloat(m.dataset.speed || 40);
    const tween = gsap.fromTo(track, { xPercent: rev ? -50 : 0 }, { xPercent: rev ? 0 : -50, duration: dur, ease: 'none', repeat: -1 });
    return tween;
  });
  let boost = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const v = Math.abs(self.getVelocity());
      boost = Math.min(v / 250, 6);
      waveEnergy = Math.min(1, waveEnergy + v / 6000);
    },
  });
  gsap.ticker.add(() => {
    boost *= 0.92;
    const ts = 1 + boost;
    loops.forEach((l) => l.timeScale(ts));
  });

  // Recompute after fonts load (line metrics change)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
