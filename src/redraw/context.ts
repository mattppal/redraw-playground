import tgpu from 'typegpu';
import * as d from 'typegpu/data';

/**
 * The per-pixel context handed to every "use gpu" effect function,
 * mirroring the API shape of Project Redraw: geometric information
 * about the path (arc length `t`, distance to the path, tangent)
 * plus animation values.
 */
export const PathContext = d.struct({
  /** 0 → 1 along the path, by arc length. */
  t: d.f32,
  /** Distance (px) from the current pixel to the path centerline. */
  distance: d.f32,
  /** Animation clock in seconds (already scaled by the speed control). */
  time: d.f32,
  /** Looping 0 → 1 animation value. */
  progress: d.f32,
  /** Position of the current pixel (px). */
  position: d.vec2f,
  /** Unit tangent of the path at the closest point. */
  tangent: d.vec2f,
});

export const MAX_PALETTE = 8;

export const Uniforms = d.struct({
  resolution: d.vec2f,
  time: d.f32,
  progress: d.f32,
  strokeScale: d.f32,
  pointCount: d.u32,
  paletteCount: d.u32,
  _pad: d.f32,
  palette: d.arrayOf(d.vec4f, MAX_PALETTE),
});

/**
 * Single bind group shared by the harness shader and by helper
 * functions (e.g. interpolateColors reads the palette uniform).
 */
export const layout = tgpu
  .bindGroupLayout({
    uni: { uniform: Uniforms },
    points: {
      storage: (n: number) => d.arrayOf(d.vec4f, n),
      access: 'readonly',
    },
  })
  .$idx(0);
