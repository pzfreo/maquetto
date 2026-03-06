import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

function getVersionInfo(): { buildNumber: string; commitHash: string } {
  try {
    // Vercel does shallow clones which break git rev-list --count.
    // Fetch full history so we get the real commit count.
    try {
      const isShallow = execSync('git rev-parse --is-shallow-repository', { encoding: 'utf-8' }).trim();
      if (isShallow === 'true') {
        execSync('git fetch --unshallow origin main', { encoding: 'utf-8', timeout: 30000 });
      }
    } catch {
      // If --unshallow fails, try fetching full depth explicitly
      try {
        execSync('git fetch --depth=999999 origin main', { encoding: 'utf-8', timeout: 30000 });
      } catch { /* give up — count will be whatever we have */ }
    }

    const buildNumber = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return { buildNumber, commitHash };
  } catch {
    return { buildNumber: '0', commitHash: 'unknown' };
  }
}

const { buildNumber, commitHash } = getVersionInfo();

export default defineConfig({
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [react()],
  build: {
    modulePreload: false,
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: [/^https:\/\//],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
