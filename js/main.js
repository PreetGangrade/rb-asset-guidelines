/* ============================================================
   main.js — all interaction + scroll choreography (GSAP 3 + ScrollTrigger).
   Structure, top to bottom:
     1. reduced-motion + no-GSAP static fallback
     2. --hs canvas scale (min(viewportWidth, 2560) / 1440)
     3. scribble "boil" ticker (steps SVG turbulence seeds)
     4. per-section timelines, in page order:
        hero -> truth -> uba -> rule-of-thumb -> device stack
     5. section hand-offs (exit fades, scrubbed to scroll)
   Conventions:
     - entrances fire once (ScrollTrigger once:true)
     - exits are scrubbed fromTo tweens with explicit rest values,
       so reverse-scrolling always restores the section
   ============================================================ */

(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('reduced');

  /* footer logo: clone nav logo paths (avoid duplicating markup) */
  var navSvg = document.querySelector('.fg-logo svg');
  var footSvg = document.querySelector('.footer-logo svg');
  if (navSvg && footSvg){ footSvg.innerHTML = navSvg.innerHTML; }

  /* prep draw-on paths */
  document.querySelectorAll('.sketch .draw').forEach(function(p){
    var len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.dataset.len = len;
  });
  document.querySelectorAll('.sketch .stext, .sketch .chip').forEach(function(el){ el.style.opacity = 0; });

  function setHeroScale(){
    /* canvas scale: fluid from small laptops up to a 2560px (2K) cap */
    /* contain: fit the 1440x800 stage inside the viewport (capped 2560 wide) so
       the section's built-in top/bottom padding always reads as breathing room */
    var w = Math.min(window.innerWidth, 2560);
    var hs = Math.min(w / 1440, window.innerHeight / 800);
    document.documentElement.style.setProperty('--hs', String(hs));
  }
  setHeroScale();
  window.addEventListener('resize', setHeroScale);

  /* the orbit hero IS the hero (Preet, Aug 2026). The classic hero and its
     code paths are kept but never shown; the nav toggle pill was removed. */
  var heroMode = 'orbit';
  document.documentElement.classList.add('hero-orbit-mode');

  if (reduced || typeof gsap === 'undefined'){
    /* static fallback: stack pinned sections, show everything drawn */
    document.documentElement.classList.add('reduced');
    document.querySelectorAll('.sketch .draw').forEach(function(p){ p.style.strokeDashoffset = 0; });
    document.querySelectorAll('.sketch .stext, .sketch .chip').forEach(function(el){ el.style.opacity = 1; });
    document.querySelectorAll('.compare-card').forEach(function(c){ c.style.clipPath = 'inset(0 0 0 0)'; });
    document.querySelectorAll('#manifesto').forEach(function(m){ m.style.color = 'inherit'; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  /* one debounced refresh on resize only — never on interaction */
  var __rbResizeRefresh;
  window.addEventListener('resize', function(){
    clearTimeout(__rbResizeRefresh);
    __rbResizeRefresh = setTimeout(function(){ ScrollTrigger.refresh(); }, 250);
  });
  gsap.defaults({ ease: 'power4.out' });

  /* hand-drawn boil: step every scribble's turbulence seed, frame-by-frame */
  (function(){
    var turbs = ['uba-turb', 'turb-sm', 'turb-lg']
      .map(function(id){ return document.getElementById(id); })
      .filter(Boolean);
    if (!turbs.length) return;
    var seeds = [2, 7, 13, 19, 5], si = 0;
    gsap.delayedCall(0.16, function tick(){
      si = (si + 1) % seeds.length;
      turbs.forEach(function(t){ t.setAttribute('seed', seeds[si]); });
      gsap.delayedCall(0.16, tick);
    });
  })();

  /* ---------- split helpers ---------- */
  function splitChars(el){
    var text = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = '';
    var chars = [];
    text.forEach(function(line, li){
      if (li > 0) el.appendChild(document.createElement('br'));
      line.replace(/&nbsp;/g,'\u00A0').split('').forEach(function(c){
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        el.appendChild(s);
        chars.push(s);
      });
    });
    return chars;
  }
  function splitWords(el, cls){
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function(w){ return '<span class="' + cls + '">' + w + '</span>'; }).join(' ');
    return el.querySelectorAll('.' + cls.split(' ')[0]);
  }
  function wrapReveal(el){
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function(w){
      return '<span class="wline"><span class="winner">' + w + '</span></span>';
    }).join(' ');
    return el.querySelectorAll('.winner');
  }

  /* ---------- hero (fig): intro + frame 1-2-3 scroll (classic mode only) ---------- */
  if (heroMode === 'classic'){
  gsap.set('.fg-copy > *', { y: 24, opacity: 0 });
  gsap.set('.fg-monitor', { y: 110, opacity: 0 });
  gsap.timeline({ delay: .12 })
    .to('.fg-copy > *', { y: 0, opacity: 1, duration: .9, stagger: .09 })
    .to('.fg-monitor', { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' }, '-=0.75');

  var hstates = gsap.utils.toArray('.fg-state');
  if (hstates.length === 3){
    var htl = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero-fig',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6
      },
      defaults: { ease: 'none' }
    });
    htl.to({}, { duration: 1 }); /* hold frame 1 */
    [1, 2].forEach(function(i){
      htl.addLabel('h' + i)
        .to(hstates[i-1], { opacity: 0, duration: .5 }, 'h' + i)
        .fromTo(hstates[i], { opacity: 0 }, { opacity: 1, duration: .5 }, 'h' + i + '+=0.12')
        .to({}, { duration: 1 }); /* hold */
    });
  }
  }

  /* ---------- footer: springy arrival + morphing word ---------- */
  if (document.querySelector('.footer-card')){
    gsap.set('.footer-card', { y: 150, opacity: 0 });
    gsap.set(['.fc-head > *', '.fc-bottom > *'], { y: 40, opacity: 0 });

    var fcWords = ['stories', 'moments', 'experiences', 'worlds'];
    var fcEl = document.getElementById('fc-word');
    function fcSplit(word){
      fcEl.innerHTML = word.split('').map(function(ch){
        return '<span class="fc-ch">' + ch + '</span>';
      }).join('');
      return fcEl.querySelectorAll('.fc-ch');
    }
    var fcIndex = 0;
    fcSplit(fcWords[0]);

    function fcCycle(){
      gsap.to(fcEl.querySelectorAll('.fc-ch'), {
        y: -34, opacity: 0, filter: 'blur(6px)', duration: .38,
        ease: 'power2.in', stagger: .032,
        onComplete: function(){
          fcIndex = (fcIndex + 1) % fcWords.length;
          gsap.fromTo(fcSplit(fcWords[fcIndex]),
            { y: 38, opacity: 0, filter: 'blur(6px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: .6, ease: 'back.out(1.7)', stagger: .038 });
          gsap.delayedCall(2.6, fcCycle);
        }
      });
    }

    ScrollTrigger.create({
      trigger: '.footer', start: 'top 70%', once: true,
      onEnter: function(){
        gsap.timeline()
          .to('.footer-card', { y: 0, opacity: 1, duration: 1.25, ease: 'back.out(1.2)' })
          .to('.fc-head > *', { y: 0, opacity: 1, duration: .9, ease: 'back.out(1.6)', stagger: .1 }, '-=0.75')
          .to('.fc-bottom > *', { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .08 }, '-=0.55');
        gsap.delayedCall(3, fcCycle);
      }
    });
  }

  /* ---------- generic reveals ---------- */
  document.querySelectorAll('[data-reveal]').forEach(function(h){
    var winners = wrapReveal(h);
    gsap.fromTo(winners, { yPercent: 120 }, {
      yPercent: 0, duration: .9, stagger: .06,
      scrollTrigger: { trigger: h, start: 'top 85%', once: true }
    });
  });
  document.querySelectorAll('[data-fade]').forEach(function(el){
    gsap.fromTo(el, { y: 28, opacity: 0 }, {
      y: 0, opacity: 1, duration: .95,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---------- truth flow: staged statement scrub ---------- */
  var tStages = gsap.utils.toArray('.t-stage');
  if (tStages.length === 3){
    document.querySelectorAll('.t-copy').forEach(function(p){
      ['lead', 'rest'].forEach(function(cls){
        var el = p.querySelector('.' + cls);
        var color = cls === 'lead' ? '#ffffff' : 'rgba(255,255,255,0.6)';
        el.innerHTML = el.textContent.trim().split(/\s+/).map(function(w){
          return '<span class="tw" data-c="' + color + '">' + w + '</span>';
        }).join(' ') + (cls === 'lead' ? ' ' : '');
      });
    });
    var finalColor = function(i, el){ return el.getAttribute('data-c'); };
    gsap.set('.t-copy .tw', { color: 'rgba(234,243,252,0.14)' });
    gsap.set('.t-under', { clipPath: 'inset(0% 100% 0% 0%)' });

    /* scribble positions are measured from the real word boxes so they are
       correct at any viewport / after web fonts load: the circle wraps
       "press play." (never covering a letter), and ONE continuous underline
       runs beneath the whole "The right artwork" lead. */
    function tPlaceScribbles(){
      var ws = tStages[0].querySelectorAll('.rest .tw');
      var a = ws[ws.length - 2], b = ws[ws.length - 1];
      var left = Math.min(a.offsetLeft, b.offsetLeft);
      var right = Math.max(a.offsetLeft + a.offsetWidth, b.offsetLeft + b.offsetWidth);
      var top = Math.min(a.offsetTop, b.offsetTop);
      var bottom = Math.max(a.offsetTop + a.offsetHeight, b.offsetTop + b.offsetHeight);
      /* an ellipse through the corners of the word box must be ~1.4x the
         box itself, otherwise its arc cuts through the letters. Size the
         scribble from the word box CENTRE outward accordingly. */
      var cx = (left + right) / 2, cy = (top + bottom) / 2;
      var ew = (right - left) * 1.34 + 16, eh = (bottom - top) * 2.2;
      var circ = tStages[0].querySelector('.t-circle');
      circ.style.left = (cx - ew / 2) + 'px';
      circ.style.top = (cy - eh / 2) + 'px';
      circ.style.width = ew + 'px';
      circ.style.height = eh + 'px';
      var lws = tStages[1].querySelectorAll('.lead .tw');
      var f = lws[0], l = lws[lws.length - 1];
      var u1 = tStages[1].querySelector('.t-under.u1');
      u1.style.left = (f.offsetLeft - 3) + 'px';
      u1.style.top = (f.offsetTop + f.offsetHeight - 5) + 'px';
      u1.style.width = (l.offsetLeft + l.offsetWidth - f.offsetLeft + 6) + 'px';
    }
    tPlaceScribbles();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(tPlaceScribbles);
    ['t-circ-path', 't-arrow-path', 't-arrow-head'].forEach(function(id){
      var p = document.getElementById(id);
      var l = p.getTotalLength();
      /* gap longer than the path: no dash (and no round-cap dot) exists on
         the path at rest — the line only appears once the offset animates */
      p.style.strokeDasharray = l + 'px ' + (l + 12) + 'px';
      p.style.strokeDashoffset = (l + 6) + 'px';
      p.dataset.len = l;
    });

    var ttl = gsap.timeline({
      scrollTrigger: { trigger: '.truth', start: 'top top', end: 'bottom bottom', scrub: 0.5 },
      defaults: { ease: 'none' }
    });

    /* stage 1 — words light up, then the circle is drawn around "press play." */
    ttl.addLabel('s1')
       .to(tStages[0].querySelectorAll('.tw'), { color: finalColor, duration: .5, stagger: .12 }, 's1')
       .to('#t-circ-path', { strokeDashoffset: 0, duration: .8, ease: 'none' }, '>-0.15')
       .to({}, { duration: .9 })
       .to(tStages[0], { opacity: 0, y: -30, duration: .5 });

    /* stage 2 — underline strokes follow the lead words */
    ttl.set(tStages[1], { opacity: 1 })
       .addLabel('s2')
       .to(tStages[1].querySelectorAll('.tw'), { color: finalColor, duration: .5, stagger: .09 }, 's2')
       .to('.t-under.u1', { clipPath: 'inset(0% 0% 0% 0%)', duration: .4, ease: 'power1.out' }, 's2+=0.12')
       .to({}, { duration: .9 })
       .to(tStages[1], { opacity: 0, y: -30, duration: .5 });

    /* stage 3 — the arrow doodle lands on "That is why". It draws WITH the
       lead words (not after the whole sentence), so it is on screen while
       you are still reading the line instead of arriving after you have
       scrolled past it. */
    ttl.set(tStages[2], { opacity: 1 })
       .addLabel('s3')
       .to(tStages[2].querySelectorAll('.tw'), { color: finalColor, duration: .5, stagger: .1 }, 's3')
       .to('#t-arrow-path', { strokeDashoffset: 0, duration: .45, ease: 'none' }, 's3+=0.1')
       .to('#t-arrow-head', { strokeDashoffset: 0, duration: .15, ease: 'none' }, 's3+=0.55')
       .to({}, { duration: 1.4 });
  }

  /* ---------- uba hero: floats settle first, type + marks near the top ---------- */
  if (document.querySelector('.uba-hero')){
    var floats = gsap.utils.toArray('.uba-float');
    /* fromTo everywhere below: from() tweens re-capture their end values on
       ScrollTrigger refresh AFTER the from-state was applied, which can
       freeze elements at the from-state (Preet saw a.uba-btn stuck at
       translate(0,26px)). Explicit end values are immune to that. */
    gsap.fromTo(floats, { opacity: 0, y: 46 }, {
      opacity: .1, y: 0, duration: 1.2, ease: 'power4.out', stagger: 0.06,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 35%', once: true },
      onComplete: function(){
        floats.forEach(function(el, i){
          gsap.to(el, {
            y: (i % 2 ? '+=' : '-=') + (7 + (i % 3) * 3),
            duration: 3.6 + (i % 4) * 0.7,
            ease: 'sine.inOut', yoyo: true, repeat: -1
          });
        });
      }
    });
    ['uba-mark-l', 'uba-mark-r', 'uba-mark-l2', 'uba-mark-r2'].forEach(function(id){
      var p = document.getElementById(id);
      var l = p.getTotalLength();
      p.style.strokeDasharray = l + 'px ' + (l + 12) + 'px';
      p.style.strokeDashoffset = (l + 6) + 'px';
    });
    /* 'top 30%' (was 'top 12%'): the deep trigger could stay unfired in
       some sessions, leaving the from-state y:26 translate stuck on the
       eyebrow/sub/CTA and distorting the guide spacing (seen in Preet's
       DevTools as a persistent translate(0px, 26px) on a.uba-btn) */
    gsap.fromTo('.uba-title .winner', { y: 0, yPercent: 120 }, {
      y: 0, yPercent: 0, duration: .9, ease: 'power4.out', stagger: .08,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 30%', once: true }
    });
    gsap.to(['#uba-mark-l', '#uba-mark-r'], {
      strokeDashoffset: 0, duration: .55, ease: 'power1.inOut', delay: .6,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 30%', once: true }
    });
    gsap.to(['#uba-mark-l2', '#uba-mark-r2'], {
      strokeDashoffset: 0, duration: .4, ease: 'power1.out', delay: 1.05,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 30%', once: true }
    });
    gsap.fromTo(['.uba-eyebrow', '.uba-sub', '.uba-btn'], { y: 26, opacity: 0 }, {
      y: 0, opacity: 1, duration: .9, ease: 'power4.out', stagger: .1, delay: .2,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 30%', once: true }
    });

    /* blueprint guides: hairlines sweep across the canvas, the circle draws
       itself around the copy (Figma 914:19291) */
    gsap.set('.ug-h', { transformOrigin: 'left center' });
    gsap.set('.ug-v', { transformOrigin: 'center top' });
    var ugCirc = document.getElementById('ug-circ');
    var ugLen = ugCirc.getTotalLength();
    ugCirc.style.strokeDasharray = ugLen + 'px ' + (ugLen + 12) + 'px';
    ugCirc.style.strokeDashoffset = (ugLen + 6) + 'px';
    gsap.timeline({ scrollTrigger: { trigger: '.uba-hero', start: 'top 30%', once: true } })
      .to('.ug-h', { scaleX: 1, duration: 1.1, ease: 'power3.inOut', stagger: .12 }, 0)
      .to('.ug-v', { scaleY: 1, duration: 1.1, ease: 'power3.inOut', stagger: .12 }, .15)
      .to(ugCirc, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, .35);
    /* the guides exist ONLY while the section is centred (sticky pinned):
       they appear when the section reaches centre stage and fade the moment
       it moves away in either direction (intro draw still plays only once) */
    ScrollTrigger.create({
      trigger: '.uba-hero', start: 'top 30%', end: 'bottom 70%',
      onEnter: function(){ gsap.to('.uba-guides', { autoAlpha: 1, duration: .35, overwrite: 'auto' }); },
      onEnterBack: function(){ gsap.to('.uba-guides', { autoAlpha: 1, duration: .35, overwrite: 'auto' }); },
      onLeave: function(){ gsap.to('.uba-guides', { autoAlpha: 0, duration: .25, overwrite: 'auto' }); },
      onLeaveBack: function(){ gsap.to('.uba-guides', { autoAlpha: 0, duration: .25, overwrite: 'auto' }); }
    });

    /* ease off: the section dissolves upward as you leave it */
    gsap.timeline({
      scrollTrigger: { trigger: '.uba-hero', start: 'bottom 96%', end: 'bottom 45%', scrub: true },
      defaults: { ease: 'none' }
    })
      .fromTo('.uba-center', { y: 0, opacity: 1 }, { y: -70, opacity: 0, immediateRender: false }, 0)
      .fromTo(['.uba-mark', '.uba-guides'], { opacity: 1 }, { opacity: 0, immediateRender: false }, 0)
      .fromTo(floats, { opacity: .1 }, { opacity: 0, immediateRender: false }, 0);
  }

  /* rule of thumb eases in as it arrives */
  if (document.querySelector('.fo-stage')){
    gsap.fromTo('.fo-stage', { y: 54, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.1, ease: 'power4.out',
      scrollTrigger: { trigger: '.focal', start: 'top 72%', once: true }
    });
    gsap.fromTo('.fo-tabs', { y: 24, opacity: 0 }, {
      y: 0, opacity: 1, duration: .9, ease: 'power4.out', delay: .15,
      scrollTrigger: { trigger: '.focal', start: 'top 72%', once: true }
    });
    gsap.fromTo('.fo-heads', { y: 20, opacity: 0 }, {
      y: 0, opacity: 1, duration: .9, ease: 'power4.out', delay: .05,
      scrollTrigger: { trigger: '.focal', start: 'top 72%', once: true }
    });
  }

  /* ---------- section hand-offs: each pinned section eases away ---------- */
  if (heroMode === 'classic') gsap.timeline({
    scrollTrigger: { trigger: '.hero-fig', start: 'bottom 96%', end: 'bottom 50%', scrub: true },
    defaults: { ease: 'none' }
  })
    .fromTo('.fg-copy', { y: 0, opacity: 1 }, { y: -50, opacity: 0, duration: .45, immediateRender: false }, 0)
    .fromTo('.fg-nav:not(.fg-nav--float)', { y: 0, autoAlpha: 1 }, { y: -40, autoAlpha: 0, duration: .45, immediateRender: false }, 0)
    .fromTo('.fg-monitor', { y: 0, opacity: 1 }, { y: -30, opacity: 0, duration: .38, immediateRender: false }, 0)
    /* photo is fully gone before the surface melts — no cutout seams */
    .fromTo(['.hero-canvas', '.hero-sticky', '.hero-fig'], { backgroundColor: '#ffffff' }, { backgroundColor: '#000f1e', duration: .55, immediateRender: false }, .42);

  /* ---------- orbit hero: 1:1 field from Figma 903:54015 ----------
     The tile field is the designer's own composition, transcribed exactly:
     86 tiles, each with its position (offset from the 1440x800 frame
     centre), its own size, rotation and corner radius. DO NOT regenerate
     these positions procedurally; the source of truth is the Figma frame.

     Motion treats the field as one rigid body (positions never change
     relative to each other): a slow ~2deg/s turn at rest, and on scroll a
     camera dolly forward that scales radius and size by the same factor, so
     spacing is preserved at every depth. Each tile keeps its authored
     rotation. The centre glow matches the frame's radial gradient.

     Add or swap src per slot to change imagery; geometry stays authored. */
  if (heroMode === 'orbit' && document.querySelector('.hero-orbit')){
    var HO_FIELD = [
      { x:   -44.7, y:   134.0, w:  27.7, h:  40.2, rot:  31.35, rad: 2.7 , src: 'assets/img/ex-rbtv-1-960.webp' },
      { x:  -215.5, y:   161.1, w:  39.6, h:  57.5, rot:  65.25, rad: 4.1 , src: 'assets/img/ex-stv-3-960.webp' },
      { x:  -108.2, y:   267.5, w:  39.8, h:  60.5, rot:  27.54, rad: 4.1 , src: 'assets/img/ex-rally-1-960.webp' },
      { x:    41.7, y:   289.8, w:  31.0, h:  40.4, rot:  -9.48, rad: 4.1 , src: 'assets/img/ex-rbtv-5-960.webp' },
      { x:   178.4, y:   224.3, w:  42.2, h:  61.3, rot: -42.60, rad: 4.1 , src: 'assets/img/ex-stv-2-960.webp' },
      { x:   258.7, y:    93.0, w:  43.1, h:  63.2, rot: -73.75, rad: 4.1 , src: 'assets/img/ex-rally-3-960.webp' },
      { x:  -203.2, y:   731.2, w:  58.8, h:  88.4, rot: -73.75, rad: 4.1 , src: 'assets/img/ex-rbtv-2-960.webp' },
      { x:    88.7, y:   101.8, w:  37.0, h:  43.1, rot: -48.41, rad: 2.7 , src: 'assets/img/ex-stv-5-960.webp' },
      { x:   108.6, y:   -38.9, w:  25.8, h:  36.4, rot:  62.72, rad: 2.7 , src: 'assets/img/ex-rally-4-960.webp' },
      { x:   259.3, y:   -59.9, w:  34.0, h:  42.1, rot:  73.03, rad: 3.4 , src: 'assets/img/ex-rbtv-6-960.webp' },
      { x:   184.4, y:  -194.0, w:  45.3, h:  60.0, rot:  46.15, rad: 5.4 , src: 'assets/img/ex-stv-1-960.webp' },
      { x:    52.4, y:  -275.8, w:  45.3, h:  66.1, rot:  18.46, rad: 5.4 , src: 'assets/img/ex-rally-2-960.webp' },
      { x:   114.0, y:  -583.2, w:  61.2, h:  77.8, rot:  13.47, rad: 5.4 , src: 'assets/img/ex-rbtv-3-960.webp' },
      { x:   263.3, y:  -523.7, w:  42.3, h:  54.7, rot:  28.88, rad: 5.4 , src: 'assets/img/ex-stv-4-960.webp' },
      { x:   -64.8, y:  -446.1, w:  55.0, h:  69.7, rot:  -1.54, rad: 5.4 , src: 'assets/img/ex-rally-5-960.webp' },
      { x:   -45.2, y:  -604.4, w:  62.4, h:  76.5, rot:  -0.90, rad: 5.4 , src: 'assets/img/ex-rbtv-4-960.webp' },
      { x:  -220.0, y:  -414.5, w:  57.3, h:  70.9, rot: -21.28, rad: 5.4 , src: 'assets/img/stage-rbtv-1070.webp' },
      { x:  -358.0, y:  -335.5, w:  42.4, h:  47.8, rot: -38.42, rad: 5.4 , src: 'assets/img/stage-stv-1070.webp' },
      { x:   150.0, y:   419.0, w:  48.0, h:  70.4, rot: -21.02, rad: 5.4 , src: 'assets/img/stage-rally-1070.webp' },
      { x:   379.1, y:   210.0, w:  51.5, h:  70.4, rot: -63.85, rad: 5.4 , src: 'assets/img/tv-screen-rbtv-1100.webp' },
      { x:   420.7, y:    58.1, w:  51.5, h:  73.8, rot:   3.47, rad: 5.4 , src: 'assets/img/ex-rbtv-1-960.webp' },
      { x:   503.7, y:   311.1, w:  44.4, h:  52.4, rot:  29.64, rad: 5.4 , src: 'assets/img/ex-stv-3-960.webp' },
      { x:   703.4, y:   249.0, w:  57.7, h:  46.7, rot:  18.93, rad: 5.4 , src: 'assets/img/ex-rally-1-960.webp' },
      { x:   343.6, y:  -242.7, w:  51.5, h:  74.5, rot: -35.42, rad: 5.4 , src: 'assets/img/ex-rbtv-5-960.webp' },
      { x:   557.0, y:  -156.1, w:  39.9, h:  59.5, rot: -17.73, rad: 5.4 , src: 'assets/img/ex-stv-2-960.webp' },
      { x:  -463.8, y:  -218.8, w:  51.5, h:  80.2, rot:  32.65, rad: 5.4 , src: 'assets/img/ex-rally-3-960.webp' },
      { x:  -529.0, y:   -73.2, w:  55.8, h:  72.4, rot: 104.79, rad: 5.4 , src: 'assets/img/ex-rbtv-2-960.webp' },
      { x:  -666.2, y:  -168.7, w:  55.8, h:  87.6, rot: 110.00, rad: 5.4 , src: 'assets/img/ex-stv-5-960.webp' },
      { x:  -547.0, y:    85.4, w:  39.3, h:  51.6, rot:  88.32, rad: 5.4 , src: 'assets/img/ex-rally-4-960.webp' },
      { x:  -701.8, y:   -10.4, w:  59.3, h:  85.6, rot:  96.15, rad: 5.4 , src: 'assets/img/ex-rbtv-6-960.webp' },
      { x:  -700.9, y:   150.2, w:  43.3, h:  58.5, rot:  83.73, rad: 5.4 , src: 'assets/img/ex-stv-1-960.webp' },
      { x:  -587.1, y:   451.0, w:  63.2, h:  80.3, rot:  54.72, rad: 5.4 , src: 'assets/img/ex-rally-2-960.webp' },
      { x:  -516.6, y:   241.1, w:  56.7, h:  71.7, rot:  70.41, rad: 5.4 , src: 'assets/img/ex-rbtv-3-960.webp' },
      { x:  -661.2, y:   307.1, w:  60.6, h:  77.3, rot:  69.60, rad: 5.4 , src: 'assets/img/ex-stv-4-960.webp' },
      { x:    91.9, y:  -425.5, w:  38.8, h:  53.8, rot: -72.35, rad: 5.4 , src: 'assets/img/ex-rally-5-960.webp' },
      { x:   409.8, y:   -98.9, w:  51.5, h:  38.0, rot: -14.15, rad: 5.4 , src: 'assets/img/ex-rbtv-4-960.webp' },
      { x:   633.6, y:  -378.8, w:  74.4, h:  74.1, rot: -28.60, rad: 5.4 , src: 'assets/img/stage-rbtv-1070.webp' },
      { x:   536.1, y:  -508.8, w:  74.4, h:  74.1, rot: -43.28, rad: 5.4 , src: 'assets/img/stage-stv-1070.webp' },
      { x:   492.3, y:  -302.4, w:  77.1, h:  61.7, rot: -28.60, rad: 5.4 , src: 'assets/img/stage-rally-1070.webp' },
      { x:   700.1, y:  -231.0, w:  66.3, h:  42.2, rot: -17.33, rad: 5.4 , src: 'assets/img/tv-screen-rbtv-1100.webp' },
      { x:   414.3, y:  -617.2, w:  58.2, h:  47.5, rot: -54.84, rad: 5.4 , src: 'assets/img/ex-rbtv-1-960.webp' },
      { x:   271.6, y:  -696.4, w:  89.6, h:  60.3, rot: -63.57, rad: 5.4 , src: 'assets/img/ex-stv-3-960.webp' },
      { x:   118.6, y:  -748.2, w:  91.8, h:  61.4, rot: -76.27, rad: 5.4 , src: 'assets/img/ex-rally-1-960.webp' },
      { x:   562.5, y:   162.0, w:  73.2, h:  58.8, rot:  14.18, rad: 5.4 , src: 'assets/img/ex-rbtv-5-960.webp' },
      { x:   736.7, y:    90.3, w:  84.1, h:  63.1, rot:   4.54, rad: 5.4 , src: 'assets/img/ex-stv-2-960.webp' },
      { x:   736.3, y:   -71.6, w:  90.4, h:  59.5, rot:  -7.57, rad: 5.4 , src: 'assets/img/ex-rally-3-960.webp' },
      { x:   581.2, y:     2.9, w:  77.8, h:  58.8, rot:  -0.60, rad: 5.4 , src: 'assets/img/ex-rbtv-2-960.webp' },
      { x:   392.6, y:  -428.9, w:  77.8, h:  60.9, rot: -45.81, rad: 5.4 , src: 'assets/img/ex-stv-5-960.webp' },
      { x:   283.9, y:   335.4, w:  33.8, h:  50.9, rot: -43.17, rad: 5.4 , src: 'assets/img/ex-rally-4-960.webp' },
      { x:  -285.4, y:   324.5, w:  47.8, h:  70.7, rot:  46.09, rad: 5.4 , src: 'assets/img/ex-rbtv-6-960.webp' },
      { x:  -328.8, y:   494.0, w:  41.6, h:  52.1, rot:  37.74, rad: 5.4 , src: 'assets/img/ex-stv-1-960.webp' },
      { x:  -481.8, y:   573.4, w:  43.9, h:  56.9, rot:  42.71, rad: 5.4 , src: 'assets/img/ex-rally-2-960.webp' },
      { x:  -188.8, y:   569.6, w:  52.8, h:  78.4, rot:  20.30, rad: 5.4 , src: 'assets/img/ex-rbtv-3-960.webp' },
      { x:  -351.7, y:   669.2, w:  57.3, h:  85.0, rot:  29.59, rad: 5.4 , src: 'assets/img/ex-stv-4-960.webp' },
      { x:   127.2, y:   589.1, w:  39.6, h:  57.4, rot: -13.59, rad: 5.4 , src: 'assets/img/ex-rally-5-960.webp' },
      { x:   417.3, y:   633.7, w:  45.1, h:  57.4, rot: -35.81, rad: 5.4 , src: 'assets/img/ex-rbtv-4-960.webp' },
      { x:   118.7, y:   752.4, w:  58.0, h:  86.9, rot:  -9.24, rad: 5.4 , src: 'assets/img/stage-rbtv-1070.webp' },
      { x:   275.0, y:   709.9, w:  58.0, h:  88.6, rot: -20.94, rad: 5.4 , src: 'assets/img/stage-stv-1070.webp' },
      { x:   276.8, y:   532.7, w:  53.9, h:  79.6, rot: -28.71, rad: 5.4 , src: 'assets/img/stage-rally-1070.webp' },
      { x:   404.8, y:   436.8, w:  55.0, h:  82.0, rot: -43.80, rad: 5.4 , src: 'assets/img/tv-screen-rbtv-1100.webp' },
      { x:   539.5, y:   526.3, w:  57.9, h:  87.4, rot: -47.75, rad: 5.4 , src: 'assets/img/ex-rbtv-1-960.webp' },
      { x:   636.0, y:   396.7, w:  57.9, h:  87.4, rot: -59.74, rad: 5.4 , src: 'assets/img/ex-stv-3-960.webp' },
      { x:   -31.4, y:   601.8, w:  55.2, h:  80.6, rot:   1.66, rad: 5.4 , src: 'assets/img/ex-rally-1-960.webp' },
      { x:   -43.7, y:   760.2, w:  40.7, h:  62.4, rot:   1.66, rad: 5.4 , src: 'assets/img/ex-rbtv-5-960.webp' },
      { x:  -100.5, y:  -287.6, w:  34.0, h:  49.7, rot: -10.23, rad: 5.4 , src: 'assets/img/ex-stv-2-960.webp' },
      { x:  -205.0, y:  -584.9, w:  43.3, h:  57.5, rot: -16.48, rad: 5.4 , src: 'assets/img/ex-rally-3-960.webp' },
      { x:  -205.7, y:  -748.7, w:  64.3, h:  86.2, rot: -13.07, rad: 5.4 , src: 'assets/img/ex-rbtv-2-960.webp' },
      { x:  -363.4, y:  -700.2, w:  64.3, h:  92.4, rot: -22.99, rad: 5.4 , src: 'assets/img/ex-stv-5-960.webp' },
      { x:  -503.8, y:  -623.8, w:  42.6, h:  64.3, rot: -35.81, rad: 5.4 , src: 'assets/img/ex-rally-4-960.webp' },
      { x:  -628.8, y:  -518.7, w:  74.1, h:  76.6, rot: -45.85, rad: 5.4 , src: 'assets/img/ex-rbtv-6-960.webp' },
      { x:  -732.2, y:  -391.7, w:  74.1, h:  76.6, rot: -57.46, rad: 5.4 , src: 'assets/img/ex-stv-1-960.webp' },
      { x:   -42.9, y:  -764.8, w:  48.5, h:  57.5, rot:   0.71, rad: 5.4 , src: 'assets/img/ex-rally-2-960.webp' },
      { x:  -486.9, y:  -433.5, w:  63.4, h:  78.4, rot: -43.57, rad: 5.4 , src: 'assets/img/ex-rbtv-3-960.webp' },
      { x:  -355.6, y:  -526.2, w:  61.3, h:  78.5, rot: -29.44, rad: 5.4 , src: 'assets/img/ex-stv-4-960.webp' },
      { x:  -390.4, y:    38.4, w:  35.2, h:  45.8, rot:   1.86, rad: 5.4 , src: 'assets/img/ex-rally-5-960.webp' },
      { x:  -156.6, y:   414.0, w:  42.0, h:  41.2, rot:  22.54, rad: 5.4 , src: 'assets/img/ex-rbtv-4-960.webp' },
      { x:    -4.0, y:   446.5, w:  58.2, h:  58.2, rot:   0.00, rad: 5.4 , src: 'assets/img/stage-rbtv-1070.webp' },
      { x:  -244.6, y:  -227.6, w:  54.4, h:  55.5, rot: -36.40, rad: 5.4 , src: 'assets/img/stage-stv-1070.webp' },
      { x:   233.2, y:  -355.6, w:  61.9, h:  62.7, rot: -53.67, rad: 5.4 , src: 'assets/img/stage-rally-1070.webp' },
      { x:  -346.0, y:  -110.9, w:  54.4, h:  55.5, rot: -61.61, rad: 5.4 , src: 'assets/img/tv-screen-rbtv-1100.webp' },
      { x:  -441.5, y:   381.9, w:  63.7, h:  65.8, rot: -37.53, rad: 5.4 , src: 'assets/img/ex-rbtv-1-960.webp' },
      { x:  -368.2, y:   192.6, w:  49.8, h:  63.1, rot: -109.80, rad: 5.4 , src: 'assets/img/ex-stv-3-960.webp' },
      { x:  -232.8, y:    12.6, w:  27.0, h:  40.1, rot: 105.36, rad: 4.1 , src: 'assets/img/ex-rally-1-960.webp' },
      { x:    -2.1, y:  -134.4, w:  36.0, h:  51.9, rot:  15.71, rad: 4.1 , src: 'assets/img/ex-rbtv-5-960.webp' },
      { x:  -147.1, y:  -109.4, w:  37.8, h:  55.0, rot:  54.62, rad: 4.1 , src: 'assets/img/ex-stv-2-960.webp' },
      { x:  -591.8, y:  -311.4, w:  41.4, h:  61.4, rot:  31.98, rad: 4.1 , src: 'assets/img/ex-rally-3-960.webp' },
    ];
    var HO_ASPECT = 1;                     /* circular: rotation is rigid, spacing exact */
    var HO_OMEGA = (Math.PI * 2) / 170;   /* one revolution ~ 170s, clockwise */

    var hoRingsEl = document.getElementById('ho-rings');
    /* focal points from the Examples section: each image is cover-cropped
       around its subject, so no container shows a random slice */
    var HO_FOCAL = {
      'ex-rbtv-1-960.webp': '50% 42%', 'ex-rbtv-2-960.webp': '57% 50%',
      'ex-rbtv-3-960.webp': '47% 36%', 'ex-rbtv-4-960.webp': '47% 32%',
      'ex-rbtv-5-960.webp': '42% 78%', 'ex-rbtv-6-960.webp': '44% 62%',
      'ex-stv-1-960.webp': '53% 28%',  'ex-stv-2-960.webp': '50% 32%',
      'ex-stv-3-960.webp': '55% 35%',  'ex-stv-4-960.webp': '42% 45%',
      'ex-stv-5-960.webp': '45% 62%',  'ex-rally-1-960.webp': '50% 35%',
      'ex-rally-2-960.webp': '47% 28%','ex-rally-3-960.webp': '50% 52%',
      'ex-rally-4-960.webp': '47% 78%','ex-rally-5-960.webp': '52% 72%',
      'stage-rbtv-1070.webp': '50% 45%','stage-stv-1070.webp': '45% 35%',
      'stage-rally-1070.webp': '50% 55%','tv-screen-rbtv-1100.webp': '50% 45%'
    };
    var HO_RATIOS = [['16:9', 16/9], ['3:2', 3/2], ['4:3', 4/3], ['1:1', 1], ['4:5', 4/5], ['2:3', 2/3], ['9:16', 9/16]];
    function hoRatioLabel(w, h){
      var r = w / h, best = HO_RATIOS[0];
      HO_RATIOS.forEach(function(c){ if (Math.abs(c[1] - r) < Math.abs(best[1] - r)) best = c; });
      return best[0];
    }

    /* mobile gate field: the SAME orbit hero — real imagery, same authored
       composition, same ambient spiral — scaled to the mobile viewport
       (the Figma glass tiles were placeholders). Driven by the shared
       ticker below, but only while the gate is actually showing. */
    var mgField = document.querySelector('.mg-field');
    var mgTiles = [];
    var mgScale = 1;
    var mgMQ = window.matchMedia('(max-width: 767.98px)');
    function mgSetScale(){
      /* 0.533 at the 393px Figma frame, growing with the viewport */
      mgScale = Math.min(1, Math.max(.45, window.innerWidth / 737));
      mgTiles.forEach(function(g){
        g.el.style.width = (g.w * mgScale) + 'px';
        g.el.style.height = (g.h * mgScale) + 'px';
        g.el.style.left = (-g.w * mgScale / 2) + 'px';
        g.el.style.top = (-g.h * mgScale / 2) + 'px';
        g.el.style.borderRadius = (g.rad * mgScale) + 'px';
      });
    }
    if (mgField){
      HO_FIELD.forEach(function(t){
        var el = document.createElement('div');
        el.className = 'mg-tile';
        if (t.src){
          var im = document.createElement('img');
          im.src = t.src;
          im.alt = '';
          im.loading = 'lazy';
          im.style.objectPosition = HO_FOCAL[t.src.split('/').pop()] || '50% 50%';
          el.appendChild(im);
        }
        mgField.appendChild(el);
        mgTiles.push({
          el: el, w: t.w, h: t.h, rad: t.rad,
          r: Math.hypot(t.x, t.y),
          a0: Math.atan2(t.y, t.x),
          baseTilt: t.rot
        });
      });
      mgSetScale();
      window.addEventListener('resize', mgSetScale);
    }

    var hoTiles = [];
    HO_FIELD.forEach(function(t, i){
      var el = document.createElement('div');
      el.className = 'ho-tile';
      el.style.width = t.w + 'px';
      el.style.height = t.h + 'px';
      el.style.left = (-t.w / 2) + 'px';
      el.style.top = (-t.h / 2) + 'px';
      el.style.borderRadius = t.rad + 'px';   /* authored in Figma */
      if (t.src){
        var im = document.createElement('img');
        im.src = t.src;
        im.alt = '';
        im.style.objectPosition = HO_FOCAL[t.src.split('/').pop()] || '50% 50%';
        el.appendChild(im);
      } else {
        var label = document.createElement('span');
        label.textContent = hoRatioLabel(t.w, t.h);
        el.appendChild(label);
      }
      hoRingsEl.appendChild(el);
      hoTiles.push({
        el: el,
        r: Math.hypot(t.x / HO_ASPECT, t.y),
        a0: Math.atan2(t.y, t.x / HO_ASPECT),
        baseTilt: t.rot,                    /* authored in Figma */
        /* entrance stagger: a SPIRAL sweep. Delay follows the tile's angle
           around the centre plus its radius, so the reveal travels around
           and outward in the same direction the field turns. The 1.45s base
           holds the field back until copy and nav are in. */
        arriveDelay: 1.45 +
          ((Math.atan2(t.y, t.x) / (Math.PI * 2) + .5) * .55) +
          (Math.hypot(t.x, t.y) / 1500) * .6 + (i % 3) * .025
      });
    });

    /* scroll progress for the spiral dive (no pointer parallax: the field
       holds still under the cursor, only scroll and time move it) */
    var hoTarget = 0, hoP = 0;
    /* the dive completes within the FIRST viewport of scroll ('+=100%');
       the hero's second 100vh is the overlap phase, where the pinned field
       keeps spiralling at p=1 while the truth section slides over it */
    ScrollTrigger.create({
      trigger: '.hero-orbit', start: 'top top', end: '+=100%',
      onUpdate: function(self){ hoTarget = self.progress; }
    });

    var hoStart = null;
    var HO_BASE = 1.0;    /* resting frame = the authored Figma composition at
                             natural scale: the full dense field is on screen,
                             the centre glow keeps the copy legible */
    function hoFrame(time){
      if (hoStart === null) hoStart = time;
      var t = time - hoStart;
      hoP += (hoTarget - hoP) * .09;               /* silkier dive smoothing */
      var p = hoP;
      /* Scroll = camera dolly FORWARD. Position and size scale by the SAME
         factor, so spacing is preserved at every depth. */
      /* no scaling on scroll (Preet): the field holds its size; scroll only
         drives the angular sweep below plus the glow swallowing the scene */
      var push = HO_BASE;
      /* ambient motion is a spiral-IN: constant turn plus a very slow radial
         breath (3.5% over ~50s). Rotation with inward drift reads as the
         field gently spiralling toward the viewer's focus. */
      var breathe = 1 - .035 * (0.5 - 0.5 * Math.cos(t * .125));
      /* scroll adds a RELAXED angular drift (~1/4 turn at full dive) on top
         of the ambient turn; strong sweeps read as dizzying */
      var theta = t * HO_OMEGA + p * p * 1.5;
      /* tiles hold their opacity; the scaling centre glow (exit timeline)
         is what swallows them into blue as the user scrolls */
      var fade = 1;
      for (var i = 0; i < hoTiles.length; i++){
        var d = hoTiles[i];
        /* entrance: quart-out settle (fast start, long soft landing), the
           tile condensing inward from 6% outside its resting radius while
           it fades. Opacity resolves ahead of the motion so the landing
           reads as a glide, not a pop. */
        var age = Math.min(Math.max((t - d.arriveDelay) / 1.1, 0), 1);
        var arrive = 1 - Math.pow(1 - age, 4);
        var opAge = Math.min(age * 1.5, 1);
        var appear = 1 - Math.pow(1 - opAge, 3);
        var ang = d.a0 + theta;
        var rr = d.r * push * breathe * (1.06 - .06 * arrive);
        gsap.set(d.el, {
          x: Math.cos(ang) * rr * HO_ASPECT,
          y: Math.sin(ang) * rr,
          scale: (0.9 + 0.1 * arrive) * push * breathe,
          opacity: appear * fade,
          rotation: d.baseTilt + p * 18,
          zIndex: 1
        });
      }
      /* mobile gate: same field, same slow spiral, no scroll influence */
      if (mgMQ.matches && mgTiles.length){
        var gTheta = t * HO_OMEGA;
        for (var k = 0; k < mgTiles.length; k++){
          var g = mgTiles[k];
          var gr = g.r * mgScale * breathe;
          gsap.set(g.el, {
            x: Math.cos(g.a0 + gTheta) * gr,
            y: Math.sin(g.a0 + gTheta) * gr,
            rotation: g.baseTilt
          });
        }
      }
    }
    gsap.ticker.add(function(time){ hoFrame(time); });

    /* entrance order (Preet): text first, then the nav slides in, and only
       then do tiles surface (their 1.45s arriveDelay base) into a field
       that is already spiralling. Overlapping starts, Apple-style: nothing
       waits for anything else to fully finish. */
    gsap.set('.ho-copy > *', { y: 26, opacity: 0 });
    gsap.set('.fg-nav', { y: -18, autoAlpha: 0 });
    gsap.timeline({ delay: .25, onComplete: function(){ hoNavHandoff(); } })
      .to('.ho-glow', { opacity: .96, duration: .9, ease: 'power2.out' })
      .to('.ho-copy > *', { y: 0, opacity: 1, duration: .85, ease: 'power4.out', stagger: .08 }, '-=0.8')
      .to('.fg-nav', { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out' }, '-=0.35');

    /* exit: the first scroll movement commits to blue. Copy and glow release
       together, the background snaps to the blue hole, and the tile field
       keeps spiralling on blue for the rest of the (short) dive. */
    gsap.timeline({
      scrollTrigger: { trigger: '.hero-orbit', start: 'top top', end: '+=100%', scrub: .8 },
      defaults: { ease: 'none' }
    })
      .to('.ho-copy', { y: -30, scale: .9, autoAlpha: 0, transformOrigin: '50% 50%', duration: .12 }, .02)
      /* the centre glow INTENSIFIES: it scales until its solid blue core
         covers the whole viewport (done by ~40% of the dive), swallowing
         the still-turning field before the next section's edge crosses
         any tile. The section text then simply rises out of the blue. */
      .to('.ho-glow', { scale: 3.4, duration: .3, ease: 'power1.in' }, .06)
      /* once the glow has swallowed the field, fade the whole sticky IN
         PLACE (blue on blue, so the fade itself is invisible). By the time
         the hero unpins and physically scrolls, there is nothing left to
         see moving; the section text above it just rises over flat blue. */
      .to('.ho-sticky', { autoAlpha: 0, duration: .2 }, .45)
      /* spacer: pads the timeline to 1s so the tweens above map onto the
         first ~65% of the dive */
      .to({}, { duration: .35 }, .65);

    /* the hero canvas is the brand blue (#000f1e) at rest now, same as the
       truth section, so no background transition is needed on scroll: the
       hand-off is inherently seamless */

    /* nav hand-off, same pattern as the classic hero. Created only AFTER the
       entrance finishes: a scrubbed fromTo renders its from-state (nav fully
       visible) during ScrollTrigger's initial refresh, which would defeat
       the entrance's hidden nav. */
    function hoNavHandoff(){
      gsap.timeline({
        scrollTrigger: { trigger: '.hero-orbit', start: 'bottom 96%', end: 'bottom 50%', scrub: true },
        defaults: { ease: 'none' }
      }).fromTo('.fg-nav:not(.fg-nav--float)', { y: 0, autoAlpha: 1 }, { y: -40, autoAlpha: 0, duration: .45, immediateRender: false }, 0);
    }
  }

  /* logo always returns to the top. The markup anchor (#top) points at the
     classic hero, which is display:none in orbit mode, so the browser's
     default jump goes nowhere; handle it for both navs (incl. the clone). */
  document.addEventListener('click', function(e){
    var logo = e.target.closest && e.target.closest('.fg-logo');
    if (!logo) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- floating nav: reveal on scroll-up (headroom pattern) ----------
     The hero nav is owned by the hero exit scrub above; past the hero a dark
     glass clone takes over. It only appears on deliberate upward scroll
     (small accumulator so touchpad jitter never triggers it), hides again on
     scroll-down, and stands down inside the hero zone where the original
     nav scrubs back in. */
  (function(){
    var srcNav = document.querySelector('.fg-nav');
    if (!srcNav) return;
    var nav = srcNav.cloneNode(true);
    nav.classList.add('fg-nav--float');
    nav.setAttribute('aria-hidden', 'true');
    document.body.appendChild(nav);
    /* y:0 clears the hero entrance offset the clone may have inherited */
    gsap.set(nav, { y: 0, yPercent: -110, autoAlpha: 0 });

    var SHOW_INTENT = 16;  /* px scrolled up before revealing */
    var HIDE_INTENT = 24;  /* px scrolled down before hiding */
    var shown = false, upRun = 0, downRun = 0, lastY = window.scrollY;

    function show(){
      if (shown) return; shown = true;
      nav.setAttribute('aria-hidden', 'false');
      gsap.to(nav, { yPercent: 0, autoAlpha: 1, duration: .55, ease: 'expo.out', overwrite: true });
    }
    function hide(fast){
      if (!shown) return; shown = false;
      nav.setAttribute('aria-hidden', 'true');
      gsap.to(nav, { yPercent: -110, autoAlpha: 0, duration: fast ? .25 : .4, ease: 'power2.in', overwrite: true });
    }

    /* hero zone = wherever the original nav lives. The hero exit scrub fades
       it out between hero-bottom 96% -> 50% of the viewport, so the floating
       nav must be gone before hero-bottom climbs back past ~45% — otherwise
       the two bars overlap. */
    var hero = document.querySelector(heroMode === 'orbit' ? '.hero-orbit' : '.hero-fig');
    function inHeroZone(){
      if (!hero) return window.scrollY < window.innerHeight * .8;
      return hero.getBoundingClientRect().bottom > window.innerHeight * .45;
    }

    window.addEventListener('scroll', function(){
      var y = window.scrollY;
      var dy = y - lastY;
      lastY = y;
      if (inHeroZone()){ upRun = downRun = 0; hide(true); return; }
      if (dy < 0){
        downRun = 0; upRun -= dy;
        if (upRun > SHOW_INTENT) show();
      } else if (dy > 0){
        upRun = 0; downRun += dy;
        if (downRun > HIDE_INTENT) hide();
      }
    }, { passive: true });

    /* anchor click from the floating nav = intent to travel down the page —
       tuck the nav away immediately so it doesn't hang over the destination */
    nav.addEventListener('click', function(e){
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (a) hide();
    });
  })();

  gsap.to('.truth-canvas', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.truth', start: 'bottom 96%', end: 'bottom 55%', scrub: true }
  });

  gsap.to('.focal-canvas', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.focal', start: 'bottom 96%', end: 'bottom 55%', scrub: true }
  });

  /* ---------- partners pinned timeline ---------- */
  var BRANDS = [
    { glow: 'rgba(11,99,229,.34)',  tint: '#04182B' },
    { glow: 'rgba(242,92,31,.30)',  tint: '#190C07' },
    { glow: 'rgba(91,102,115,.32)', tint: '#101317' }
  ];
  var blocks  = gsap.utils.toArray('.partner-block');
  var screens = gsap.utils.toArray('.screen');
  var dots    = gsap.utils.toArray('.partner-dots span i');
  var glowEl  = document.getElementById('tv-glow');
  var tintEl  = document.getElementById('partner-tint');

  var ptl = gsap.timeline({
    scrollTrigger: {
      trigger: '.partners',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6
    },
    defaults: { ease: 'none' }
  });
  ptl.to({}, { duration: 1 }); /* hold partner 1 */
  [1, 2].forEach(function(i){
    ptl.addLabel('t' + i)
      .to(blocks[i-1],  { opacity: 0, y: -18, duration: .5 }, 't' + i)
      .to(screens[i-1], { opacity: 0, duration: .55 }, 't' + i)
      .fromTo(blocks[i],  { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .55 }, 't' + i + '+=0.25')
      .fromTo(screens[i], { opacity: 0 }, { opacity: 1, duration: .55 }, 't' + i + '+=0.2')
      .to(glowEl, { '--glowc': BRANDS[i].glow, duration: .7 }, 't' + i)
      .to(tintEl, { backgroundColor: BRANDS[i].tint, duration: .7 }, 't' + i)
      .to(dots[i-1], { opacity: .3, duration: .3 }, 't' + i)
      .fromTo(dots[i], { scaleX: 0 }, { scaleX: 1, duration: .45 }, 't' + i + '+=0.2')
      .to({}, { duration: 1 }); /* hold */
  });

  /* ---------- manifesto word scrub ---------- */
  var mWords = splitWords(document.getElementById('manifesto'), 'w');
  gsap.to(mWords, {
    color: '#EAF3FC',
    stagger: 0.6,
    ease: 'none',
    scrollTrigger: {
      trigger: '#manifesto',
      start: 'top 78%',
      end: 'bottom 42%',
      scrub: true
    }
  });

  /* ---------- rule of thumb: heads swap outside, scribble inside ---------- */
  var foScr = document.getElementById('fo-scr');
  if (foScr){
    var flen = foScr.getTotalLength();
    foScr.style.strokeDasharray = flen + 'px ' + (flen + 12) + 'px';
    foScr.style.strokeDashoffset = (flen + 6) + 'px';
    gsap.set('#fo-note', { opacity: 0 });
    var foHeads = gsap.utils.toArray('.fo-head');
    var ftl = gsap.timeline({
      scrollTrigger: {
        trigger: '.focal',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5
      },
      defaults: { ease: 'none' }
    });
    ftl.to({}, { duration: 1 }) /* hold: the full frame */
       .addLabel('b')
       .to(foHeads[0], { opacity: 0, y: -12, duration: .35 }, 'b')
       .fromTo(foHeads[1], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45 }, 'b+=0.3')
       .to({}, { duration: .9 }) /* crisp, untouched image */
       .addLabel('c')
       .to(foHeads[1], { opacity: 0, y: -12, duration: .35 }, 'c-=0.1')
       .fromTo(foHeads[2], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45 }, 'c+=0.2')
       .to('#fo-blur', { opacity: 1, duration: .9 }, 'c')
       .to('#fo-dark', { opacity: 1, duration: .9 }, 'c')
       .to('#fo-scr', { strokeDashoffset: 0, duration: 1.2 }, 'c+=0.55')
       .to('#fo-note', { opacity: 1, duration: .35 }, 'c+=1.5')
       .to({}, { duration: .9 }); /* settle hold */

    var foInd = document.querySelector('.fo-ind');
    function placeInd(animate){
      var on = document.querySelector('.fo-tab.on');
      if (!on || !foInd) return;
      var props = { x: on.offsetLeft - 4, width: on.offsetWidth };
      if (animate) gsap.to(foInd, { x: props.x, width: props.width, duration: .35, ease: 'power4.out' });
      else gsap.set(foInd, props);
    }
    placeInd(false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ placeInd(false); });
    window.addEventListener('resize', function(){ placeInd(false); });
    document.querySelectorAll('.fo-tab').forEach(function(tb){
      tb.addEventListener('click', function(){
        document.querySelectorAll('.fo-tab').forEach(function(x){
          x.classList.toggle('on', x === tb);
          x.setAttribute('aria-selected', x === tb ? 'true' : 'false');
        });
        document.querySelectorAll('.fo-img, .tvx-shot, .tvlap-shot, .tvtab-shot, .tvmob-shot').forEach(function(im){
          im.classList.toggle('on', im.getAttribute('data-brand') === tb.getAttribute('data-brand'));
        });
        placeInd(true);
        /* the examples gallery follows the selected brand */
        if (window.__exSetBrand) window.__exSetBrand(tb.getAttribute('data-brand'));
      });
    });
  }

  /* ---------- tv wall: the selected destination, ten-foot then desktop ---------- */
  if (document.querySelector('.tvwall')){
    var wtl = gsap.timeline({
      scrollTrigger: { trigger: '.tvwall', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
      defaults: { ease: 'none', force3D: true }
    });
    /* note slides out left as the devices sweep in from the right — one gesture */
    wtl.fromTo('.tvw-note', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .5, ease: 'power2.out' })
       .to({}, { duration: .45 })
       .addLabel('tv')
       .to('.tvw-note', { opacity: 0, x: -70, duration: .6, ease: 'power1.in' }, 'tv')
       .fromTo('.tvx', { xPercent: 135 }, { xPercent: -50, duration: 1.4, ease: 'power2.out' }, 'tv+=0.15')
       .to({}, { duration: .5 })
       .addLabel('lap')
       .to('.tvx', { xPercent: -58, duration: 1, ease: 'power2.out' }, 'lap')
       .fromTo('.tvlap', { xPercent: 260 }, { xPercent: 0, duration: 1, ease: 'power2.out' }, 'lap')
       .to({}, { duration: .5 })
       .addLabel('tab')
       .fromTo('.tvtab', { xPercent: 300 }, { xPercent: 0, duration: .9, ease: 'power2.out' }, 'tab')
       .to({}, { duration: .5 })
       .addLabel('mob')
       .fromTo('.tvmob', { xPercent: 400 }, { xPercent: 0, duration: .8, ease: 'power2.out' }, 'mob')
       .to({}, { duration: .9 });

    gsap.to('.tvwall-canvas', {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.tvwall', start: 'bottom 96%', end: 'bottom 55%', scrub: true }
    });
  }

  /* ---------- examples: crop-ratio hover preview ---------- */
  if (document.querySelector('.exlib')){
    var exTrack = document.querySelector('.ex-track');
    var exAR = 1.7778, exLabel = '16:9';

    function exSetBrand(brand){
      document.querySelectorAll('.ex-card').forEach(function(c){
        c.classList.toggle('brand-on', c.getAttribute('data-brand') === brand);
      });
      updateCrops();
      /* card counts differ per brand — re-measure the horizontal scrub */
      ScrollTrigger.refresh();
      if (typeof exParallax === 'function') exParallax();
    }
    window.__exSetBrand = exSetBrand;

    /* size each hover crop window to the max rect of the chosen ratio,
       clamped inside the container. Windows are centred, except the 7:2
       banner: it anchors on the card's focal point (data-focal-x/y,
       image-space fractions) so the banner is cut from the subject. The
       focus <img> replays the centred cover crop the CSS applies to the
       base, so the window shows exactly what that ratio would keep. */
    function updateCrops(){
      var isBanner = exAR >= 3;
      document.querySelectorAll('.ex-card.brand-on').forEach(function(card){
        var wrap = card.querySelector('.ex-imgwrap');
        var cw = wrap.offsetWidth, ch = wrap.offsetHeight;
        if (!cw) return;
        var fx = parseFloat(card.getAttribute('data-focal-x') || '.5');
        var fy = parseFloat(card.getAttribute('data-focal-y') || '.5');
        var focus = card.querySelector('.ex-focus');
        var im = focus.querySelector('img');
        /* displayed (cover) size of the image inside the container */
        var nw = im.naturalWidth || 16, nh = im.naturalHeight || 9;
        var cover = Math.max(cw / nw, ch / nh);
        var dw = nw * cover, dh = nh * cover;
        /* focal-anchored cover crop, matching the CSS base object-position */
        var offX = (dw - cw) * fx, offY = (dh - ch) * fy;
        var winW = Math.min(cw, ch * exAR), winH = winW / exAR;
        if (winH > ch){ winH = ch; winW = winH * exAR; }
        /* inset so the window never sits edge-to-edge */
        var scale = 0.82;
        winW *= scale; winH *= scale;
        /* window centred in the container; the 7:2 banner instead anchors on
           the subject's face (focal point maps to fx*cw / fy*ch) */
        var ax = isBanner ? fx * cw : cw / 2;
        var ay = isBanner ? fy * ch : ch / 2;
        var left = Math.min(Math.max(ax - winW / 2, 0), cw - winW);
        var top  = Math.min(Math.max(ay - winH / 2, 0), ch - winH);
        focus.style.cssText = 'position:absolute;overflow:hidden;border-radius:8px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.85);transition:opacity 420ms cubic-bezier(.23,1,.32,1);will-change:opacity;left:'+left+'px;top:'+top+'px;width:'+winW+'px;height:'+winH+'px';
        focus.setAttribute('data-label', exLabel);
        im.style.cssText = 'position:absolute;max-width:none;display:block;width:'+dw+'px;height:'+dh+'px;left:'+(-(offX + left))+'px;top:'+(-(offY + top))+'px';
      });
      document.querySelectorAll('.ex-focus').forEach(function(f){
        f.querySelector('::after');
      });
      var st = document.getElementById('ex-focus-label');
      if (st) st.textContent = exLabel;
    }
    window.addEventListener('resize', updateCrops);
    /* cover math needs naturalWidth — refresh as images arrive */
    document.querySelectorAll('.ex-focus img').forEach(function(im){
      if (!im.complete) im.addEventListener('load', updateCrops, { once: true });
    });

    var exInd = document.querySelector('.ex-ind');
    function placeExInd(){ var on = document.querySelector('.ex-rtab.on'); if (on && exInd) gsap.to(exInd, { x: on.offsetLeft - 4, width: on.offsetWidth, duration: .35, ease: 'power4.out' }); }
    requestAnimationFrame(function(){ var on = document.querySelector('.ex-rtab.on'); if (on) gsap.set(exInd, { x: on.offsetLeft - 4, width: on.offsetWidth }); });
    document.querySelectorAll('.ex-rtab').forEach(function(tb){
      tb.addEventListener('click', function(){
        document.querySelectorAll('.ex-rtab').forEach(function(x){ x.classList.toggle('on', x === tb); x.setAttribute('aria-selected', x === tb ? 'true':'false'); });
        exAR = parseFloat(tb.getAttribute('data-ar'));
        exLabel = tb.textContent.trim();
        placeExInd(); updateCrops();
      });
    });

    /* parallax: card images drift slower than the track while it scrubs,
       zoomed slightly so their edges never show */
    function exParallax(){
      var vw = window.innerWidth;
      document.querySelectorAll('.ex-card.brand-on .ex-base').forEach(function(im){
        var r = im.getBoundingClientRect();
        if (r.right < 0 || r.left > vw || !r.width) return;
        var p = ((r.left + r.width / 2) - vw / 2) / vw;  /* ~ -0.6 .. 0.6 */
        gsap.set(im, { xPercent: p * 6, scale: 1.1 });
      });
    }
    window.addEventListener('resize', exParallax);

    exSetBrand('rbtv');
    requestAnimationFrame(updateCrops);
    requestAnimationFrame(exParallax);

    gsap.fromTo('.ex-card.brand-on', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out', stagger: 0.12, scrollTrigger: { trigger: '.exlib', start: 'top 60%', once: true } });
    gsap.timeline({ scrollTrigger: { trigger: '.exlib', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true }, defaults: { ease: 'none' } })
      .to({}, { duration: 0.7 })
      .to(exTrack, { x: function(){ return -(exTrack.scrollWidth - 1266); }, duration: 4, onUpdate: exParallax })
      .to({}, { duration: 0.9 });
    gsap.to('.exlib-canvas', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.exlib', start: 'bottom 40%', end: 'bottom 8%', scrub: true } });
  }

  /* ---------- delivery: cards assemble on scroll, chips cascade in last ---------- */
  if (document.querySelector('.delivery')){
    gsap.set('.dl-card', { y: 72, opacity: 0 });
    gsap.set('.dl-chips > *', { y: 14, opacity: 0 });
    gsap.set('.dl-title', { y: 28, opacity: 0 });
    var dtl = gsap.timeline({
      scrollTrigger: { trigger: '.delivery', start: 'top top', end: 'bottom bottom', scrub: 1 },
      defaults: { ease: 'none' }
    });
    dtl.to('.dl-title', { y: 0, opacity: 1, duration: .3, ease: 'power2.out' })
       .to({}, { duration: .15 });
    gsap.utils.toArray('.dl-card').forEach(function(card){
      dtl.to(card, { y: 0, opacity: 1, duration: .6, ease: 'power2.out' })
         /* the chips are the payload: they cascade in once the card lands */
         .to(card.querySelectorAll('.dl-chips > *'),
             { y: 0, opacity: 1, duration: .3, ease: 'power2.out', stagger: .05 }, '-=0.22')
         .to({}, { duration: .34 });
    });
    dtl.to({}, { duration: .5 });

    /* UBA.PSD pill: download + a burst of brand confetti */
    var dlPsd = document.querySelector('.dl-chips a.dl-shine');
    if (dlPsd){
      dlPsd.addEventListener('click', function(){
        gsap.fromTo(dlPsd, { scale: .92 }, { scale: 1, duration: .5, ease: 'back.out(2.4)' });
        var r = dlPsd.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var colors = ['#DB0A40', '#FFD27A', '#0B63E5', '#00162b', '#ffffff'];
        for (var i = 0; i < 36; i++){
          var p = document.createElement('i');
          var s = 5 + Math.random() * 5;
          p.style.cssText = 'position:fixed;left:0;top:0;width:' + s + 'px;height:' +
            (Math.random() < .4 ? s : s * .55) + 'px;background:' + colors[i % colors.length] +
            ';border-radius:' + (Math.random() < .3 ? '50%' : '1px') +
            ';pointer-events:none;z-index:200;will-change:transform';
          document.body.appendChild(p);
          var ang = (-90 + (Math.random() * 150 - 75)) * Math.PI / 180;
          var v = 240 + Math.random() * 340;
          var vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
          var d = 1.15 + Math.random() * .65;
          gsap.set(p, { x: cx, y: cy, rotation: Math.random() * 360 });
          gsap.to(p, { x: cx + vx, duration: d, ease: 'power1.out' });
          gsap.to(p, { y: cy + vy * .4, duration: d * .38, ease: 'power2.out' });
          gsap.to(p, { y: cy + 420 + Math.random() * 180, duration: d * .62, delay: d * .38, ease: 'power1.in' });
          gsap.to(p, { rotation: '+=' + (Math.random() * 540 - 270), duration: d, ease: 'none' });
          gsap.to(p, { opacity: 0, duration: .3, delay: d - .3,
            onComplete: function(el){ el.remove(); }, onCompleteParams: [p] });
        }
      });
    }

    /* standard section hand-off: ease away before the footer arrives */
    gsap.to('.delivery-canvas', {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.delivery', start: 'bottom 40%', end: 'bottom 8%', scrub: true }
    });
  }

  /* ---------- comparison reveals ---------- */
  gsap.utils.toArray('.compare-card').forEach(function(card, i){
    gsap.fromTo(card,
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power4.out', delay: i * .12,
        scrollTrigger: { trigger: '.compare-grid', start: 'top 82%', once: true }
      });
  });
})();
