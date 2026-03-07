import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@typescript-eslint/typescript-estree';

// Node: module URL is evaluated relative to tests/meta. Need rootDir
export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const getFiles = (dir: string, allFiles: string[] = []) => {
  if (!fs.existsSync(dir)) return allFiles;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.integrity-suite', 'coverage'].includes(entry.name)) {
        getFiles(name, allFiles);
      }
    } else {
      const ext = path.extname(entry.name);
      if (
        ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json'].includes(ext) ||
        entry.name.startsWith('.env')
      ) {
        allFiles.push(name);
      }
    }
  });
  return allFiles;
};

export const allSourceFiles = getFiles(rootDir);
export const testsDir = path.join(rootDir, 'tests') + path.sep;
export const codeFiles = allSourceFiles.filter((f) => {
  const ext = path.extname(f);
  return ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
});
interface PackageJson {
  name: string;
  version: string;
  scripts: Record<string, string | undefined>;
  devDependencies: Record<string, string | undefined>;
  dependencies?: Record<string, string | undefined>;
  engines?: { node?: string };
  packageManager?: string;
  'lint-staged'?: Record<string, string[] | undefined>;
  author?: string;
}

export const pkg = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
) as PackageJson;

export const hasTailwind = !!(pkg.dependencies?.tailwindcss || pkg.devDependencies?.tailwindcss);

export { parse };

export function getNodesByType(node: any, type: string, results: any[] = []): any[] {
  if (!node || typeof node !== 'object') return results;
  if (node.type === type) results.push(node);
  Object.keys(node).forEach((key) => {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => getNodesByType(c, type, results));
    } else if (child && typeof child === 'object') {
      getNodesByType(child, type, results);
    }
  });
  return results;
}
