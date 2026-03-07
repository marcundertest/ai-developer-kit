// Core protection tests - validates .integrity-suite files cannot be modified
// without explicit authorization, especially in strict mode (pre-push).

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

describe('Core Protection Suite', () => {
  // adjust path: tests -> .integrity-suite -> project root
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

  it('should protect core kit files from unauthorized modification @core-protection', async () => {
    // This test only runs in test:full (via vitest run .integrity-suite/tests)
    // In test:develop, core-protection.test.ts is not executed at all

    let changedFiles = '';
    try {
      changedFiles = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
    } catch (e: unknown) {
      return;
    }

    const paths = changedFiles
      .split('\n')
      .filter(Boolean)
      .map((line) => line.trim().slice(2).trim());

    const protectedPaths = ['.integrity-suite/docs/prompt.md', '.integrity-suite/docs/workflow.md'];

    // Always run in strict mode (core kit protection is always enforced in test:full)

    paths.forEach((p) => {
      const protectedDocsOnly = protectedPaths.some((prot) => p === prot || p.startsWith(prot));

      // Protect ENTIRE .integrity-suite in test:full
      if (p.startsWith('.integrity-suite/')) {
        expect(
          false,
          `🔒 Core kit protection: .integrity-suite/* is protected from modification: ${p}`,
        ).toBe(true);
      }
    });
  });
});
