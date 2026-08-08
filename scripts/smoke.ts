/**
 * Resolves every preset into WGSL without needing a GPU, so shader
 * composition problems surface in CI/terminal instead of the browser.
 * Run with: bun run smoke
 */
import { WgslReflect } from 'wgsl_reflect/wgsl_reflect.module.js';
import * as electricDash from '../src/redraw/presets/electricDash';
import * as liquidFeather from '../src/redraw/presets/liquidFeather';
import * as rainbowPulse from '../src/redraw/presets/rainbowPulse';
import { buildShaderCode } from '../src/redraw/shader';

const presets = { rainbowPulse, liquidFeather, electricDash };

let failed = false;
for (const [name, fns] of Object.entries(presets)) {
  try {
    const code = buildShaderCode(fns);
    // Throws on WGSL syntax errors.
    const reflect = new WgslReflect(code);
    const checks: Array<[string, boolean]> = [
      ['parses with two entry points', reflect.entry.vertex.length === 1 && reflect.entry.fragment.length === 1],
      ['has vertex entry', code.includes('@vertex')],
      ['has fragment entry', code.includes('@fragment')],
      ['has uniform binding', /@group\(0\)\s*@binding\(0\)/.test(code)],
      ['has storage binding', /@group\(0\)\s*@binding\(1\)/.test(code)],
      ['no leftover placeholders', !code.includes('undefined')],
    ];
    const bad = checks.filter(([, ok]) => !ok);
    if (bad.length > 0) {
      failed = true;
      console.error(`✗ ${name}: ${bad.map(([label]) => label).join(', ')}`);
    } else {
      console.log(`✓ ${name} resolved to ${code.length} chars of WGSL`);
    }
  } catch (err) {
    failed = true;
    console.error(`✗ ${name} failed to resolve:`, err);
  }
}

// ---------------------------------------------------------------------------
// Functional test: execute the resolved shader on the CPU with the
// wgsl_reflect interpreter and check actual pixel colors — a pixel on
// the path centerline must produce a palette color, a distant pixel
// must stay near the dark background.
// ---------------------------------------------------------------------------
async function functionalTest(): Promise<boolean> {
  const { WgslExec, WgslParser } = (await import(
    'wgsl_reflect/wgsl_reflect.module.js'
  )) as unknown as {
    WgslParser: new () => { parse(code: string): unknown };
    WgslExec: new (ast: unknown) => {
      dispatchWorkgroups(
        name: string,
        count: number,
        bindGroups: Record<number, Record<number, ArrayBufferView>>,
      ): void;
    };
  };

  const harness = /* wgsl */ `
@group(1) @binding(0) var<storage, read> testPixels: array<vec2f>;
@group(1) @binding(1) var<storage, read_write> testOut: array<vec4f>;
@compute @workgroup_size(1)
fn test_main(@builtin(global_invocation_id) gid: vec3u) {
  testOut[gid.x] = shade(testPixels[gid.x]);
}
`;
  const code = buildShaderCode(rainbowPulse) + harness;

  // Uniforms: 200x100 canvas, t=0, strokeScale=1, 3 path points, 2 colors.
  const uniF = new Float32Array(40);
  const uniU = new Uint32Array(uniF.buffer);
  uniF[0] = 200; // resolution.x
  uniF[1] = 100; // resolution.y
  uniF[2] = 0; // time
  uniF[3] = 0; // progress
  uniF[4] = 1; // strokeScale
  uniU[5] = 3; // pointCount
  uniU[6] = 2; // paletteCount
  uniF.set([1, 0, 0, 1], 8); // palette[0] = red
  uniF.set([0, 0, 1, 1], 12); // palette[1] = blue

  // A horizontal line y=50 from x=20 to x=180 (x, y, t, subpath).
  const points = new Float32Array([20, 50, 0, 0, 100, 50, 0.5, 0, 180, 50, 1, 0]);
  // Pixel 0 sits exactly on the line's midpoint; pixel 1 is far away.
  const testPixels = new Float32Array([100, 50, 10, 95]);
  const testOut = new Float32Array(8);

  const exec = new WgslExec(new WgslParser().parse(code));
  exec.dispatchWorkgroups('test_main', 2, {
    0: { 0: uniF, 1: points },
    1: { 0: testPixels, 1: testOut },
  });

  const onPath = Array.from(testOut.slice(0, 3));
  const offPath = Array.from(testOut.slice(4, 7));
  const luma = (c: number[]) => (c[0] + c[1] + c[2]) / 3;

  // t=0.5 with a red→blue palette must land near purple (r≈b, g≈0).
  const checks: Array<[string, boolean]> = [
    ['on-path pixel is bright', luma(onPath) > 0.25],
    ['on-path pixel is purple-ish', onPath[0] > 0.3 && onPath[2] > 0.3 && onPath[1] < 0.15],
    ['off-path pixel stays dark', luma(offPath) < 0.12],
    ['stroke clearly separates from background', luma(onPath) - luma(offPath) > 0.2],
  ];
  const bad = checks.filter(([, ok]) => !ok);
  if (bad.length > 0) {
    console.error(
      `✗ functional pixel test: ${bad.map(([l]) => l).join(', ')}\n  on-path=${onPath.map((v) => v.toFixed(3))} off-path=${offPath.map((v) => v.toFixed(3))}`,
    );
    return false;
  }
  console.log(
    `✓ functional pixel test — on-path rgb=(${onPath.map((v) => v.toFixed(3))}), off-path rgb=(${offPath.map((v) => v.toFixed(3))})`,
  );

  // Every preset must at least produce finite colors on the CPU interpreter.
  for (const [name, fns] of Object.entries(presets)) {
    const out = new Float32Array(8);
    const presetExec = new WgslExec(
      new WgslParser().parse(buildShaderCode(fns) + harness),
    );
    presetExec.dispatchWorkgroups('test_main', 2, {
      0: { 0: uniF, 1: points },
      1: { 0: testPixels, 1: out },
    });
    if (!Array.from(out).every((v) => Number.isFinite(v))) {
      console.error(`✗ ${name} produced non-finite pixel values:`, Array.from(out));
      return false;
    }
    console.log(`✓ ${name} executes on CPU with finite output`);
  }
  return true;
}

try {
  if (!(await functionalTest())) failed = true;
} catch (err) {
  failed = true;
  console.error('✗ functional pixel test threw:', err);
}

if (process.argv.includes('--print')) {
  console.log('\n----- rainbowPulse WGSL -----\n');
  console.log(buildShaderCode(rainbowPulse));
}

process.exit(failed ? 1 : 0);
