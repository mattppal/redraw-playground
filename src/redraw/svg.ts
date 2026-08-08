/**
 * Flattens SVG geometry into an arc-length-parameterized polyline using
 * the browser's native path measurement (getTotalLength/getPointAtLength),
 * so every path command the browser understands works out of the box.
 */

export interface PathSample {
  /** Packed (x, y, t, subpathId) per sample point. */
  points: Float32Array;
  count: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const GEOMETRY_SELECTOR = 'path, circle, ellipse, rect, line, polyline, polygon';

/** Wraps bare path data ("M 10 10 C ...") into a minimal SVG document. */
function normalizeSvgText(input: string): string {
  const text = input.trim();
  if (text.startsWith('<')) return text;
  return `<svg xmlns="http://www.w3.org/2000/svg"><path d="${text}"/></svg>`;
}

export function sampleSvg(svgText: string, targetCount = 512): PathSample {
  if (svgText.length > 2_000_000) {
    throw new Error('SVG is too large (2 MB max).');
  }
  const doc = new DOMParser().parseFromString(
    normalizeSvgText(svgText),
    'image/svg+xml',
  );
  if (doc.querySelector('parsererror')) {
    throw new Error('Could not parse this as SVG. Paste a full <svg> or bare path data.');
  }
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') {
    throw new Error('The root element must be <svg>.');
  }

  // Must be attached (and not display:none) for geometry APIs + CTM.
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.setAttribute('style', 'position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none');
  for (const attr of Array.from(svg.attributes)) {
    if (attr.name !== 'style') host.setAttribute(attr.name, attr.value);
  }
  host.innerHTML = svg.innerHTML;
  document.body.appendChild(host);

  try {
    const elements = Array.from(
      host.querySelectorAll<SVGGeometryElement>(GEOMETRY_SELECTOR),
    ).filter((el) => typeof el.getTotalLength === 'function');

    const measured = elements
      .map((el) => {
        let length = 0;
        try {
          length = el.getTotalLength();
        } catch {
          length = 0;
        }
        return { el, length };
      })
      .filter((m) => Number.isFinite(m.length) && m.length > 1e-6);

    if (measured.length === 0) {
      throw new Error('No drawable geometry found (paths, circles, rects, …).');
    }

    const totalLength = measured.reduce((sum, m) => sum + m.length, 0);
    const xs: number[] = [];
    let accLength = 0;
    let subpathId = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const { el, length } of measured) {
      const n = Math.max(2, Math.round((targetCount * length) / totalLength));
      const step = length / (n - 1);
      const matrix = el.getCTM();
      let prevX = 0;
      let prevY = 0;

      for (let i = 0; i < n; i++) {
        const raw = el.getPointAtLength(i * step);
        let x = raw.x;
        let y = raw.y;
        if (matrix) {
          x = matrix.a * raw.x + matrix.c * raw.y + matrix.e;
          y = matrix.b * raw.x + matrix.d * raw.y + matrix.f;
        }
        // A jump much larger than the sampling step means we crossed into
        // a new subpath (a path with multiple M commands).
        if (i > 0) {
          const jump = Math.hypot(x - prevX, y - prevY);
          if (jump > Math.max(step * 4, 2)) subpathId++;
        }
        const t = (accLength + i * step) / totalLength;
        xs.push(x, y, t, subpathId);
        prevX = x;
        prevY = y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      accLength += length;
      subpathId++;
    }

    return {
      points: new Float32Array(xs),
      count: xs.length / 4,
      bounds: { minX, minY, maxX, maxY },
    };
  } finally {
    host.remove();
  }
}
