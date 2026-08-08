import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';
import { PathContext } from '../context';
import { interpolateColors } from '../helpers';

// "Make this stroke get thicker where the path bends" — the promise
// from the Redraw announcement. ctx.curvature is the signed curvature
// (rad/px) at the closest point, so tight turns swell with ink.
export const strokeWidth = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  const bend = std.min(std.abs(ctx.curvature) * 1100, 26);
  const breathe = 0.85 + 0.15 * std.sin(ctx.time * 2 + ctx.t * 6);
  return (5 + bend) * breathe;
});

// Straights stay cool (palette start); bends run hot (palette end).
export const color = tgpu.fn([PathContext], d.vec3f)((ctx) => {
  'use gpu';
  const heat = std.min(std.abs(ctx.curvature) * 900, 1);
  return interpolateColors(heat);
});

export const feather = tgpu.fn([PathContext], d.f32)((ctx) => {
  'use gpu';
  return 2 + std.min(std.abs(ctx.curvature) * 300, 6);
});
