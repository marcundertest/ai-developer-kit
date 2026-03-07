import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parse } from '@typescript-eslint/typescript-estree';
import { load } from 'js-yaml';

// Node: module URL is evaluated relative to tests/meta. Need rootDir
export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const isMonorepo = fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'));

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
  } catch (e) {
    return [];
  }
}

export const targetDirs = isMonorepo ? getWorkspacePackages() : [rootDir];

export function getMainBranch(): string {
  try {
    const ref = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return ref.replace('refs/remotes/origin/', '');
  } catch {
    try {
      execSync('git show origin/main:package.json', { stdio: 'pipe' });
      return 'main';
    } catch {
      return 'master';
    }
  }
}

export const getFiles = (dir: string, allFiles: string[] = [], depth = 0): string[] => {
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
        ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json'].includes(ext) ||
        entry.name.startsWith('.env')
      ) {
        allFiles.push(name);
      }
    }
  });
  return allFiles;
};

export const allSourceFiles = Array.from(new Set(targetDirs.flatMap((dir) => getFiles(dir))));
export const srcDirs = targetDirs.map((d) => path.join(d, 'src') + path.sep);
export const testsDirs = targetDirs.map((d) => path.join(d, 'tests') + path.sep);
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

export const hasTailwind = !!(
  pkg.dependencies?.['tailwindcss'] || pkg.devDependencies?.['tailwindcss']
);

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

import { gt } from 'semver';

export const semverGt = (a: string, b: string): boolean => gt(a, b);
