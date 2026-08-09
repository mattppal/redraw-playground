/** Records the canvas for a few seconds and triggers a .webm download. */
export async function recordClip(
  canvas: HTMLCanvasElement,
  seconds = 4,
): Promise<void> {
  const stream = canvas.captureStream(60);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  if (!mimeType) throw new Error('This browser cannot record WebM video.');

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('Recording failed.'));
  });

  recorder.start();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  recorder.stop();
  await done;

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'redraw-clip.webm';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
