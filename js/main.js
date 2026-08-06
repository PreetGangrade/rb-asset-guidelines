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

  /* ---------- hero (fig): intro + frame 1-2-3 scroll ---------- */
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

  /* ---------- footer: springy arrival + morphing word ---------- */
  if (document.querySelector('.footer-card')){
    gsap.set('.footer-card', { y: 150, opacity: 0 });
    gsap.set(['.fc-head > *', '.fc-bottom > *'], { y: 40, opacity: 0 });

    var fcWords = ['future', 'stories', 'impact', 'legends'];
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
       .to('.t-under.u1', { clipPath: 'inset(0% 0% 0% 0%)', duration: .35, ease: 'power1.out' }, 's2+=0.55')
       .to('.t-under.u2', { clipPath: 'inset(0% 0% 0% 0%)', duration: .35, ease: 'power1.out' }, 's2+=0.85')
       .to({}, { duration: .9 })
       .to(tStages[1], { opacity: 0, y: -30, duration: .5 });

    /* stage 3 — the arrow doodle lands on "That is why" */
    ttl.set(tStages[2], { opacity: 1 })
       .addLabel('s3')
       .to(tStages[2].querySelectorAll('.tw'), { color: finalColor, duration: .5, stagger: .1 }, 's3')
       .to('#t-arrow-path', { strokeDashoffset: 0, duration: .55, ease: 'none' }, 's3+=0.4')
       .to('#t-arrow-head', { strokeDashoffset: 0, duration: .18, ease: 'none' }, 's3+=0.98')
       .to({}, { duration: 1 });
  }

  /* ---------- uba hero: floats settle first, type + marks near the top ---------- */
  if (document.querySelector('.uba-hero')){
    var floats = gsap.utils.toArray('.uba-float');
    gsap.from(floats, {
      opacity: 0, y: 46, duration: 1.2, ease: 'power4.out', stagger: 0.06,
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
    gsap.fromTo('.uba-title .winner', { y: 0, yPercent: 120 }, {
      y: 0, yPercent: 0, duration: .9, ease: 'power4.out', stagger: .08,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 12%', once: true }
    });
    gsap.to(['#uba-mark-l', '#uba-mark-r'], {
      strokeDashoffset: 0, duration: .55, ease: 'power1.inOut', delay: .6,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 12%', once: true }
    });
    gsap.to(['#uba-mark-l2', '#uba-mark-r2'], {
      strokeDashoffset: 0, duration: .4, ease: 'power1.out', delay: 1.05,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 12%', once: true }
    });
    gsap.from(['.uba-sub', '.uba-btn'], {
      y: 26, opacity: 0, duration: .9, ease: 'power4.out', stagger: .1, delay: .3,
      scrollTrigger: { trigger: '.uba-hero', start: 'top 12%', once: true }
    });

    /* ease off: the section dissolves upward as you leave it */
    gsap.timeline({
      scrollTrigger: { trigger: '.uba-hero', start: 'bottom 96%', end: 'bottom 45%', scrub: true },
      defaults: { ease: 'none' }
    })
      .fromTo('.uba-center', { y: 0, opacity: 1 }, { y: -70, opacity: 0, immediateRender: false }, 0)
      .fromTo('.uba-mark', { opacity: 1 }, { opacity: 0, immediateRender: false }, 0)
      .fromTo(floats, { opacity: .1 }, { opacity: 0, immediateRender: false }, 0);
  }

  /* rule of thumb eases in as it arrives */
  if (document.querySelector('.fo-stage')){
    gsap.from('.fo-stage', {
      y: 54, opacity: 0, duration: 1.1, ease: 'power4.out',
      scrollTrigger: { trigger: '.focal', start: 'top 72%', once: true }
    });
    gsap.from('.fo-tabs', {
      y: 24, opacity: 0, duration: .9, ease: 'power4.out', delay: .15,
      scrollTrigger: { trigger: '.focal', start: 'top 72%', once: true }
    });
    gsap.from('.fo-heads', {
      y: 20, opacity: 0, duration: .9, ease: 'power4.out', delay: .05,
      scrollTrigger: { trigger: '.focal', start: 'top 72%', once: true }
    });
  }

  /* ---------- section hand-offs: each pinned section eases away ---------- */
  gsap.timeline({
    scrollTrigger: { trigger: '.hero-fig', start: 'bottom 96%', end: 'bottom 50%', scrub: true },
    defaults: { ease: 'none' }
  })
    .fromTo('.fg-copy', { y: 0, opacity: 1 }, { y: -50, opacity: 0, duration: .45, immediateRender: false }, 0)
    .fromTo('.fg-nav:not(.fg-nav--float)', { y: 0, autoAlpha: 1 }, { y: -40, autoAlpha: 0, duration: .45, immediateRender: false }, 0)
    .fromTo('.fg-monitor', { y: 0, opacity: 1 }, { y: -30, opacity: 0, duration: .38, immediateRender: false }, 0)
    /* photo is fully gone before the surface melts — no cutout seams */
    .fromTo(['.hero-canvas', '.hero-sticky', '.hero-fig'], { backgroundColor: '#ffffff' }, { backgroundColor: '#000f1e', duration: .55, immediateRender: false }, .42);

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
    gsap.set(nav, { yPercent: -110, autoAlpha: 0 });

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
    var hero = document.querySelector('.hero-fig');
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

    exSetBrand('rbtv');
    requestAnimationFrame(updateCrops);

    gsap.fromTo('.ex-card.brand-on', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out', stagger: 0.12, scrollTrigger: { trigger: '.exlib', start: 'top 60%', once: true } });
    gsap.timeline({ scrollTrigger: { trigger: '.exlib', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true }, defaults: { ease: 'none' } })
      .to({}, { duration: 0.7 })
      .to(exTrack, { x: function(){ return -(exTrack.scrollWidth - 1266); }, duration: 4 })
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
