import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasPanel, type RendererStatus } from '@/components/CanvasPanel';
import { ControlsPanel } from '@/components/ControlsPanel';
import { SvgPanel } from '@/components/SvgPanel';
import { Badge } from '@/components/ui/badge';
import { recordClip } from '@/lib/record';
import { DEFAULT_PALETTE, PALETTES } from '@/redraw/palettes';
import { DEFAULT_PRESET, PRESETS } from '@/redraw/presets';
import { RedrawRenderer } from '@/redraw/renderer';
import { DEFAULT_SAMPLE } from '@/redraw/samples';
import { sampleSvg } from '@/redraw/svg';

function readInitialParams() {
  const params = new URLSearchParams(window.location.search);
  const preset = PRESETS.find((p) => p.id === params.get('preset'))?.id ?? DEFAULT_PRESET.id;
  const palette = PALETTES.find((p) => p.id === params.get('palette'))?.id ?? DEFAULT_PALETTE.id;
  const speed = Number.parseFloat(params.get('speed') ?? '');
  const scale = Number.parseFloat(params.get('scale') ?? '');
  return {
    preset,
    palette,
    speed: Number.isFinite(speed) ? Math.min(Math.max(speed, 0), 3) : 1,
    scale: Number.isFinite(scale) ? Math.min(Math.max(scale, 0.2), 3) : 1,
  };
}

const initial = readInitialParams();

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RedrawRenderer | null>(null);

  const [status, setStatus] = useState<RendererStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [svgText, setSvgText] = useState(DEFAULT_SAMPLE.svg);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState(initial.preset);
  const [paletteId, setPaletteId] = useState(initial.palette);
  const [speed, setSpeed] = useState(initial.speed);
  const [strokeScale, setStrokeScale] = useState(initial.scale);
  const [recording, setRecording] = useState(false);

  // Create the renderer once the canvas exists.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderer: RedrawRenderer | null = null;

    RedrawRenderer.create(canvas)
      .then((r) => {
        if (cancelled) {
          r.dispose();
          return;
        }
        renderer = r;
        rendererRef.current = r;
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Effect preset → rebuild pipeline.
  useEffect(() => {
    if (status !== 'ready') return;
    const preset = PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PRESET;
    rendererRef.current?.setEffect(preset.fns);
  }, [status, presetId]);

  // Palette → uniform update.
  useEffect(() => {
    if (status !== 'ready') return;
    const palette = PALETTES.find((p) => p.id === paletteId) ?? DEFAULT_PALETTE;
    rendererRef.current?.setPalette(palette.colors);
  }, [status, paletteId]);

  // Sliders.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (status !== 'ready' || !renderer) return;
    renderer.speed = speed;
    renderer.strokeScale = strokeScale;
  }, [status, speed, strokeScale]);

  // SVG text → flatten to a polyline (debounced).
  useEffect(() => {
    if (status !== 'ready') return;
    const handle = setTimeout(() => {
      try {
        const sample = sampleSvg(svgText);
        rendererRef.current?.setSample(sample);
        setSvgError(null);
      } catch (err) {
        setSvgError(err instanceof Error ? err.message : String(err));
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [status, svgText]);

  const embedSnippet = useMemo(() => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('preset', presetId);
    url.searchParams.set('palette', paletteId);
    url.searchParams.set('speed', String(speed));
    url.searchParams.set('scale', String(strokeScale));
    return `<iframe src="${url.href}" width="800" height="450" style="border:0;border-radius:12px" loading="lazy" title="Redraw playground effect"></iframe>`;
  }, [presetId, paletteId, speed, strokeScale]);

  const handleRecord = async () => {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    setRecording(true);
    try {
      await recordClip(canvas, 4);
    } catch (err) {
      console.error(err);
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-3 border-b px-5">
        <span className="size-2.5 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500" />
        <h1 className="text-sm font-semibold tracking-tight">Redraw Playground</h1>
        <Badge>unofficial recreation</Badge>
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <a
            className="inline-flex items-center gap-1 hover:text-foreground"
            href="https://wcandillon.dev/article/hello-project-redraw"
            target="_blank"
            rel="noreferrer"
          >
            Article <ExternalLink className="size-3" />
          </a>
          <a
            className="inline-flex items-center gap-1 hover:text-foreground"
            href="https://wcandillon.github.io/redraw/"
            target="_blank"
            rel="noreferrer"
          >
            Redraw docs <ExternalLink className="size-3" />
          </a>
        </div>
      </header>

      <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <SvgPanel svgText={svgText} onSvgTextChange={setSvgText} error={svgError} />
        <CanvasPanel
          canvasRef={canvasRef}
          status={status}
          errorMessage={errorMessage}
          recording={recording}
          onRecord={handleRecord}
        />
        <ControlsPanel
          presetId={presetId}
          onPresetChange={setPresetId}
          paletteId={paletteId}
          onPaletteChange={setPaletteId}
          speed={speed}
          onSpeedChange={setSpeed}
          strokeScale={strokeScale}
          onStrokeScaleChange={setStrokeScale}
          embedSnippet={embedSnippet}
        />
      </main>

      <footer className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">
        An unofficial demo of the ideas behind{' '}
        <a
          className="underline hover:text-foreground"
          href="https://wcandillon.dev/article/hello-project-redraw"
          target="_blank"
          rel="noreferrer"
        >
          Project Redraw
        </a>{' '}
        by William Candillon — effects are TypeScript functions compiled to WGSL
        with{' '}
        <a
          className="underline hover:text-foreground"
          href="https://docs.swmansion.com/TypeGPU/"
          target="_blank"
          rel="noreferrer"
        >
          TypeGPU
        </a>
        , rendered with WebGPU.
      </footer>
    </div>
  );
}
