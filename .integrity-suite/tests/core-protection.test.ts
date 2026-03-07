import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

describe('Core Protection Suite', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

  it('should protect core kit files from unauthorized modification @core-protection', async () => {
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

    paths.forEach((p) => {
      const protectedDocsOnly = protectedPaths.some((prot) => p === prot || p.startsWith(prot));

      if (p.startsWith('.integrity-suite/')) {
        expect(
          false,
          `🔒 Core kit protection: .integrity-suite/* is protected from modification: ${p}`,
        ).toBe(true);
      }
    });
  });
});
