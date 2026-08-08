import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// Dashes race along the path: width collapses to zero between dashes.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const phase = std.fract(ctx.t * 26 - ctx.time * 1.9);
  const dash = std.smoothstep(0.28, 0.42, phase) * (1 - std.smoothstep(0.86, 1, phase));
  return dash * (14 + 6 * std.sin(ctx.t * 6 + ctx.time));
});

// Hot core: palette color pushed toward white at each dash head.
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const base = interpolateColors(std.fract(ctx.t - ctx.progress * 2));
  const head = std.pow(std.fract(ctx.t * 26 - ctx.time * 1.9), 8);
  return std.add(base, d.vec3f(head, head, head));
});

// A soft halo makes the dashes read as electric sparks.
export const feather = tgpu.fn([PathContext], d.f32)((_ctx) => {
  'use gpu';
  return 9;
});
