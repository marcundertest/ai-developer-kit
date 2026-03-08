import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

// compute same helpers as shared.ts so cache can be populated once
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const isMonorepo = fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'));

function getWorkspacePackages(): string[] {
  const workspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspacePath)) return [];

  try {
    const content = fs.readFileSync(workspacePath, 'utf8');
    const yaml = load(content) as { packages?: string[] };
    const patterns = yaml.packages || [];
    const dirs: string[] = [];
    patterns.forEach((pattern) => {
      if (pattern.endsWith('/*')) {
        const parent = path.join(rootDir, pattern.slice(0, -2));
        if (fs.existsSync(parent) && fs.statSync(parent).isDirectory()) {
          fs.readdirSync(parent).forEach((child) => {
            const fullPath = path.join(parent, child);
            if (
              fs.statSync(fullPath).isDirectory() &&
              fs.existsSync(path.join(fullPath, 'package.json'))
            ) {
              dirs.push(fullPath);
            }
          });
        }
      } else {
        const fullPath = path.join(rootDir, pattern);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          dirs.push(fullPath);
        }
      }
    });
    return dirs;
  } catch {
    return [];
  }
}

export const targetDirs = isMonorepo ? getWorkspacePackages() : [rootDir];

export function getFiles(dir: string, allFiles: string[] = [], depth = 0): string[] {
  if (depth > 20) return allFiles;
  if (!fs.existsSync(dir)) return allFiles;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.integrity-suite', 'coverage'].includes(entry.name)) {
        getFiles(name, allFiles, depth + 1);
      }
    } else {
      const ext = path.extname(entry.name);
      if (
        [
          '.ts',
          '.js',
          '.tsx',
          '.jsx',
          '.html',
          '.css',
          '.json',
          '.mts',
          '.cts',
          '.mjs',
          '.cjs',
        ].includes(ext) ||
        entry.name.startsWith('.env')
      ) {
        allFiles.push(name);
      }
    }
  });
  return allFiles;
}

const allSourceFiles = Array.from(new Set(targetDirs.flatMap((dir) => getFiles(dir))));

// store on global for tests to reuse
(globalThis as any).__integritySuiteCache = {
  targetDirs,
  allSourceFiles,
};

export default async function setup() {
  // no-op; cache is populated during module evaluation above
}
