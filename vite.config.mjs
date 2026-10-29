import { defineConfig } from 'vite';
import path from 'node:path';
import { commonConfig, buildOptions, root, topBanner, createAssetFileNames } from './vite.common.mjs';

export default defineConfig(async ({ mode }) => {
  const minified = mode === 'production';
  const plugins = [];
  if (process.env.ANALYZE === 'true') {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(visualizer({
      filename: `bundle-report-${mode}.html`, open: false, gzipSize: true, brotliSize: true,
    }));
  }
  return {
    ...commonConfig,
    build: {
      ...buildOptions(minified),
      emptyOutDir: true,
      lib: {
        entry: path.resolve(root, 'src/index.ts'),
        formats: ['es', 'cjs'],
        fileName: format => `index${minified ? '.min' : ''}.${format === 'es' ? 'js' : 'cjs'}`,
      },
      rollupOptions: {
        plugins,
        external: id => id === '@daracl/core' || id.startsWith('@daracl/core/'),
        output: { banner: topBanner, assetFileNames: createAssetFileNames(minified) },
      },
    },
  };
});
