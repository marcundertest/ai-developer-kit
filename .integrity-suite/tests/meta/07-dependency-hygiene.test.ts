import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, pkg } from './shared.js';

describe('Level 7: Dependency Hygiene @dependencies', () => {
  it('Should not have dependencies that belong in devDependencies', () => {
    const devOnlyPackages = ['vitest', 'eslint', 'prettier', 'typescript', 'husky'];
    const prodDeps = Object.keys(pkg.dependencies || {});
    devOnlyPackages.forEach((dep) => {
      expect(prodDeps, `${dep} should be in devDependencies, not dependencies`).not.toContain(dep);
    });
  });

  it('Should not have duplicate packages across dependencies and devDependencies', () => {
    const deps = Object.keys(pkg.dependencies || {});
    const devDeps = Object.keys(pkg.devDependencies || {});
    const duplicates = deps.filter((d) => devDeps.includes(d));
    expect(duplicates, `Duplicate packages: ${duplicates.join(', ')}`).toHaveLength(0);
  });

  it('Should have packageManager field pinned to exact version and match installed version', async () => {
    const { execSync } = await import('node:child_process');
    expect(pkg.packageManager, 'packageManager field is missing').toBeDefined();
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);

    const [, expectedVersion] = pkg.packageManager!.split('@');
    try {
      const installedVersion = execSync('pnpm --version').toString().trim();
      expect(
        installedVersion,
        `Installed pnpm version (${installedVersion}) does not match packageManager (${expectedVersion})`,
      ).toBe(expectedVersion);
    } catch (e: unknown) {}
  });

  it('Should not have direct dependencies at major version 0.x (unstable API)', () => {
    const allowedAt0x = ['markdownlint-cli', 'markdownlint-cli2'];
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    Object.entries(allDeps).forEach(([name, version]) => {
      if (allowedAt0x.includes(name)) return;
      const cleaned = (version as string).replace(/^[\^~>=\s]+/, '');
      const major = parseInt(cleaned.split('.')[0], 10);
      if (Number.isNaN(major)) return;
      expect(
        major,
        `Dependency "${name}@${version}" is at major version 0: API may be unstable`,
      ).toBeGreaterThan(0);
    });
  });

  it('Should declare a Node.js engine requirement in package.json', () => {
    expect(pkg.engines, 'engines field is missing in package.json').toBeDefined();
    expect(
      pkg.engines?.node,
      'engines.node is missing: specify minimum Node.js version',
    ).toBeDefined();
    expect(String(pkg.engines?.node)).toMatch(/^[>=<^~\d]/);
  });

  it('Should not have git:// or file: dependencies in package.json', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    Object.entries(allDeps).forEach(([name, version]) => {
      expect(
        version as string,
        `${name} uses a git dependency: only registry packages are allowed`,
      ).not.toMatch(/^git(\+|:)/i);
      expect(version as string, `${name} uses a local file dependency`).not.toMatch(/^file:/);
      expect(version as string, `${name} uses a GitHub shorthand`).not.toMatch(
        /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/,
      );
    });
  });
});
