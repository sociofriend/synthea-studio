# Synthéa studio architecture (map)

`README.md` ("Engineering") has the detail; this page is only the shape.

```
index.html ─ js/app.js (composition root)
  js/viewmodels/*  publish state through js/core/subject.js (a CurrentValueSubject)
  js/views/*       subscribe and render; tab lists via js/core/tabs.js
  js/render/pearl.js          the pearl, Canvas 2D (same renderer as the identity kit)
  js/audio/calm-ocean-*.js    Aethéa's "Calm Ocean" in an AudioWorklet
  js/model/content.js         data behind the interactive sections
css/: tokens → base → components → sections        sw.js: offline cache
native/Synthea/: SwiftUI pearl shown on the page; tools/highlight-swift.py refreshes its HTML
```
