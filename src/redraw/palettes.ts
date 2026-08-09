export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    // Homage to the gradient used in the Redraw announcement demos.
    id: 'candillon',
    name: 'Candillon',
    colors: ['#3FCEBC', '#3CBCEB', '#5F96E7', '#816FE3', '#9F5EE2', '#BD4CE0'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#FF6B6B', '#FECA57', '#FF9FF3', '#54A0FF'],
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: ['#00F5D4', '#00BBF9', '#9B5DE5', '#F15BB5', '#FEE440'],
  },
  {
    id: 'mono',
    name: 'Mono',
    colors: ['#F4F4F5', '#A1A1AA', '#52525B'],
  },
];

export const DEFAULT_PALETTE = PALETTES[0];
