import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// The path draws itself in: width is zero ahead of the animation head,
// which travels from t=0 to t=1 once per loop and bulges like a pen tip.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const head = ctx.progress * 1.12;
  const revealed = 1 - std.smoothstep(head - 0.03, head, ctx.t);
  const bulge = std.exp(-std.pow((ctx.t - head) * 40, 2)) * 9;
  return revealed * 15 + bulge;
});

// Freshly drawn ink glows white-hot, then settles into the palette.
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const head = ctx.progress * 1.12;
  const base = interpolateColors(ctx.t);
  const heat = std.exp(-std.max(head - ctx.t, 0) * 9);
  return std.add(base, d.vec3f(heat * 0.8, heat * 0.8, heat * 0.8));
});

// A soft tip, crisp everywhere else.
export const feather = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const head = ctx.progress * 1.12;
  return 1.5 + std.exp(-std.pow((ctx.t - head) * 40, 2)) * 8;
});
