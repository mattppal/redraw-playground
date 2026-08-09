import tgpu, {
  type StorageFlag,
  type TgpuBindGroup,
  type TgpuBuffer,
  type TgpuRoot,
  type UniformFlag,
} from 'typegpu';
import * as d from 'typegpu/data';
import { MAX_PALETTE, PathPoint, Uniforms, layout } from './context';
import { buildShaderCode, type EffectFns } from './shader';
import type { PathSample } from './svg';

const LOOP_SECONDS = 6;
const MAX_DPR = 2;

/**
 * With ?debug in the URL the backing store is capped to a tiny pixel
 * count so software WebGPU implementations (SwiftShader) can keep up,
 * and frame/submit counters are exposed on window.__redrawDebug.
 */
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
const DEBUG_PIXEL_CAP = 34_000;

/**
 * Fills slot 3 of each 6-float point with signed curvature (rad/px in
 * canvas space), estimated from the turning angle between neighboring
 * segments and smoothed to tame arc-sampling noise.
 */
function computeCurvature(fitted: Float32Array, count: number): void {
  const curv = new Float32Array(count);
  for (let i = 1; i + 1 < count; i++) {
    const seg = fitted[i * 6 + 4];
    if (fitted[(i - 1) * 6 + 4] !== seg || fitted[(i + 1) * 6 + 4] !== seg) continue;
    const ax = fitted[i * 6] - fitted[(i - 1) * 6];
    const ay = fitted[i * 6 + 1] - fitted[(i - 1) * 6 + 1];
    const bx = fitted[(i + 1) * 6] - fitted[i * 6];
    const by = fitted[(i + 1) * 6 + 1] - fitted[i * 6 + 1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 1e-6 || lb < 1e-6) continue;
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    curv[i] = angle / ((la + lb) * 0.5);
  }
  // Two light smoothing passes within each subpath.
  for (let pass = 0; pass < 2; pass++) {
    const prev = curv.slice();
    for (let i = 1; i + 1 < count; i++) {
      const seg = fitted[i * 6 + 4];
      if (fitted[(i - 1) * 6 + 4] !== seg || fitted[(i + 1) * 6 + 4] !== seg) continue;
      curv[i] = prev[i - 1] * 0.25 + prev[i] * 0.5 + prev[i + 1] * 0.25;
    }
  }
  for (let i = 0; i < count; i++) fitted[i * 6 + 3] = curv[i];
}

function hexToVec4(hex: string): d.v4f {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const int = Number.parseInt(h, 16);
  return d.vec4f(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255, 1);
}

/**
 * Minimal recreation of the Redraw runtime: owns the WebGPU device
 * (via TypeGPU), the flattened path storage buffer, and a render
 * pipeline whose fragment stage embeds the current effect's
 * "use gpu" TypeScript functions.
 */
export class RedrawRenderer {
  speed = 1;
  strokeScale = 1;

  private root: TgpuRoot;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  private canvas: HTMLCanvasElement;
  private pipelineLayout: GPUPipelineLayout;
  private pipeline: GPURenderPipeline | null = null;
  private uniBuffer: TgpuBuffer<typeof Uniforms> & UniformFlag;
  private pointsBuffer: (TgpuBuffer<d.WgslArray<typeof PathPoint>> & StorageFlag) | null = null;
  private bindGroup: TgpuBindGroup | null = null;
  private sample: PathSample | null = null;
  private palette: d.v4f[] = [];
  private time = 0;
  private lastTs: number | null = null;
  private rafId = 0;
  private resizeObserver: ResizeObserver;
  private disposed = false;

  private constructor(canvas: HTMLCanvasElement, root: TgpuRoot, context: GPUCanvasContext) {
    this.canvas = canvas;
    this.root = root;
    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device: root.device, format: this.format, alphaMode: 'opaque' });

    this.pipelineLayout = root.device.createPipelineLayout({
      bindGroupLayouts: [root.unwrap(layout)],
    });
    this.uniBuffer = root.createBuffer(Uniforms).$usage('uniform');

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas);
    this.handleResize();

    this.rafId = requestAnimationFrame(this.frame);
  }

  /**
   * One renderer per canvas. Repeated calls (e.g. React StrictMode
   * double-mounting) return the same instance instead of racing two
   * device initializations against one canvas context.
   */
  static getOrCreate(canvas: HTMLCanvasElement): Promise<RedrawRenderer> {
    let promise = RedrawRenderer.cache.get(canvas);
    if (!promise) {
      promise = RedrawRenderer.create(canvas);
      RedrawRenderer.cache.set(canvas, promise);
      promise.catch(() => RedrawRenderer.cache.delete(canvas));
    }
    return promise;
  }

  private static cache = new WeakMap<HTMLCanvasElement, Promise<RedrawRenderer>>();

  static async create(canvas: HTMLCanvasElement): Promise<RedrawRenderer> {
    if (!navigator.gpu) {
      throw new Error(
        'WebGPU is not available in this browser. Try Chrome/Edge 113+, or Safari 26+ / Firefox 141+.',
      );
    }
    let root: TgpuRoot;
    try {
      root = await tgpu.init();
    } catch (err) {
      throw new Error(
        `WebGPU is present but no GPU device could be acquired. ${err instanceof Error ? err.message : ''}`,
      );
    }
    root.device.addEventListener('uncapturederror', (event) => {
      console.error('[redraw] uncaptured WebGPU error:', event.error.message);
    });
    const context = canvas.getContext('webgpu');
    if (!context) {
      root.destroy();
      throw new Error('Could not create a WebGPU canvas context.');
    }
    return new RedrawRenderer(canvas, root, context);
  }

  /** Swap the active effect; compiles a fresh shader module. */
  setEffect(fns: EffectFns): void {
    const code = buildShaderCode(fns);
    const device = this.root.device;
    const module = device.createShaderModule({ code });
    module.getCompilationInfo().then(
      (info) => {
        for (const msg of info.messages) {
          if (msg.type === 'error') console.error('[redraw shader]', msg.message);
        }
      },
      () => {
        // Diagnostics-only; some implementations reject this promise.
      },
    );
    this.pipeline = device.createRenderPipeline({
      layout: this.pipelineLayout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: { module, entryPoint: 'fs_main', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });
  }

  /** Replace the path geometry (raw SVG-space samples). */
  setSample(sample: PathSample): void {
    this.sample = sample;
    this.uploadFittedPoints();
  }

  setPalette(colors: string[]): void {
    this.palette = colors.slice(0, MAX_PALETTE).map(hexToVec4);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    try {
      this.root.destroy();
    } catch {
      // device may already be lost
    }
  }

  private handleResize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    let h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (DEBUG && w * h > DEBUG_PIXEL_CAP) {
      const shrink = Math.sqrt(DEBUG_PIXEL_CAP / (w * h));
      w = Math.max(1, Math.floor(w * shrink));
      h = Math.max(1, Math.floor(h * shrink));
    }
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.uploadFittedPoints();
    }
  }

  /** Fit the raw sample into the canvas (contain, centered, padded). */
  private uploadFittedPoints(): void {
    const sample = this.sample;
    if (!sample || sample.count === 0) return;

    const { minX, minY, maxX, maxY } = sample.bounds;
    const bw = Math.max(maxX - minX, 1e-3);
    const bh = Math.max(maxY - minY, 1e-3);
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = Math.min((w * 0.76) / bw, (h * 0.76) / bh);
    const offsetX = (w - bw * scale) / 2 - minX * scale;
    const offsetY = (h - bh * scale) / 2 - minY * scale;

    // PathPoint layout: (pos.x, pos.y, t, curvature, seg, pad) — 24-byte stride.
    const count = sample.count;
    const fitted = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      fitted[i * 6] = sample.points[i * 4] * scale + offsetX;
      fitted[i * 6 + 1] = sample.points[i * 4 + 1] * scale + offsetY;
      fitted[i * 6 + 2] = sample.points[i * 4 + 2];
      fitted[i * 6 + 4] = sample.points[i * 4 + 3];
    }
    computeCurvature(fitted, count);

    const device = this.root.device;
    const neededCount = count;
    const currentCount = this.pointsBuffer ? this.root.unwrap(this.pointsBuffer).size / 24 : 0;
    if (!this.pointsBuffer || currentCount !== neededCount) {
      this.pointsBuffer?.destroy();
      this.pointsBuffer = this.root
        .createBuffer(d.arrayOf(PathPoint, neededCount))
        .$usage('storage');
      this.bindGroup = this.root.createBindGroup(layout, {
        uni: this.uniBuffer,
        points: this.pointsBuffer,
      });
    }
    device.queue.writeBuffer(this.root.unwrap(this.pointsBuffer), 0, fitted);
  }

  private frame = (ts: number): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.frame);

    const dt = this.lastTs == null ? 0 : Math.min((ts - this.lastTs) / 1000, 0.1);
    this.lastTs = ts;
    this.time += dt * this.speed;

    if (!this.pipeline || !this.bindGroup || !this.sample) return;

    try {
      this.renderFrame();
      this.consecutiveErrors = 0;
    } catch (err) {
      if (++this.consecutiveErrors >= 10) {
        console.error('[redraw] stopping render loop after repeated errors:', err);
        cancelAnimationFrame(this.rafId);
      }
    }
  };

  private consecutiveErrors = 0;

  private renderFrame(): void {
    if (!this.pipeline || !this.bindGroup || !this.sample) return;

    const palette: d.v4f[] = [];
    for (let i = 0; i < MAX_PALETTE; i++) {
      palette.push(this.palette[i] ?? d.vec4f(1, 1, 1, 1));
    }
    this.uniBuffer.write({
      resolution: d.vec2f(this.canvas.width, this.canvas.height),
      time: this.time,
      progress: (this.time % LOOP_SECONDS) / LOOP_SECONDS,
      strokeScale: this.strokeScale * Math.min(window.devicePixelRatio || 1, MAX_DPR),
      pointCount: this.sample.count,
      paletteCount: Math.min(this.palette.length, MAX_PALETTE),
      _pad: 0,
      palette,
    });

    const device = this.root.device;
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0.02, g: 0.02, b: 0.03, a: 1 },
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.root.unwrap(this.bindGroup));
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);

    if (DEBUG) {
      this.framesSubmitted++;
      const dbg = (window as unknown as { __redrawDebug?: Record<string, unknown> });
      dbg.__redrawDebug = {
        framesSubmitted: this.framesSubmitted,
        framesCompleted: this.framesCompleted,
        canvasSize: `${this.canvas.width}x${this.canvas.height}`,
        pointCount: this.sample?.count ?? 0,
        pipeline: !!this.pipeline,
      };
      if (this.framesSubmitted <= 3) {
        console.log('[redraw debug] submitted frame', this.framesSubmitted, dbg.__redrawDebug);
      }
      device.queue.onSubmittedWorkDone().then(
        () => {
          this.framesCompleted++;
          if (this.framesCompleted <= 3) {
            console.log('[redraw debug] completed frame', this.framesCompleted);
          }
        },
        (err: unknown) => {
          if (this.framesSubmitted <= 3) {
            console.error('[redraw debug] frame rejected:', err);
          }
        },
      );
    }
  }

  private framesSubmitted = 0;
  private framesCompleted = 0;
}
