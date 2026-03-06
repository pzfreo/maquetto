import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

function getVersionInfo(): { buildNumber: string; commitHash: string } {
  // Vercel provides the full SHA — use it since Vercel does shallow clones
  // which break git rev-list --count
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) {
    return {
      buildNumber: vercelSha.substring(0, 7),
      commitHash: vercelSha.substring(0, 7),
    };
  }

  // Local dev: use git directly
  try {
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
