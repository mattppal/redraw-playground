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

if (process.argv.includes('--print')) {
  console.log('\n----- rainbowPulse WGSL -----\n');
  console.log(buildShaderCode(rainbowPulse));
}

process.exit(failed ? 1 : 0);
