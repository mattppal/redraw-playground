import tgpu, { type TgpuFn } from 'typegpu';
import { PathContext, layout } from './context';

/** The three programmable callbacks of a Redraw effect. */
export interface EffectFns {
  /** Stroke width in px, as a function of path geometry + time. */
  strokeWidth: TgpuFn;
  /** Stroke color (rgb, 0..1), as a function of path geometry + time. */
  color: TgpuFn;
  /** Feather radius in px — how far the edge dissolves outward. */
  feather: TgpuFn;
}

/**
 * WGSL harness: a fullscreen triangle whose fragment stage walks the
 * flattened path (a storage buffer of (x, y, t, subpath) samples),
 * finds the closest segment, and hands the resulting PathContext to
 * the user's TypeScript effect functions (compiled to WGSL by TypeGPU).
 */
const TEMPLATE = /* wgsl */ `
@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var verts = array<vec2f, 3>(
    vec2f(-1.0, -3.0),
    vec2f(3.0, 1.0),
    vec2f(-1.0, 1.0),
  );
  return vec4f(verts[vi], 0.0, 1.0);
}

fn shade(p: vec2f) -> vec4f {
  let n = uni.pointCount;

  var minDist = 1e9;
  var side = 1.0;
  var bestT = 0.0;
  var bestCurv = 0.0;
  var bestTan = vec2f(1.0, 0.0);

  for (var i = 0u; i + 1u < n; i = i + 1u) {
    let a = points[i];
    let b = points[i + 1u];
    // Points on different subpaths do not form a segment.
    if (a.seg != b.seg) {
      continue;
    }
    let pa = p - a.pos;
    let ba = b.pos - a.pos;
    let len2 = max(dot(ba, ba), 1e-6);
    let h = clamp(dot(pa, ba) / len2, 0.0, 1.0);
    let dist = length(pa - ba * h);
    if (dist < minDist) {
      minDist = dist;
      side = select(-1.0, 1.0, ba.x * pa.y - ba.y * pa.x >= 0.0);
      bestT = mix(a.t, b.t, h);
      bestCurv = mix(a.curvature, b.curvature, h);
      bestTan = ba * inverseSqrt(len2);
    }
  }

  var ctx: PathContext;
  ctx.t = bestT;
  ctx.distance = minDist * side;
  ctx.time = uni.time;
  ctx.progress = uni.progress;
  ctx.width = 0.0;
  ctx.curvature = bestCurv;
  ctx.position = p;
  ctx.tangent = bestTan;

  let widthPx = max(strokeWidthFn(ctx) * uni.strokeScale, 0.0);
  ctx.width = widthPx;
  let featherPx = max(featherFn(ctx) * uni.strokeScale, 0.0);
  let rgb = colorFn(ctx);

  let halfW = widthPx * 0.5;
  let alpha = clamp(
    1.0 - smoothstep(halfW - 0.75, halfW + featherPx + 0.75, minDist),
    0.0,
    1.0,
  );

  // Ambient background with a soft vignette + faint glow from the stroke.
  let uvc = p / uni.resolution - vec2f(0.5, 0.5);
  let bg = mix(
    vec3f(0.050, 0.053, 0.070),
    vec3f(0.016, 0.016, 0.026),
    clamp(dot(uvc, uvc) * 2.4, 0.0, 1.0),
  );
  let glow = exp(-max(minDist - halfW, 0.0) / max(featherPx * 2.0 + 24.0, 1.0)) * 0.085;

  let outRgb = mix(bg, rgb, alpha) + rgb * glow;
  return vec4f(outRgb, 1.0);
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  return shade(fragCoord.xy);
}
`;

/** Resolve the harness + user effect functions into a single WGSL module. */
export function buildShaderCode(fns: EffectFns): string {
  return tgpu.resolve({
    template: TEMPLATE,
    externals: {
      PathContext,
      uni: layout.bound.uni,
      points: layout.bound.points,
      strokeWidthFn: fns.strokeWidth,
      colorFn: fns.color,
      featherFn: fns.feather,
    },
  });
}
