# Redraw Playground — MVP Plan

## Goal
Let one user feel the core idea of [Project Redraw](https://wcandillon.dev/article/hello-project-redraw) (William Candillon): 2D path strokes/fills driven by **TypeScript functions on the GPU** (variable width, color-along-path, vector feathering) — paste an SVG, see a living effect, copy/embed the result.

Source bookmark: https://x.com/wcandillon/status/2078068411104403638  
Docs/playground: https://wcandillon.github.io/redraw/

## MVP (in)
- Bun + Vite + React + TypeScript SPA
- `bunfig.toml` with `[install] minimumReleaseAge = 259200`
- shadcn/ui minimalist chrome + Tailwind
- Layout: SVG paste/upload | live WebGPU canvas | effect controls + code/embed panel
- At least **two** demo presets inspired by official Redraw demos (e.g. variable stroke along a path, liquid/metal or feathered text/path). Prefer integrating the real Redraw package / patterns if publicly installable; otherwise faithfully recreate the *API shape* (stroke width/color as TS functions of arc length / distance) on WebGPU or a documented fallback, and note the upstream status in the README.
- Export: download a short WebM/MP4 *or* copy an embeddable snippet (match the bookmark promise as closely as practical)
- README: what Redraw is, WebGPU requirement, how to run, link upstream + this PLAN

## MVP (out)
- React Native / native Skia builds
- Full Redraw technical-preview private API reverse-engineering if the package is closed
- Auth, multi-user, persistence, analytics
- A full shader IDE

## Tasks (outcome-oriented)
1. User opens the app and immediately sees an animated path effect (no blank canvas)
2. User can paste/replace an SVG path and the effect updates
3. User can tweak 2–3 parameters (speed, stroke scale, palette) live
4. User can copy code or export a short clip/embed
5. README is honest about WebGPU + upstream access model

## Stack
- Bun + `bunx create-vite@latest` (React-TS)
- Prefer official Redraw / TypeGPU integration when available
- Fallback only if needed: `@react-three/fiber` is the wrong stack here — stay 2D/WebGPU
- shadcn/ui for controls

## Deferred
- Native (React Native Skia) twin
- Video export polish / timeline editor
- Community effect gallery
