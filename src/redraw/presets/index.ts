import type { EffectFns } from '../shader';
import * as drawOn from './drawOn';
import drawOnSource from './drawOn.ts?raw';
import * as electricDash from './electricDash';
import electricDashSource from './electricDash.ts?raw';
import * as inkBend from './inkBend';
import inkBendSource from './inkBend.ts?raw';
import * as liquidFeather from './liquidFeather';
import liquidFeatherSource from './liquidFeather.ts?raw';
import * as liquidMetal from './liquidMetal';
import liquidMetalSource from './liquidMetal.ts?raw';
import * as neonTube from './neonTube';
import neonTubeSource from './neonTube.ts?raw';
import * as rainbowPulse from './rainbowPulse';
import rainbowPulseSource from './rainbowPulse.ts?raw';
import * as taperBrush from './taperBrush';
import taperBrushSource from './taperBrush.ts?raw';

export interface Preset {
  id: string;
  name: string;
  description: string;
  fns: EffectFns;
  /** The actual TypeScript source of the effect (shown in the code panel). */
  source: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'rainbow-pulse',
    name: 'Rainbow pulse',
    description: 'Variable stroke width — a wave of thickness and color travels along the path.',
    fns: rainbowPulse,
    source: rainbowPulseSource,
  },
  {
    id: 'liquid-feather',
    name: 'Liquid feather',
    description: 'Vector feathering — the stroke edge itself pulses and dissolves like liquid.',
    fns: liquidFeather,
    source: liquidFeatherSource,
  },
  {
    id: 'liquid-metal',
    name: 'Liquid metal',
    description: 'Signed distance across the stroke shades it into a lit molten tube.',
    fns: liquidMetal,
    source: liquidMetalSource,
  },
  {
    id: 'neon-tube',
    name: 'Neon tube',
    description: 'White-hot filament in a thin glass tube with a breathing halo.',
    fns: neonTube,
    source: neonTubeSource,
  },
  {
    id: 'draw-on',
    name: 'Draw on',
    description: 'The path draws itself in — width is zero ahead of the traveling pen tip.',
    fns: drawOn,
    source: drawOnSource,
  },
  {
    id: 'taper-brush',
    name: 'Taper brush',
    description: 'Calligraphic taper — pointed ends, full body, and a living wobble.',
    fns: taperBrush,
    source: taperBrushSource,
  },
  {
    id: 'ink-bend',
    name: 'Ink bend',
    description: 'Curvature-driven width — the stroke thickens where the path bends.',
    fns: inkBend,
    source: inkBendSource,
  },
  {
    id: 'electric-dash',
    name: 'Electric dash',
    description: 'Width collapses to zero between dashes that race along the path.',
    fns: electricDash,
    source: electricDashSource,
  },
];

export const DEFAULT_PRESET = PRESETS[0];
