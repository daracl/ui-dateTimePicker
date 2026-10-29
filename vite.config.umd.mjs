import { defineConfig } from 'vite';
import path from 'node:path';
import { commonConfig, buildOptions, root, topBanner, MODULE_NAME, createAssetFileNames } from './vite.common.mjs';

export default defineConfig(({ mode }) => {
  const minified = mode === 'production';
  return {
    ...commonConfig,
    build: {
      ...buildOptions(minified),
      emptyOutDir: false,
      lib: {
        entry: path.resolve(root, 'src/index.umd.ts'),
        name: 'Daracl',
        formats: ['umd'],
        fileName: () => `${MODULE_NAME}${minified ? '.min' : ''}.umd.js`,
      },
      rollupOptions: {
        output: { banner: topBanner, assetFileNames: createAssetFileNames(minified) },
      },
    },
  };
});
