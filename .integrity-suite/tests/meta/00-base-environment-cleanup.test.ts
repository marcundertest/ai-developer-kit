import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, codeFiles, pkg, allSourceFiles, testsDir, hasTailwind } from './shared';

describe('Level 0: Base Environment & Cleanup @base', () => {
  it('Should compile all test and script files without type errors (including implicit any)', () => {
    try {
      const tsFiles = codeFiles.filter(
        (f) => f.endsWith('.ts') && !f.includes('node_modules') && !f.includes('dist'),
      );
      execSync(
        'tsc --noEmit --target ESNext --module NodeNext --lib ESNext --moduleResolution NodeNext --esModuleInterop true --strict true --skipLibCheck true ' +
          tsFiles.join(' '),
        { encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (e: any) {
      const msg = e.stdout ? e.stdout.toString() : String(e.message || e);
      expect(false, `TypeScript compilation failed:\n${msg}`).toBe(true);
    }
  });

  it('Should be a git repository', () => {
    expect(fs.existsSync(path.join(rootDir, '.git'))).toBe(true);
  });

  it('Should have a .gitignore file', () => {
    expect(fs.existsSync(path.join(rootDir, '.gitignore'))).toBe(true);
  });

  it('Should have essential config files (.husky, .markdownlint.json)', () => {
    expect(fs.existsSync(path.join(rootDir, '.husky'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, '.markdownlint.json'))).toBe(true);
  });

  it('Should have a CHANGELOG.md file in English and without emojis', () => {
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    expect(fs.existsSync(changelogPath), 'CHANGELOG.md is missing').toBe(true);
    const content = fs.readFileSync(changelogPath, 'utf8');

    expect(content, 'CHANGELOG.md missing language policy notice').toContain(
      'strictly maintained in **English**',
    );

    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/u;
    expect(content, 'CHANGELOG.md contains emojis').not.toMatch(emojiRegex);

    const isAscii = [...content].every((char) => char.charCodeAt(0) <= 127);
    expect(isAscii, 'CHANGELOG.md contains non-English characters').toBe(true);

    expect(content).toContain('Changelog');
    expect(content).toContain('Added');
    expect(content).toContain('Changed');
    expect(content).toContain('Fixed');
  });

  it('Should have a pnpm-lock.yaml lockfile', () => {
    expect(
      fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml')),
      'pnpm-lock.yaml is missing: reproducible builds require a lockfile',
    ).toBe(true);
  });

  it('Should use PNPM and forbid obsolete npm/yarn lockfiles', () => {
    expect(
      fs.existsSync(path.join(rootDir, 'package-lock.json')),
      'Found obsolete package-lock.json',
    ).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'yarn.lock')), 'Found obsolete yarn.lock').toBe(false);
  });

  it('Should have .env patterns excluded in .gitignore', () => {
    const content = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
    expect(content).toMatch(/^\.env$/m);
    expect(content).toMatch(/\*\.env/m);
  });

  it('Should exclude build artifacts from git', () => {
    const content = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
    ['dist/', 'coverage/', 'node_modules/'].forEach((pattern) => {
      expect(content, `${pattern} not in .gitignore`).toContain(pattern);
    });
  });

  it('Should have a commit-msg hook that enforces commitlint', () => {
    const commitMsgPath = path.join(rootDir, '.husky', 'commit-msg');
    expect(fs.existsSync(commitMsgPath), '.husky/commit-msg hook is missing').toBe(true);
    const commitMsgContent = fs.readFileSync(commitMsgPath, 'utf8');
    expect(commitMsgContent, 'commit-msg hook must invoke commitlint').toContain('commitlint');
    expect(
      commitMsgContent,
      'commit-msg hook must reference the integrity-suite commitlint config',
    ).toContain('.integrity-suite/scripts/commitlint.config.ts');
  });

  it('Should have a .nvmrc or .node-version file for Node.js version pinning', () => {
    const hasNvmrc = fs.existsSync(path.join(rootDir, '.nvmrc'));
    const hasNodeVersion = fs.existsSync(path.join(rootDir, '.node-version'));
    expect(
      hasNvmrc || hasNodeVersion,
      '.nvmrc or .node-version is missing: pin the Node.js version for reproducible environments',
    ).toBe(true);
  });
});
