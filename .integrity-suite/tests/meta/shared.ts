import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parse } from '@typescript-eslint/typescript-estree';
import { load } from 'js-yaml';
import { it as vitestIt } from 'vitest';

// Node: module URL is evaluated relative to tests/meta. Need rootDir
export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// configuration support
export interface SuiteConfig {
  rules?: Record<string, any>;
}

const configPaths = [
  path.join(rootDir, '.integrity-suite.config.ts'),
  path.join(rootDir, '.integrity-suite.config.js'),
];

export const suiteConfig: SuiteConfig = await (async () => {
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const mod = await import(p);
        return mod.default || {};
      } catch {
        // ignore malformed config
      }
    }
  }
  return {};
})();

export function ruleEnabled(rule: string): boolean {
  const setting = suiteConfig.rules?.[rule];
  if (setting === 'off') return false;
  return true;
}

// custom it that respects configuration
// wrapper supports both Vitest 3 (name, fn, opts) and Vitest 4 (name, opts, fn)
export function it(title: string, arg2: any, arg3?: any) {
  let opts: any;
  let fn: any;

  if (arg3 !== undefined) {
    // called as it(name, opts, fn)
    opts = arg2 || {};
    fn = arg3;
  } else {
    // called as it(name, fn) or it(name, fn, opts)
    fn = arg2;
    opts = {};
  }

  if (!ruleEnabled(title)) {
    return vitestIt.skip(title + ' (disabled via config)', opts, fn);
  }
  return vitestIt(title, opts, fn);
}

export const isMonorepo = fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'));

type IntegrityCache = {
  targetDirs: string[];
  allSourceFiles: string[];
};

const cache = (globalThis as Record<string, unknown>)['__integritySuiteCache'] as
  | IntegrityCache
  | undefined;

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

export const targetDirs: string[] =
  cache?.targetDirs ?? (isMonorepo ? getWorkspacePackages() : [rootDir]);

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
};

export const allSourceFiles: string[] =
  cache?.allSourceFiles ?? Array.from(new Set(targetDirs.flatMap((dir) => getFiles(dir))));
export const srcDirs = targetDirs.map((d) => path.join(d, 'src') + path.sep);
export const testsDirs = targetDirs.map((d) => path.join(d, 'tests') + path.sep);
export const codeFiles = allSourceFiles.filter((f) => {
  const ext = path.extname(f);
  return ['.ts', '.js', '.tsx', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].includes(ext);
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
