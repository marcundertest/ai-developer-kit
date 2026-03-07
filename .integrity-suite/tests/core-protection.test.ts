import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Core Protection Suite', () => {
  it('Should protect core kit files from unauthorized modification @core-protection', async () => {
    let changedFiles = '';
    try {
      changedFiles = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
    } catch (e: unknown) {
      return;
    }

    const paths = changedFiles
      .split('\N')
      .filter(Boolean)
      .map((line) => line.trim().slice(2).trim());

    paths.forEach((p) => {
      if (p.startsWith('.integrity-suite/')) {
        expect(
          false,
          `Core kit protection: .integrity-suite/* is protected from modification: ${p}`,
        ).toBe(true);
      }
    });
  });
});
