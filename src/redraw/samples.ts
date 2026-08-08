/** Built-in sample geometry for the playground. */

function spiralPath(): string {
  const cx = 400;
  const cy = 300;
  const turns = 4.2;
  const steps = 160;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const angle = u * turns * Math.PI * 2;
    const radius = 14 + u * 240;
    const x = (cx + Math.cos(angle) * radius).toFixed(1);
    const y = (cy + Math.sin(angle) * radius * 0.78).toFixed(1);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return parts.join(' ');
}

export interface SvgSample {
  id: string;
  name: string;
  svg: string;
}

export const SAMPLES: SvgSample[] = [
  {
    id: 'squiggle',
    name: 'Squiggle',
    svg: `M 60 300 C 130 90, 240 90, 320 270 S 460 480 560 270 S 690 110 750 210`,
  },
  {
    id: 'heart',
    name: 'Heart',
    svg: `M 400 210 C 400 150 348 100 288 100 C 220 100 180 155 180 215 C 180 305 290 375 400 460 C 510 375 620 305 620 215 C 620 155 580 100 512 100 C 452 100 400 150 400 210 Z`,
  },
  {
    id: 'star',
    name: 'Star',
    svg: `M 400 80 L 448 238 L 612 238 L 480 336 L 528 494 L 400 398 L 272 494 L 320 336 L 188 238 L 352 238 Z`,
  },
  {
    id: 'spiral',
    name: 'Spiral',
    svg: spiralPath(),
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0];
