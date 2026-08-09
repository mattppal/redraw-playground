import { CopyButton } from '@/components/CopyButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PALETTES } from '@/redraw/palettes';
import { PRESETS } from '@/redraw/presets';

interface ControlsPanelProps {
  presetId: string;
  onPresetChange: (id: string) => void;
  paletteId: string;
  onPaletteChange: (id: string) => void;
  speed: number;
  onSpeedChange: (v: number) => void;
  strokeScale: number;
  onStrokeScaleChange: (v: number) => void;
  embedSnippet: string;
}

export function ControlsPanel({
  presetId,
  onPresetChange,
  paletteId,
  onPaletteChange,
  speed,
  onSpeedChange,
  strokeScale,
  onStrokeScaleChange,
  embedSnippet,
}: ControlsPanelProps) {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Effect</CardTitle>
          <CardDescription>
            Stroke width, color and feather are TypeScript functions on the GPU
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer',
                p.id === presetId
                  ? 'border-primary/60 bg-primary/10'
                  : 'hover:bg-accent',
              )}
            >
              <p className="text-sm font-medium">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Speed</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {speed.toFixed(2)}×
              </span>
            </div>
            <Slider
              min={0}
              max={3}
              step={0.05}
              value={[speed]}
              onValueChange={([v]) => onSpeedChange(v)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Stroke scale</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {strokeScale.toFixed(2)}×
              </span>
            </div>
            <Slider
              min={0.2}
              max={3}
              step={0.05}
              value={[strokeScale]}
              onValueChange={([v]) => onStrokeScaleChange(v)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Palette</Label>
            <div className="flex flex-col gap-1.5">
              {PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => onPaletteChange(palette.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors cursor-pointer',
                    palette.id === paletteId
                      ? 'border-primary/60 bg-primary/10'
                      : 'hover:bg-accent',
                  )}
                >
                  <span className="flex h-3.5 flex-1 overflow-hidden rounded-full">
                    {palette.colors.map((c) => (
                      <span key={c} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="w-16 text-left text-xs">{palette.name}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="effect">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="effect">Effect source</TabsTrigger>
                <TabsTrigger value="embed">Embed</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="effect" className="flex flex-col gap-2">
              <pre className="max-h-72 overflow-auto rounded-lg border bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre">
                {preset.source}
              </pre>
              <div>
                <CopyButton text={preset.source} label="Copy TypeScript" />
              </div>
            </TabsContent>
            <TabsContent value="embed" className="flex flex-col gap-2">
              <pre className="overflow-auto rounded-lg border bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                {embedSnippet}
              </pre>
              <div className="flex items-center gap-2">
                <CopyButton text={embedSnippet} label="Copy embed" />
              </div>
              <p className="text-xs text-muted-foreground">
                The iframe reproduces the current preset, palette and parameters
                wherever this app is hosted.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
