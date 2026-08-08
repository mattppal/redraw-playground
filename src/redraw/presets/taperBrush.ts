import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// A calligraphic stroke: full-bodied in the middle, tapering to points
// at both ends, with a slow living wobble along the bristles.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const taper = std.pow(std.sin(ctx.t * 3.14159), 0.65);
  const wobble = 1 + 0.14 * std.sin(ctx.t * 34 + ctx.time * 1.4);
  return taper * 30 * wobble;
});

// Pigment pools where the brush presses hardest (widest part).
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const base = interpolateColors(std.fract(ctx.t * 0.35 + ctx.progress * 0.2));
  const pressure = 0.55 + 0.45 * std.pow(std.sin(ctx.t * 3.14159), 0.65);
  return std.mul(pressure, base);
});

// A dry-brush edge: slightly rougher than a hard stroke.
export const feather = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  return 2.5 + 1.5 * std.sin(ctx.t * 55 + ctx.time * 0.8);
});
