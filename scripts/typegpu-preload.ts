import { plugin } from 'bun';
import typegpuPlugin from 'unplugin-typegpu/bun';

// Lets `bun run scripts/smoke.ts` compile "use gpu" functions the same
// way unplugin-typegpu/vite does for the app build.
plugin(typegpuPlugin({}));
