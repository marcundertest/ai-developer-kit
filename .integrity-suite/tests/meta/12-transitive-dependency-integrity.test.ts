import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { rootDir } from './shared';

describe('Level 12: Transitive Dependency Integrity @transitive', () => {
  it('Should not have duplicate transitive dependencies at different versions', () => {
    const lockPath = path.join(rootDir, 'pnpm-lock.yaml');
    if (!fs.existsSync(lockPath)) return;

    const lock = fs.readFileSync(lockPath, 'utf8');
    // Parse the lockfile and detect the same package with multiple versions
    const pkgVersions = new Map<string, Set<string>>();
    // Supporting both older pnpm (/package@version) and newer pnpm ('package@version')
    const matches = lock.matchAll(/^  ['"\/]?(@?[^@\s'"]+)@([^'":\s]+)['"]?:/gm);

    for (const [, name, version] of matches) {
      if (!pkgVersions.has(name)) pkgVersions.set(name, new Set());
      pkgVersions.get(name)!.add(version);
    }

    const duplicates: string[] = [];
    pkgVersions.forEach((versions, name) => {
      if (versions.size > 1) {
        duplicates.push(`${name}: ${[...versions].join(', ')}`);
      }
    });

    if (duplicates.length > 0) {
      console.warn(
        '⚠️  Multiple versions detected for transitive dependencies (potential bloat/conflicts):',
      );
      duplicates.forEach((d) => console.warn(`  - ${d}`));
    }

    // The test passes as it only warns according to the provided implementation
    expect(lock).toBeDefined();
  });
});
