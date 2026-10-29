import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export const MODULE_NAME = 'daracl.datetimepicker';
export const topBanner = `/*! ${pkg.name} v${pkg.version} | Copyright 2023-${new Date().getUTCFullYear()} darainfo | ${pkg.license} */`;
export const createAssetFileNames = (minified) => (asset) =>
  asset.names.some(name => name.endsWith('.css'))
    ? `${MODULE_NAME}${minified ? '.min' : ''}.[ext]`
    : 'assets/[name].[ext]';

export const commonConfig = {
  esbuild: { legalComments: 'inline' },
  resolve: {
    alias: { '@': path.resolve(root, 'src'), '@t': path.resolve(root, 'src/types') },
  },
  css: { preprocessorOptions: { scss: { api: 'modern' } } },
  define: { APP_VERSION: JSON.stringify(pkg.version) },
  preview: { host: '127.0.0.1' },
  server: {
    host: '127.0.0.1',
    fs: { strict: true, allow: [root] },
    port: 4174,
    open: '/uitest/index.html',
  },
};

export const buildOptions = (minified) => ({
  // Preserve Vite 5's browser compatibility when upgrading Vite.
  target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  outDir: minified ? 'dist' : 'dist/unmin',
  sourcemap: true,
  reportCompressedSize: false,
  copyPublicDir: false,
  minify: minified ? 'esbuild' : false,
});
