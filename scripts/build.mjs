import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { build } from 'vite';
import esConfig from '../vite.config.mjs';
import umdConfig from '../vite.config.umd.mjs';
import { buildFiles, root } from './build-files.mjs';

const require = createRequire(import.meta.url);
const started = performance.now();

function declarations() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('typescript/bin/tsc'), '--emitDeclarationOnly'], {
      cwd: root, stdio: 'inherit', shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`TypeScript failed: ${code ?? signal}`)));
  });
}

async function bundles(mode) {
  // Each mode has its own output directory. Serialize formats sharing CSS files.
  for (const factory of [esConfig, umdConfig]) {
    const config = await factory({ command: 'build', mode });
    await build({ ...config, root, configFile: false, mode,
      build: { ...config.build, emptyOutDir: false },
    });
  }
}

try {
  buildFiles('clean-dist');
  buildFiles('dts');
  const results = await Promise.allSettled([declarations(), bundles('production'), bundles('development')]);
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, errors.map(error => error.message).join('\n'));
  buildFiles('unmin');
  buildFiles('clean-unmin');
  buildFiles('html');
  console.log(`Build completed in ${((performance.now() - started) / 1000).toFixed(2)}s`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
