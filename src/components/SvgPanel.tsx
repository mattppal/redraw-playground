import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { SAMPLES } from '@/redraw/samples';

interface SvgPanelProps {
  svgText: string;
  onSvgTextChange: (text: string) => void;
  error: string | null;
}

export function SvgPanel({ svgText, onSvgTextChange, error }: SvgPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onSvgTextChange(reader.result);
    };
    reader.readAsText(file);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Path</CardTitle>
        <CardDescription>
          Paste an SVG (or bare <code className="font-mono">d</code> path data)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Textarea
          spellCheck={false}
          value={svgText}
          onChange={(e) => onSvgTextChange(e.target.value)}
          placeholder='<svg>…</svg> or "M 60 300 C 130 90 …"'
          className="min-h-40 flex-1 resize-none font-mono text-xs leading-relaxed"
        />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Paths, circles, rects, polygons and transforms are supported.
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload /> Upload .svg
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Samples</p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((sample) => (
              <Button
                key={sample.id}
                variant="secondary"
                size="sm"
                onClick={() => onSvgTextChange(sample.svg)}
              >
                {sample.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
