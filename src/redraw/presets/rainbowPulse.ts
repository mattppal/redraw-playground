import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// A wave of thickness travels along the path — the hero effect from
// the "Hello, Project Redraw" article. ctx.t runs 0 → 1 by arc length.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const wave = std.sin(ctx.t * 30 - ctx.time * 3);
  return 22 + wave * 13;
});

// The palette flows backwards along the path, one full cycle per loop.
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  return interpolateColors(std.fract(ctx.t - ctx.progress));
});

// A crisp, anti-aliased edge.
export const feather = tgpu.fn([PathContext], d.f32)((_ctx) => {
  'use gpu';
  return 1.5;
});
