# VioletSky

A Bluesky (AT Protocol) PWA built with **SvelteKit** – the Svelte port of PurpleSky. Features feeds, forums, consensus, and collaboration tools.

## Features

- **Masonry Feed** – Multi-column grid of posts with infinite scroll
- **Feed Mixing** – Combine multiple Bluesky feeds by percentage
- **OAuth Login** – Log in with Bluesky (any PDS)
- **Post Creation** – Compose and publish posts
- **Sorting** – Newest, Trending, Wilson score, Controversial (WASM-powered)
- **Collections** – Save posts to artboards (stub)
- **Forums, Consensus, Collab** – Placeholder routes for future features

## Tech Stack

| Layer   | Technology                            |
| ------- | ------------------------------------- |
| Framework | [SvelteKit](https://kit.svelte.dev/) |
| Protocol | [AT Protocol](https://atproto.com/) (Bluesky) |
| Build   | Vite + adapter-static                 |
| WASM    | Rust (shared with PurpleSky)          |

## Prerequisites

- Node.js 20+
- Rust + wasm-pack (for WASM build; optional – JS fallbacks work without it)

## Setup

```bash
# Install dependencies
npm install

# Build WASM (from parent purplesky folder; copies to violetsky)
cd ../purplesky && npm run build:wasm
cp -r src/wasm-pkg ../violetsky/src/

# Or if wasm-pkg already exists in violetsky/src, skip the above
```

## Development

```bash
npm run dev
# Opens at http://localhost:5173
```

## Build

```bash
npm run build
# Output in build/
```

## Deploy

The app uses `@sveltejs/adapter-static` for static output. Deploy the `build/` folder to any static host (GitHub Pages, Netlify, Vercel, etc.).

For GitHub Pages at a subpath (e.g. `/violetsky/`):

```bash
VITE_BASE_PATH=/violetsky/ npm run build
```

## Project Structure

```
violetsky/
├── src/
│   ├── lib/           # Shared code
│   │   ├── bsky.ts    # AT Protocol client
│   │   ├── oauth.ts   # OAuth "Log in with Bluesky"
│   │   ├── stores/    # Svelte stores
│   │   └── components/
│   ├── routes/        # SvelteKit file-based routing
│   └── app.css        # Global styles
├── static/            # PWA assets (manifest, icon, sw, client-metadata)
└── svelte.config.js
```

## License

AGPL-3.0-or-later (same as PurpleSky)
