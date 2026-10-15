Pebble Qore™ Vox landing page: plain HTML, CSS and JavaScript (no React, no build step)

Files
- index.html: the page. It includes the full desktop markup, so it still shows without JavaScript.
- styles.css: keyframes, hover states and base styles. Layout styles are inline in the markup.
- app.js: all behaviour, in plain JavaScript: colour picker, tabs, FAQ, mobile menu, cart pop-up, hero slider, scroll-driven chapters, reveal-on-scroll, sticky buy bar and the 3D viewer.
- data/data-d.js, data-t.js, data-m.js: pre-rendered page states for desktop (980px and up), tablet (640–979px) and mobile (under 640px). app.js loads only the one that matches the screen width.
- assets/: every image and the 3D model (assets/vox/qore-vox.glb). The lifestyle photos are compressed JPEGs.
- vendor/: Google's model-viewer web component and the mesh decoder for the 3D model. Neither depends on React.

Running it
- Opening index.html directly works for everything except the 3D model. Browsers block 3D model loading from file://.
- To see the 3D model, serve the folder, for example:  npx serve .   or   python3 -m http.server
- The fonts (Outfit, Figtree) load from Google Fonts, so they need an internet connection.

Notes
- Clicking anything restores the rest of the page to its default state for that colour. Combinations such as a finishes view plus a different FAQ answer are not remembered.
- The recording timer in the voice section is static.
- Prices (₹6,999 Qore™ Vox, ₹5,999 Qore™ Ultra) and the "Buy now" cart pop-up are placeholders. Connect them to the store before launch.
