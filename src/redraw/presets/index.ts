import type { EffectFns } from '../shader';
import * as electricDash from './electricDash';
import electricDashSource from './electricDash.ts?raw';
import * as liquidFeather from './liquidFeather';
import liquidFeatherSource from './liquidFeather.ts?raw';
import * as rainbowPulse from './rainbowPulse';
import rainbowPulseSource from './rainbowPulse.ts?raw';

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
    id: 'electric-dash',
    name: 'Electric dash',
    description: 'Width collapses to zero between dashes that race along the path.',
    fns: electricDash,
    source: electricDashSource,
  },
];

export const DEFAULT_PRESET = PRESETS[0];
