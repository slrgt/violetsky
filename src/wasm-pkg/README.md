# WASM package (stub)

This folder contains a **stub** so the app builds on CI and when the Rust WASM hasn’t been built.

- **With stub (default):** Feed sorting uses JS fallbacks; app works normally.
- **With real WASM:** From the [purplesky](https://github.com/slrgt/purplesky) repo, run `npm run build:wasm` in violetsky to copy the built WASM here (overwrites this stub).
