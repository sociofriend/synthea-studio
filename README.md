# Synthéa

**Concept, brand and product, designed as one system and built.**
*Not less human. More self-defined.*

Live at **https://sociofriend.github.io/synthea-studio**

This is the home of Synthéa (say it *sin-THAY-uh*, /sɪnˈθeɪ.ə/). The site shows Synthéa's own identity as a case study. It started as a written guidebook with no images, and became a versioned identity system whose assets are all rendered from code. The site makes a promise to clients and then shows the work behind it.

## What's on the page

| Section | What it shows |
|---|---|
| Hero | A live, code-rendered Synthetic Pearl. Its inner signal drifts slowly and follows the pointer. |
| The promise | Four commitments a client can hold Synthéa to. |
| Case study | The Synthéa identity, followed from concept to brand to representation. |
| Mobile software | The same pearl written in SwiftUI, in an Xcode-style viewer (view, Combine view model, renderer), plus the app icon at its real iPhone sizes. |
| Identity system | The symbol variants, the colours (select one to copy its hex value), the type and the emblem, in both appearances. |
| Surfaces | Production files for X, LinkedIn, GitHub, YouTube, posts, a carousel and stories, with a lightbox. |
| Evolution | Every kit version and what changed, as an accessible tab list. |
| Services | What Synthéa builds, and how a project runs. |

## Engineering

- **No framework and no build step.** The site is semantic HTML, modern CSS and native ES modules, so it can be served as is.
- **MVVM.** View models publish state through a small `Subject`, modelled on Combine's `CurrentValueSubject`. Views subscribe and render. `js/app.js` is the composition root.
- **The pearl is drawn, not photographed.** `js/render/pearl.js` is the same renderer that produces the identity kit. For the hero, the pearl's static layers are cached once, and each frame redraws only the signal. That keeps the hero at 60 fps. It pauses when the hero is off-screen or the tab is hidden, and it stays still when the visitor has asked for reduced motion.
- **Native counterpart.** `native/` holds the SwiftUI version of the pearl: `PearlView` draws it with `Canvas` in a `TimelineView`, and `PearlViewModel` uses Combine to pause it for Reduce Motion or when it leaves the screen. It needs iOS 17 or later. The page shows these files as static, highlighted HTML.
- **Two appearances.** Obsidian is the default and Soft White follows the device setting. The switch in the header overrides either one, and the choice is remembered. Everything runs on design tokens (`css/tokens.css`).
- **Installable.** A web app manifest and a service worker let visitors install the site and open it offline after their first visit.
- **Accessible.**
  - semantic landmarks and a skip link
  - visible focus states
  - an ARIA tab pattern with arrow-key navigation
  - a native `<dialog>` lightbox
  - alt text on every image
  - colour contrast checked in both appearances
- **Light.** Images are WebP sized for display, and the brand fonts are self-hosted subsets. There are no trackers and no third-party requests.

## Structure

```
index.html                 the page; its copy is static HTML, so it reads without JavaScript
404.html
manifest.webmanifest
sw.js                      offline cache (bump VERSION on each release)
css/
  fonts.css                self-hosted Manrope, Cormorant Garamond, IBM Plex Mono
  tokens.css               colour, type, space and motion tokens, both appearances
  base.css                 reset, typography, layout primitives
  components.css           navigation, buttons, chips, swatches, toast, lightbox
  sections.css             page sections, in page order
js/
  app.js                   composition root
  core/subject.js          value publisher (Combine-style)
  core/storage.js          best-effort preference storage
  core/tabs.js             ARIA tab behaviour shared by the code viewer and the version list
  model/content.js         data behind the interactive parts: palette, versions, contact
  viewmodels/              appearance, selection (any tab list), toast
  views/                   hero, appearance switch, palette, code, evolution, gallery, pronunciation, contact, toast
  render/pearl.js          the Synthetic Pearl renderer
native/Synthea/            the pearl in SwiftUI: Views, ViewModels, Rendering
tools/highlight-swift.py   refreshes the highlighted Swift in index.html from native/
assets/
  img/                     production assets from the identity kit (WebP)
  icons/                   favicon, touch icon, app icons
  fonts/
```

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

ES modules need to be served over HTTP; they won't load from `file://`.

## Edit

- **Copy:** `index.html`.
- **Swift:** edit the files in `native/`, then run `python3 tools/highlight-swift.py` to refresh the code shown on the page.
- **Palette, versions, contact email:** `js/model/content.js`. Setting `contact.email` turns the main call to action into an email link.
- After a release, bump `VERSION` in `sw.js` so returning visitors get the new files.

## Deploy

GitHub Pages publishes the `main` branch of this repository (Settings → Pages → Deploy from a branch → `main` / root). Push to `main`, and the site updates within a minute or two. Absolute URLs (canonical, Open Graph, `404.html`) use the `/synthea-studio/` base path.

---

© 2026 Synthéa. All rights reserved. Fonts are used under the SIL Open Font License. Apple, iPhone, iPad, iOS, Swift, SwiftUI and Xcode are trademarks of Apple Inc., registered in the U.S. and other countries.
