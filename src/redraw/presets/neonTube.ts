import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// A neon sign: the glass tube itself is thin and constant.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  return 7 + 0.6 * std.sin(ctx.time * 8 + ctx.t * 3);
});

// White-hot filament at the center of the tube, palette-colored gas
// toward the walls (ctx.distance is signed; ctx.width is evaluated).
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const u = std.abs(ctx.distance) / std.max(ctx.width * 0.5, 1);
  const core = std.exp(-u * u * 3.5);
  const flicker = 0.9 + 0.1 * std.sin(ctx.time * 23 + ctx.t * 40);
  const gas = interpolateColors(std.fract(ctx.t - ctx.progress * 0.5));
  return std.mul(flicker, std.add(std.mul(0.85, gas), d.vec3f(core, core, core)));
});

// The halo does the heavy lifting: a big breathing feather.
export const feather = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  return 20 + 6 * std.sin(ctx.time * 1.7 + ctx.t * 4);
});
