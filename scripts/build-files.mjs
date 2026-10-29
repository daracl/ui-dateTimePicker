import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

export function buildFiles(task) {
  mkdirSync(dist, { recursive: true });
  switch (task) {
    case 'clean-dist': rmSync(dist, { recursive: true, force: true }); break;
    case 'clean-unmin': rmSync(path.join(dist, 'unmin'), { recursive: true, force: true }); break;
    case 'html':
      for (const name of ['index.html', 'demo.css', 'demo.js']) {
        cpSync(path.join(root, 'public', name), path.join(dist, name));
      }
      cpSync(path.join(root, 'node_modules/@daracl/ui-style/dist/theme-vars.css'), path.join(dist, 'theme-vars.css'));
      break;
    case 'unmin':
      if (existsSync(path.join(dist, 'unmin'))) {
        for (const name of readdirSync(path.join(dist, 'unmin'))) {
          cpSync(path.join(dist, 'unmin', name), path.join(dist, name), { recursive: true });
          if (name.endsWith('.map')) {
            const target = path.join(dist, name);
            const map = JSON.parse(readFileSync(target, 'utf8'));
            map.sources = map.sources.map(source => /^(?:[a-z]+:|\/)/i.test(source)
              ? source : path.posix.normalize(path.posix.join('unmin', source)));
            writeFileSync(target, JSON.stringify(map));
          }
        }
      }
      break;
    case 'dts': {
      const copyTypes = (directory) => {
        for (const entry of readdirSync(path.join(root, 'src', directory), { withFileTypes: true })) {
          const relative = path.join(directory, entry.name);
          if (entry.isDirectory()) copyTypes(relative);
          else if (entry.name.endsWith('.d.ts')) {
            mkdirSync(path.dirname(path.join(dist, relative)), { recursive: true });
            cpSync(path.join(root, 'src', relative), path.join(dist, relative));
          }
        }
      };
      copyTypes('');
      break;
    }
    default: throw new Error(`Unknown build file task: ${task}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildFiles(process.argv[2]);
