# Redraw Playground

A single-user web playground for the ideas behind **[Project Redraw](https://wcandillon.dev/article/hello-project-redraw)** by William Candillon: 2D path strokes driven by **TypeScript functions running on the GPU** — variable stroke width, color-along-path, and vector feathering.

Paste an SVG, watch it come alive, tweak parameters live, copy the effect code, grab an embed snippet, or record a short WebM clip.

Scope for this MVP is defined in [PLAN.md](./PLAN.md).

## What is Redraw?

Redraw is Candillon's experiment in richer 2D path primitives on WebGPU. Instead of a path receiving a *static* stroke width and color, you hand it **functions**:

```tsx
<Path
  path={hello}
  strokeWidth={(ctx) => {
    "use gpu";
    const wave = std.sin(ctx.t * 30);
    return 60 + wave * 30;
  }}
  color={(ctx) => {
    "use gpu";
    return interpolateColors(ctx.t, colors);
  }}
/>
```

The `"use gpu"` directive means the function is compiled to WGSL **at bundle time** (via [TypeGPU](https://docs.swmansion.com/TypeGPU/)) and executed per pixel on the GPU, with access to path geometry: arc length, distance to the path, tangents, plus animation values.

Upstream links:

- Announcement article: <https://wcandillon.dev/article/hello-project-redraw>
- Docs / demos: <https://wcandillon.github.io/redraw/>
- The bookmark that started this: <https://x.com/wcandillon/status/2078068411104403638>

## Real Redraw or a recreation?

**This is a faithful recreation of the public API shape, not the real package.** As of this writing, the `redraw` name on npm is a placeholder reserved by wcandillon himself — one file, 271 bytes, no code — and no other public package exists. Redraw is in early access. Per PLAN.md, no private preview packages were used.

What *is* real here:

- Effects are genuine TypeScript functions with the `"use gpu"` directive, compiled to WGSL at bundle time by `unplugin-typegpu` — the exact authoring model and toolchain Redraw is built on. See [`src/redraw/presets/`](./src/redraw/presets/).
- Each function receives a `PathContext` mirroring Redraw's callback contract: `t` (0 → 1 along the path by arc length), signed `distance` to the path, `tangent`, signed `curvature` (enabling the article's "thicker where the path bends"), the evaluated stroke `width` (for cross-stroke shading in the color/feather callbacks), and animation values (`time`, `progress`).
- The three programmable callbacks match Redraw's rules of the game: **stroke width**, **color**, and **feather**.

Known divergences (documented honestly):

- `interpolateColors(t)` reads the active palette from a uniform so you can switch palettes live; real Redraw takes a comptime TypeScript color array (`interpolateColors(ctx.t, ["cyan", "magenta"])`) baked into the shader.
- Rendering uses a brute-force per-pixel walk over the flattened path (a storage buffer of arc-length samples) instead of Redraw's Bézier acceleration structures. Fine for a playground; not how the real thing scales.
- No React Native / Skia / Three.js interop — this is a 2D WebGPU demo only.

## Requirements

- **A WebGPU-capable browser is required** — Chrome/Edge 113+ on desktop, Safari 26+, or Firefox 141+ on Windows ([caniuse.com/webgpu](https://caniuse.com/webgpu)). The app shows a clear fallback message when WebGPU is unavailable. Software WebGPU (SwiftShader) technically initializes but is too slow to present frames — use a real GPU.
- [Bun](https://bun.sh) as the package manager / task runner.

## Run it

```sh
bun install
bun run dev
```

Then open the printed URL (default <http://localhost:5173>) in a WebGPU-capable browser. You should immediately see an animated rainbow stroke on a squiggle path.

Other scripts:

```sh
bun run build   # type-check + production build
bun run smoke   # resolve all presets to WGSL and execute them on a CPU
                # WGSL interpreter — validates shaders without a GPU
bun run lint    # oxlint
```

`?debug` in the URL caps the canvas to a tiny backing store and exposes `window.__redrawDebug` frame counters — useful on slow/software GPU stacks.

## How it works

```
SVG text ──(browser getPointAtLength)──► arc-length samples (x, y, t, subpath)
                                              │ storage buffer
presets/*.ts  ──("use gpu" via unplugin-typegpu)──► WGSL functions
                                              │ tgpu.resolve
WGSL harness (fullscreen triangle) ───────────┴──► render pipeline
  per pixel: closest segment → PathContext {t, distance, tangent,
             curvature, width, time, progress}
             → strokeWidth(ctx), color(ctx), feather(ctx) → composite
```

- `src/redraw/context.ts` — `PathContext` struct, uniforms, bind group layout
- `src/redraw/presets/` — the effect functions (this is the code shown in the app's code panel, verbatim)
- `src/redraw/shader.ts` — WGSL harness + `tgpu.resolve` composition
- `src/redraw/renderer.ts` — WebGPU device/pipeline/loop (via TypeGPU)
- `src/redraw/svg.ts` — SVG → polyline flattening using native browser path measurement (handles all path commands, basic shapes, and transforms)

## UI

- **Left** — paste an SVG (or bare `d` path data), upload a file, or pick a sample (Squiggle, Heart, Star, Spiral)
- **Center** — the live WebGPU canvas, plus a 4-second WebM recorder
- **Right** — eight presets, speed / stroke scale sliders, four palettes, and a code panel with the preset's actual TypeScript source and a copyable iframe embed snippet (URL params restore preset, palette, speed, and scale)

### Presets

| Preset | Idea it demonstrates |
| --- | --- |
| Rainbow pulse | Variable stroke width — a wave of thickness and color travels along the path |
| Liquid feather | Vector feathering — the edge itself pulses and dissolves |
| Liquid metal | Cross-stroke shading — signed `ctx.distance` / `ctx.width` turn the stroke into a lit tube |
| Neon tube | White-hot filament + breathing halo, all feather-driven |
| Draw on | The path draws itself in — width is zero ahead of the traveling pen tip |
| Taper brush | Calligraphic taper with a living wobble |
| Ink bend | Curvature-driven width — thicker where the path bends (`ctx.curvature`) |
| Electric dash | Width collapses to zero between dashes racing along the path |

## Stack

Bun · Vite · React · TypeScript · [typegpu](https://www.npmjs.com/package/typegpu) + [unplugin-typegpu](https://www.npmjs.com/package/unplugin-typegpu) · Tailwind CSS v4 · shadcn/ui-style components · `bunfig.toml` enforces `minimumReleaseAge = 259200` (3 days) for supply-chain caution.
