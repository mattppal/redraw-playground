import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import { layout } from './context';

/**
 * Redraw's `interpolateColors(t, colors)` maps a 0→1 value onto a color
 * ramp. In real Redraw the color array is a comptime TypeScript array
 * baked into the shader at bundle time; in this playground the active
 * palette lives in a uniform so you can switch it live, so the helper
 * takes only `t`.
 */
export const interpolateColors = tgpu.fn(
  [d.f32],
  d.vec3f,
)/* wgsl */ `(t: f32) -> vec3f {
  let count = uni.paletteCount;
  if (count == 0u) {
    return vec3f(1.0, 1.0, 1.0);
  }
  if (count == 1u) {
    return uni.palette[0].rgb;
  }
  let x = clamp(t, 0.0, 1.0) * f32(count - 1u);
  let i = u32(floor(x));
  let j = min(i + 1u, count - 1u);
  return mix(uni.palette[i].rgb, uni.palette[j].rgb, x - floor(x));
}`.$uses({ uni: layout.bound.uni });
