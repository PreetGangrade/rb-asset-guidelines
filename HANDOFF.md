# Session handoff — rb-asset-guidelines

Everything for the site lives in this folder. It is a git repo pushing to
github.com/PreetGangrade/rb-asset-guidelines, published via GitHub Pages at
https://preetgangrade.github.io/rb-asset-guidelines/

## Run locally
```bash
python3 -m http.server 4173 --directory ~/rb-asset-guidelines
```
Then open http://localhost:4173 and HARD refresh (Cmd+Shift+R) after edits —
this server sends no cache headers.

## State right now
- Everything through the device-wall / delivery / footer work is COMMITTED
  and LIVE (last pushed commit: orbit hero v4 era, dab5cd6).
- UNCOMMITTED local work: the entire current orbit hero (the toggle variant),
  including the 1:1 field from Preet's Figma frame 903:54015 (86 tiles with
  authored positions/rotations/radii in js/main.js HO_FIELD), focal-point
  image crops, and spiral-in ambient motion. Latest revision (Preet's
  feedback rounds): glow is a CIRCLE radial per Preet's design handoff
  (#fff 20%, .5 at 24.8%, .1 at 29.6%, transparent; entrance opacity .96;
  z-index 1 above tiles, below copy; NO blur layer). HO_BASE=1.0 resting
  frame. Entrance order: copy first, nav slides in, then tiles stagger
  centre-out (arriveDelay base 1.45s) into an already-turning field.
  The hero canvas is the brand blue #000f1e at rest (same as .truth); copy
  is white, CTA is a white pill, tile glass/hairline flipped light. In
  orbit mode the in-page nav uses the floating nav's GLASS-BLUR pills
  (rgba(255,255,255,.12), white text) with only the Download CTA solid
  white; nav zooms .85 at <=1440px and .75 at <=1200px (all modes).
  Entrance reveal sweeps in the spiral direction (delay = angle + radius).
  Scroll: dive completes in the first 100vh ('+=100%' triggers); copy
  scales to .9 and hides; NO scaling of the field on scroll (push is
  constant), only the angular sweep (4.2) and per-tile rotation; instead
  of tiles fading, the CENTRE GLOW scales to 3.4x (done by ~40% of the
  dive) and swallows the field into solid blue, so the .truth section
  (pulled up -100vh, z-index 1, no apron) slides over pure blue and its
  text rises from the bottom. Footer cycling words: stories / moments /
  experiences / worlds.
- Figma restyle round (912:12121 / 912:16789 / 912:15758): hero headline is
  ALL CAPS in Futura LT Condensed Bold - the licensed file is NOT in the
  repo, so the stack falls back to Oswald 700 (Google Fonts); drop
  FuturaLTCondensed-Bold.woff2 into assets/fonts/ + an @font-face to
  upgrade. Hero sub is 16px Bull Text Regular #aaa with the break after
  "delivering a". Truth statements are 32/50 (bold white lead, medium 60%
  rest), stages 700/800px wide, scribbles scaled ~0.53 and repositioned;
  the t3 arrow now draws WITH the lead words (s3+=0.1) instead of after.
  UBA: INTRODUCING eyebrow (16px caps), title 76/78.4, marks scaled 1.27x,
  center gaps 4/12/24, sub Bull Regular 20px.
- Precision round (Figma 913:17173 / 914:19291): hero headline is Bull Text
  Bold 48/50 caps (Futura dropped), sub gap 8px, no trailing period. UBA
  title is single-line 44/52 caps, sub 16/26 two lines, button "Download
  UBA.PSD", center gap 16, hand-drawn marks hidden (display:none, code
  kept). Blueprint guides measured 1:1 from the Figma export: verticals
  x424/x1015, horizontals y268/y531, circle centre (720,432) r260; drawn
  once on arrival, layer fades out when leaving the section either
  direction. Truth: circle scribble sized from the word-box centre
  (1.34x/2.2x) so the ellipse never cuts letters; ONE continuous underline
  (u2 hidden) drawn at s2+=0.12; t3 arrow at s3+=0.1. Focal section content
  re-centred (heads 41 / stage 117 / tabs 713). Tab bar carries the
  hairline stroke, active pill is glass only. dl-chips say 3mb min /
  3-12mb ideal. Footer copy is "Not sure about something? / Ask the team",
  one group mailto to preet.gangrade@ + joshua.lamb@ +
  George.Sarantinos@redbull.com. Logo click scrolls to top via JS.
  IMPORTANT: all entrance reveals with ScrollTriggers use gsap.fromTo, not
  gsap.from - from() re-captures end values on ScrollTrigger refresh after
  the from-state is applied, which froze a.uba-btn at translate(0,26px)
  (the CTA gap bug Preet found in DevTools). Never reintroduce gsap.from
  with scrollTrigger here.
- Orbit is now THE hero: heroMode is hardcoded 'orbit', the nav toggle pill
  is gone (classic hero code kept but never shown; rbHero localStorage is
  ignored). The UBA PSD in assets/files/ was replaced with Preet's new
  114MB master (same filename, all links unchanged). The experience runs
  down to 768px (nav zooms .62 under 960px; canvases scale via --hs);
  below 768px the mobile gate shows, rebuilt 1:1 with Figma 921:27255:
  static glass tile field from HO_FIELD at 0.533x (.mg-field, built in
  main.js), centre radial glow, top/bottom fades, caps headline, Download
  UBA.psd pill, and "Not sure about something? Ask the team" (same group
  mailto as the footer).
- Final pre-push round: the mobile gate field now uses the REAL orbit
  imagery + ambient spiral (same HO_FIELD/HO_FOCAL, shared ticker, scale =
  innerWidth/737 clamped .45-1), page scroll is disabled under 768px, the
  UBA vertical guidelines overshoot the canvas (+-600px) so they fill any
  viewport height, ".PSD" labels are now ".psd", and the nav gained a
  "Requirements" pill linking #delivery. IMPORTANT - PSD delivery: the new
  master PSD is 108.7MiB, over GitHub's hard 100MiB file limit (and Pages
  cannot serve LFS), so the repo tracks assets/files/UBA-...zip (83MiB,
  contains the PSD) and all download links point at the .zip; the raw .psd
  stays local only (gitignored). Pushed to origin/main per Preet's go.

## Key places
- index.html — sections in page order; orbit hero markup near the top
  (section.hero-orbit), delivery + footer near the bottom.
- js/main.js — all motion. Orbit hero block starts at the comment
  "orbit hero: 1:1 field from Figma 903:54015". HO_FIELD is the authored
  tile list (never regenerate procedurally). HO_BASE (1.6) = resting zoom,
  HO_OMEGA = rotation speed, breathe = spiral-in depth/period.
- css/styles.css — one block per section; .ho-* rules for the orbit hero.
- tools/build-images.mjs — image pipeline: drop hi-res masters named after a
  slot into assets/src/ (git-ignored), run `node tools/build-images.mjs`,
  it generates WebP srcset ladders and rewrites index.html.
- Hero toggle: "Hero: Classic/Orbit" pill in the nav, persisted in
  localStorage key `rbHero` (classic is the default for visitors).

## Open threads
- Preet will review the current orbit hero (gradient layer, spiral-in motion,
  1.6 base frame) and then wants an animation-improvement pass on it.
- Real orbit imagery: tiles currently reuse site images with focal crops
  (HO_FOCAL map). Preet may deliver a zip for the 86 slots later — add
  src per slot in HO_FIELD, geometry stays authored.
- Copy rule: NO em dashes anywhere. Delivery of everything happens only on
  Preet's explicit "push it".
