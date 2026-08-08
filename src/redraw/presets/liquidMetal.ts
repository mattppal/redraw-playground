import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// A molten bead of metal: width undulates slowly along the path.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  return 24 + std.sin(ctx.t * 9 - ctx.time * 1.6) * 8;
});

// Cross-stroke shading: ctx.distance is SIGNED, and ctx.width carries
// the evaluated stroke width, so u = distance / halfWidth spans -1 → 1
// across the stroke. An off-center highlight turns it into a lit tube.
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const u = std.clamp(ctx.distance / std.max(ctx.width * 0.5, 1), -1, 1);
  const base = interpolateColors(std.fract(ctx.t * 0.5 - ctx.progress));
  const highlight = std.exp(-std.pow((u + 0.4) * 2.4, 2));
  const rim = std.smoothstep(0.45, 1, std.abs(u));
  const body = std.mul(0.2 + 0.75 * highlight - 0.15 * rim, base);
  const gleam = std.pow(highlight, 4) * 0.85;
  return std.add(body, d.vec3f(gleam, gleam, gleam * 1.05));
});

// A tight edge keeps the surface tension believable.
export const feather = tgpu.fn([PathContext], d.f32)((_ctx) => {
  'use gpu';
  return 1.2;
});
