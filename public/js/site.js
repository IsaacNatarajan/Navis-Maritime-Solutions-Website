// Navis Maritime Solutions: site script
// Header, mobile menu, hero video, service slideshow, contact form,
// brochure button and the balanced text justification.
(function () {
  const header = document.querySelector('.hdr');
  const hero = document.querySelector('main .hero');
  let ticking = false;

  // Fade the photo as you scroll, and turn the header solid
  function update() {
    const y = window.scrollY;
    if (hero) {
      const h = hero.offsetHeight;
      hero.style.setProperty('--p', Math.min(1, Math.max(0, y / (h * 0.9))).toFixed(3));
      header.classList.toggle('solid', y > h * 0.3);
    } else {
      header.classList.add('solid');
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  window.addEventListener('resize', update);

  // Mobile menu
  document.querySelectorAll('.burger, .mnav-close').forEach(b => b.addEventListener('click', () => document.body.classList.toggle('menu-open')));

  // Contact form: sent through Web3Forms (the access key is added at launch)
  document.querySelectorAll('form.enquiry').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const note = f.querySelector('.form-note');
    const say = (msg, ok) => { if (note) { note.hidden = false; note.textContent = msg; note.classList.toggle('err', !ok); } };
    const key = (f.querySelector('[name="access_key"]') || {}).value;
    if (!key) { say('The form is not connected yet. Please email or call us directly.', false); return; }
    const btn = f.querySelector('button[type="submit"]'); if (btn) btn.disabled = true;
    try {
      const r = await fetch(f.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success !== false) { f.reset(); say('Thank you. Your enquiry has been sent and our team will get back to you shortly.', true); }
      else say('Sorry, something went wrong. Please email or call us directly.', false);
    } catch (err) { say('Sorry, the message could not be sent. Please check your connection or email us directly.', false); }
    if (btn) btn.disabled = false;
  }));

  // Gentle reveal of sections as they come into view
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' }) : null;
  document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  // Hero video: phones get the taller cut, larger screens the wide one.
  // It plays for everyone (slow and calm) and a pause button lets any visitor stop it.
  (function () {
    const v = document.querySelector('.hero-video');
    if (!v) return;
    const small = window.matchMedia && window.matchMedia('(max-width: 1000px)').matches;
    const btn = document.querySelector('.vid-toggle');
    let userPaused = false;
    function tryPlay() { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    v.src = (small && v.dataset.srcM) || v.dataset.src;
    v.addEventListener('canplay', () => { if (!userPaused) tryPlay(); });
    tryPlay();
    if (btn) {
      btn.addEventListener('click', () => {
        if (v.paused) { userPaused = false; tryPlay(); } else { userPaused = true; v.pause(); }
      });
      v.addEventListener('play', () => { btn.setAttribute('aria-label', 'Pause background video'); btn.dataset.state = 'playing'; });
      v.addEventListener('pause', () => { btn.setAttribute('aria-label', 'Play background video'); btn.dataset.state = 'paused'; });
    }
    const kick = e => { if (btn && e.target && btn.contains(e.target)) return; if (v.paused && !userPaused) tryPlay(); };
    ['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach(ev => window.addEventListener(ev, kick, { passive: true }));
  })();

  // Service showcase: moves to the next service on its own every few seconds
  // (a gold bar shows the timing); visitors can also click a service, use the
  // arrows, swipe on phones, or pause it.
  document.querySelectorAll('.svc-show').forEach(root => {
    const slides = [...root.querySelectorAll('.sh-slide')];
    const items = [...root.querySelectorAll('.sh-item')];
    const dots = [...root.querySelectorAll('.sh-dots span')];
    const media = root.querySelector('.sh-media');
    if (!slides.length) return;
    const DUR = 4500;   // 4.5 seconds per service
    let i = 0, t0 = performance.now(), userPaused = false, hoverHold = false;
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { const on = k === i; s.classList.toggle('on', on); s.setAttribute('aria-hidden', on ? 'false' : 'true');
        const a = s.querySelector('a'); if (a) a.tabIndex = on ? 0 : -1; });
      items.forEach((b, k) => { b.classList.toggle('on', k === i); b.style.setProperty('--prog', 0); });
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      t0 = performance.now();
    }
    items.forEach((b, k) => b.addEventListener('click', () => show(k)));
    root.querySelector('.sh-b.prev').addEventListener('click', () => show(i - 1));
    root.querySelector('.sh-b.next').addEventListener('click', () => show(i + 1));
    // swipe
    let sx = null;
    media.addEventListener('pointerdown', e => { sx = e.clientX; });
    media.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 45) show(i + (dx < 0 ? 1 : -1)); });
    let last = performance.now();
    function tick(now) {
      const dt = now - last; last = now;
      const visible = !root.closest('[hidden]') && !document.hidden;
      if (userPaused || hoverHold || !visible) t0 += dt;          // freeze the timer
      const p = Math.min(1, (now - t0) / DUR);
      if (items[i]) items[i].style.setProperty('--prog', p.toFixed(3));
      if (p >= 1) show(i + 1);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // Brochure button (preview): the PDF is added once it is ready
  document.querySelectorAll('[data-brochure]').forEach(a => a.addEventListener('click', e => {
    if (a.getAttribute('href') === '#') { e.preventDefault(); const n = a.closest('.br-text').querySelector('.br-note'); if (n) n.hidden = false; }
  }));

  // Make the Arabic company name exactly as wide as the English one
  function fitBrand() {
    document.querySelectorAll('.brand').forEach(b => {
      const en = b.querySelector('.en'), ar = b.querySelector('.ar');
      if (!en || !ar) return;
      ar.style.fontSize = '';
      const we = en.getBoundingClientRect().width, wa = ar.getBoundingClientRect().width;
      if (we > 0 && wa > 0) ar.style.fontSize = (parseFloat(getComputedStyle(ar).fontSize) * we / wa).toFixed(2) + 'px';
    });
  }
  window.addEventListener('resize', fitBrand);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBrand);

  // Justified text in key paragraphs (laptops/desktops only).
  // Line breaks are chosen so the spare space is shared evenly between all
  // lines, and only the gaps between words grow (letters are never spaced
  // out and words are never split). If a paragraph would need wide gaps,
  // it simply stays left-aligned.
  const JSEL = '[data-page="home"] .split:not(.intro-split) > div > p, .intro-split .intro-body, .svc-detail .sd-block p';
  const originals = new WeakMap();
  let measure;
  function justify() {
    const wide = window.innerWidth > 1000;
    document.querySelectorAll(JSEL).forEach(p => {
      if (originals.has(p)) { p.textContent = originals.get(p); originals.delete(p); }
      p.classList.remove('jw');
      if (!wide || p.children.length) return;
      p.classList.add('jw');                         // normal letter/word spacing while measuring
      const text = p.textContent.replace(/\s+/g, ' ').trim();
      const cs = getComputedStyle(p);
      const W = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!text || W <= 0) { p.classList.remove('jw'); return; }
      const fs = parseFloat(cs.fontSize) || 16;
      const ctx = measure || (measure = document.createElement('canvas').getContext('2d'));
      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const words = text.split(' '), n = words.length;
      const ww = words.map(w => ctx.measureText(w).width), sp = ctx.measureText(' ').width;
      const LCAP = fs * 0.018;                       // tiny letter spacing cap (about 0.3 px, not visible)
      const Wmax = W - 1, best = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(0);
      const need = (a, b) => {                       // extra space per word gap for words a..b-1 on one line
        let w = -sp, chars = -1; for (let k = a; k < b; k++) { w += ww[k] + sp; chars += words[k].length + 1; }
        const slack = Math.max(Wmax - w, 0), gaps = Math.max(b - a - 1, 1);
        return { w, slack, chars, gaps, per: Math.max(slack - LCAP * chars, 0) / gaps };
      };
      best[0] = 0;
      for (let i = 0; i < n; i++) {
        if (best[i] === Infinity) continue;
        for (let j = i + 1; j <= n; j++) {
          const L = need(i, j);
          if (L.w > Wmax && j > i + 1) break;
          const cost = best[i] + (j === n ? 0 : Math.pow(L.per / fs * 10, 3));
          if (cost < best[j]) { best[j] = cost; from[j] = i; }
        }
      }
      const lines = [];
      for (let j = n; j > 0; j = from[j]) lines.unshift([from[j], j]);
      if (lines.length < 2) { p.classList.remove('jw'); return; }
      const worst = Math.max(...lines.slice(0, -1).map(([a, b]) => need(a, b).per));
      if (worst > fs * 0.3) { p.classList.remove('jw'); return; }   // would look gappy: keep left-aligned
      originals.set(p, p.textContent);
      p.textContent = '';
      lines.forEach(([a, b], k) => {
        const span = document.createElement('span');
        span.className = 'jl';
        span.textContent = words.slice(a, b).join(' ');
        span.style.width = 'max-content';
        p.appendChild(span);
        if (k === lines.length - 1) { span.style.width = ''; return; }
        const natural = span.getBoundingClientRect().width;
        span.style.width = '';
        const slack = W - natural - 0.5;
        if (slack <= 0) return;
        const chars = span.textContent.length - 1, gaps = Math.max(b - a - 1, 1);
        const ls = Math.min(slack / Math.max(chars, 1), LCAP);
        const ws = (slack - ls * chars) / gaps;
        span.style.letterSpacing = ls.toFixed(3) + 'px';
        span.style.wordSpacing = ws.toFixed(3) + 'px';
      });
      p.classList.add('jw');
    });
  }
  let jTimer;
  window.addEventListener('resize', () => { clearTimeout(jTimer); jTimer = setTimeout(justify, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => justify());

  update();
  fitBrand();
  requestAnimationFrame(justify);
})();
