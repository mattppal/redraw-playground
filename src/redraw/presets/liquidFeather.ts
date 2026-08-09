import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// Two detuned sine waves make the core stroke breathe organically.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const slow = std.sin(ctx.t * 9 - ctx.time * 1.6);
  const fast = std.sin(ctx.t * 43 + ctx.time * 3.1);
  return 13 + slow * 6 + fast * 2.5;
});

// Colors drift along the path and shimmer in brightness.
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const base = interpolateColors(std.fract(ctx.t * 0.6 - ctx.progress));
  const shimmer = 0.75 + 0.25 * std.sin(ctx.t * 18 + ctx.time * 2.4);
  return std.mul(shimmer, base);
});

// Vector feathering: the edge itself pulses, dissolving the stroke
// into the background like liquid — no blur post-processing involved.
export const feather = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const pulse = std.sin(ctx.t * 7 - ctx.time * 2);
  return 24 + pulse * 17;
});
