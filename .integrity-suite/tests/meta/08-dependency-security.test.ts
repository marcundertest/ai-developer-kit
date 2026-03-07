import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, pkg } from './shared.js';

describe('Level 8: Dependency Security @security-audit', () => {
  it('Should have audit check integrated as a test case', () => {
    const testFilePath = path.join(
      rootDir,
      '.integrity-suite',
      'tests',
      'meta',
      '01-project-metadata-readme.test.ts',
    );
    const testContent = fs.readFileSync(testFilePath, 'utf-8');
    const hasAuditTest = testContent.includes(
      'Should pass security audit with resilience to network errors',
    );
    expect(hasAuditTest, 'Audit validation must be a test case in integrity-suite.test.ts').toBe(
      true,
    );
    const fullScript = pkg.scripts['test:full'];
    expect(fullScript).not.toContain('check-audit.js');
  });

  it('Should run all validations (audit, version, changelog) as test cases', () => {
    const metaDir = path.join(rootDir, '.integrity-suite', 'tests', 'meta');
    const testContent = fs
      .readdirSync(metaDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => fs.readFileSync(path.join(metaDir, f), 'utf-8'))
      .join('\\n');
    expect(testContent).toContain('Should pass security audit with resilience to network errors');
    expect(testContent).toMatch(
      /Should require version bump when non-markdown files are modified/i,
    );
    expect(testContent).toMatch(/Should have CHANGELOG entry for staged version/i);
    const scriptFull = pkg.scripts['test:full'];
    expect(scriptFull).toBeDefined();
    expect(scriptFull).not.toContain('check-audit.js');
    expect(scriptFull).not.toContain('pnpm check-version');
    expect(scriptFull).not.toContain('pnpm check-changelog');
  });

  it('Should have a lockfile that is not outdated relative to package.json', () => {
    const lockPath = path.join(rootDir, 'pnpm-lock.yaml');
    const lock = fs.readFileSync(lockPath, 'utf8');
    const allDeclaredDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    Object.keys(allDeclaredDeps).forEach((dep) => {
      expect(lock, `${dep} is in package.json but missing from lockfile`).toContain(dep);
    });
  });

  it('Should not use historically vulnerable versions of critical packages', () => {
    const lock = fs.readFileSync(path.join(rootDir, 'pnpm-lock.yaml'), 'utf8');

    const knownVulnerable: Array<{ pkg: string; bannedRange: RegExp; reason: string }> = [
      {
        pkg: 'lodash',
        bannedRange: /lodash@[34]\.\d+\.\d+(?!\d)/,
        reason: 'lodash <4.17.21 has prototype pollution (CVE-2021-23337)',
      },
      {
        pkg: 'minimist',
        bannedRange: /minimist@0\.\d+\.\d+/,
        reason: 'minimist <1.2.6 has prototype pollution (CVE-2021-44906)',
      },
      {
        pkg: 'semver',
        bannedRange: /semver@[1-6]\.\d+\.\d+/,
        reason: 'semver <7.5.2 has ReDoS vulnerability (CVE-2022-25883)',
      },
    ];

    knownVulnerable.forEach(({ pkg: name, bannedRange, reason }) => {
      expect(lock, `Vulnerable version of ${name} detected: ${reason}`).not.toMatch(bannedRange);
    });
  });

  it('Should not have direct dependencies pinned below known-safe minimums', () => {
    const safeMinimumsForDirectDeps: Record<string, string> = {};
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    Object.entries(safeMinimumsForDirectDeps).forEach(([name, minVersion]) => {
      if (!allDeps[name]) return;
      const declared = (allDeps[name] as string).replace(/^[\^~]/, '');
      const [dMaj, dMin, dPatch] = declared.split('.').map(Number);
      const [mMaj, mMin, mPatch] = minVersion.split('.').map(Number);
      const isOk =
        dMaj > mMaj ||
        (dMaj === mMaj && dMin > mMin) ||
        (dMaj === mMaj && dMin === mMin && dPatch >= mPatch);
      expect(isOk, `${name}@${declared} is below safe minimum ${minVersion}`).toBe(true);
    });
  });
});
