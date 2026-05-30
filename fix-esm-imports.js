import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.js')) {
      let code = readFileSync(full, 'utf8');
      code = code.replace(/from\s+['"](\.[^'"]+)['"]/g, (m, p1) => {
        if (p1.endsWith('.js') || p1.endsWith('.json') || p1.endsWith('.node')) return m;
        const base = join(dirname(full), p1);
        if (existsSync(base + '.js')) return `from '${p1}.js'`;
        if (existsSync(join(base, 'index.js'))) return `from '${p1}/index.js'`;
        return m;
      });
      writeFileSync(full, code);
    }
  }
}
walk('dist');
console.log('Fixed ESM imports');
