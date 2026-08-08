import { Loader2, Video } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';

export type RendererStatus = 'loading' | 'ready' | 'error';

interface CanvasPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: RendererStatus;
  errorMessage: string | null;
  recording: boolean;
  onRecord: () => void;
}

export function CanvasPanel({
  canvasRef,
  status,
  errorMessage,
  recording,
  onRecord,
}: CanvasPanelProps) {
  return (
    <div className="relative min-h-[380px] overflow-hidden rounded-xl border bg-[#050507] lg:min-h-0">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Acquiring WebGPU device…
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-6">
          <div className="max-w-md rounded-xl border bg-card p-5 text-center">
            <p className="text-sm font-semibold">WebGPU unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Redraw-style effects run entirely on the GPU, so this playground
              requires a browser with WebGPU — recent Chrome or Edge on
              desktop, Safari 26+, or Firefox 141+ on Windows. See{' '}
              <a
                className="underline hover:text-foreground"
                href="https://caniuse.com/webgpu"
                target="_blank"
                rel="noreferrer"
              >
                caniuse.com/webgpu
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute right-3 bottom-3">
          <Button variant="secondary" size="sm" onClick={onRecord} disabled={recording}>
            {recording ? (
              <>
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                Recording…
              </>
            ) : (
              <>
                <Video /> Record 4s clip
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
