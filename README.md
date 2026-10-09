# KusotPh website

Marketing site for KusotPh: the "Ready na po ba?" story, how it works, features, and who built it.
Demo requests go straight to Facebook Messenger: https://www.facebook.com/D3nzD3vt3st/

A plain static site served by a **Cloudflare Worker** (static assets). No build step, no npm install, no server code.

```
kusotphsite/
├── public/            ← everything that gets deployed
│   ├── index.html     page content and story copy
│   ├── styles.css
│   ├── main.js        scroll effects and card tilt
│   ├── scene.js       3D washer (Three.js from cdn.jsdelivr.net)
│   ├── _headers       security headers + cache rules
│   └── robots.txt
└── wrangler.toml
```

## Run locally

```bash
npx wrangler dev --port 8788
```

Open http://127.0.0.1:8788.

## Deploy to Cloudflare

The repo is connected to a Cloudflare Worker. Every push to `main` runs `npx wrangler deploy`,
which uploads `public/`. Dashboard build settings: **build command** empty,
**deploy command** `npx wrangler deploy`, **root directory** `/`.

The Worker's name in the Cloudflare dashboard must match `name` in `wrangler.toml` (`kusotph`).

## After editing

Browsers cache `.js` and `.css` for an hour. When you change one, bump its `?v=` number in
`index.html` (for `styles.css`, `main.js`) or in `main.js` (for `scene.js`).
