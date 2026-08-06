# Red Bull Streaming Platform — Content Partner Asset Guidelines

A desktop-first, scroll-driven single-page microsite explaining the Universal Base Asset (UBA) and how one master image adapts across every screen. Built with plain HTML, CSS, and vanilla JS plus GSAP (ScrollTrigger). No build step, no framework, no runtime CDN dependency.

## Run it

Open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
# or
python3 -m http.server
```

## Deploy

It is a fully static site — deploy the folder as-is to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, etc.). No build command; the publish/output directory is the project root (where `index.html` lives).

## Structure

```
index.html                 markup, sections in page order, commented
css/styles.css             all styling: tokens, base, then one block per section
js/main.js                 all motion + interaction (documented, page order)
js/vendor/                 GSAP 3 + ScrollTrigger (MIT, self-hosted)
assets/img/                every image, named <section>-<brand>.<ext>
assets/fonts/              Bull Text (brand typeface), self-hosted woff2
assets/files/              UBA-Red-Bull-Streaming-Platform.psd (download target)
```

## How it works

- **Design canvas** — pinned sections lay out on a fixed 1440×800 canvas scaled to the viewport with `transform: scale(var(--hs))`. `--hs` (set in `js/main.js`) is a *contain* fit: `min(min(viewportWidth, 2560)/1440, viewportHeight/800)`, so every stage keeps its built-in breathing room and never overflows. 2560px is the max design width.
- **Pinned sections** share one skeleton: a tall wrapper (defines scroll length) then a `position: sticky` stage then the canvas. Scroll progress scrubs a GSAP timeline.
- **Brand switching** — the segmented control in the rule-of-thumb section toggles every `[data-brand]` image (`rbtv` / `stv` / `rally`): stage photo, TV, laptop, tablet, phone, and the Examples gallery follows the selected brand.
- **Examples crop tabs** — the 16:9 / 7:2 / 2:3 / 1:1 control sets which crop the hover preview reveals; hovering a card dims the frame and keeps the selected crop sharp. Windows are centered except the 7:2 banner, which anchors on each card's focal point (`data-focal-x/y`).
- **Scribbles** are stroke-only SVG paths drawn via dash-offset, roughened with SVG turbulence; a global ticker "boils" the turbulence for a hand-drawn feel.
- **Section hand-offs** — each section's exit is a scrubbed tween with explicit rest values so reverse scrolling always restores it.
- **Overflow** — all sections live inside `.page { overflow-x: clip }`; the mobile gate sits outside it so it stays viewport-true.
- **Reduced motion / no JS** — the `.reduced` class collapses pins and shows final states.
- **Below 900px** — a full-screen "built for desktop" gate shows, with a Download UBA PSD CTA and contact.

## Swapping content

- Drop a high-res master named after the image slot into `assets/src/` (git-ignored) and run `node tools/build-images.mjs`: it generates responsive WebP variants in `assets/img/` and rewrites the matching `<img>` tags (srcset/sizes/lazy) automatically.
- Section copy lives in plain markup in `index.html`.
- The three "Download UBA PSD" buttons (nav, mobile gate, Base Asset section) link to `assets/files/UBA-Red-Bull-Streaming-Platform.psd`. Replace that file (or repoint the `href`) to update the download.
- Hidden sections (partners / approach / comparison / delivery) remain in the file, disabled by one CSS rule; re-enable by removing them from the `display:none` list in `css/styles.css`.

## Fonts

Bull Text (Regular/Medium/Bold) is self-hosted in `assets/fonts/`. Schibsted Grotesk, Caveat (handwritten scribbles), and IBM Plex Mono (mono labels) load from Google Fonts as secondary/fallback faces.

## Note on the PSD

`assets/files/UBA-Red-Bull-Streaming-Platform.psd` is ~49MB. GitHub warns above 50MB and hard-rejects above 100MB; this is under the hard limit but consider [Git LFS](https://git-lfs.com) or hosting the PSD on a CDN/asset store and repointing the download links if repo size becomes a concern.
