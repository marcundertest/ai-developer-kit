import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Core Protection Suite', () => {
  it('Should protect core kit files from unauthorized modification @core-protection', async () => {
    let originUrl = '';
    try {
      originUrl = execSync('git remote get-url origin', { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (e: unknown) {}

    // If we are developing the official integrity-suite, modifications are allowed.
    if (originUrl.includes('marcundertest/integrity-suite')) {
      return;
    }

    let statusOutput = '';
    try {
      statusOutput = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
    } catch (e: unknown) {}

    const changedFiles = statusOutput
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const status = line.slice(0, 2);
        const path = line.slice(2).trim();
        return { status, path };
      });

    changedFiles.forEach(({ status, path }) => {
      // Exclude reports as they are legitimate dynamic output even for consumers
      const isSuspicious = ['M', 'A', 'D', 'R', '?'].some((code) => status.includes(code));
      if (path.startsWith('.integrity-suite/') && !path.includes('/reports/') && isSuspicious) {
        const action = status.includes('D') ? 'deleted' : 'modified/added';
        expect(
          false,
          `Core kit protection: .integrity-suite/* file ${action}: ${path}. Modifications to the integrity suite are strictly forbidden in downstream projects.`,
        ).toBe(true);
      }
    });
  });
});
