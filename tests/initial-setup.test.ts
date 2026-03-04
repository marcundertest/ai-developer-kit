import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

describe('Project Initial Setup', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  it('should have a package.json with correct details', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toBe('project-template');
    expect(pkg.author).toContain('Marc Galindo');
    expect(pkg.author).toContain('marcundertest');
    expect(pkg.author).toContain('https://marcundertest.com');
  });

  it('should have a git repository', () => {
    const gitPath = path.join(rootDir, '.git');
    expect(fs.existsSync(gitPath)).toBe(true);
  });

  it('should have a .gitignore file', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  it('should have ESLint configured', () => {
    const eslintFiles = ['.eslintrc.json', '.eslintrc.js', 'eslint.config.mjs', 'eslint.config.js'];
    const exists = eslintFiles.some((f) => fs.existsSync(path.join(rootDir, f)));
    expect(exists).toBe(true);
  });

  it('should have Prettier configured', () => {
    const prettierFiles = ['.prettierrc', '.prettierrc.json', '.prettierrc.js'];
    const exists = prettierFiles.some((f) => fs.existsSync(path.join(rootDir, f)));
    expect(exists).toBe(true);
  });

  it('should have Markdownlint configured', () => {
    const mdLintFiles = ['.markdownlint.json', '.markdownlint.yaml', '.markdownlint.yml'];
    const exists = mdLintFiles.some((f) => fs.existsSync(path.join(rootDir, f)));
    expect(exists).toBe(true);
  });

  it('should have Husky configured', () => {
    const huskyDir = path.join(rootDir, '.husky');
    expect(fs.existsSync(huskyDir)).toBe(true);
  });

  it('should have Commitlint configured', () => {
    const commitlintFiles = ['commitlint.config.js', '.commitlintrc.json', '.commitlintrc.js'];
    const existsFile = commitlintFiles.some((f) => fs.existsSync(path.join(rootDir, f)));

    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const existsPkg = !!pkg.commitlint;

    expect(existsFile || existsPkg).toBe(true);
  });

  it('should have a LICENSE file with the specified content', () => {
    const licensePath = path.join(rootDir, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);
    const licenseContent = fs.readFileSync(licensePath, 'utf8');
    expect(licenseContent).toContain('Marc Galindo');
    expect(licenseContent).toContain('marcundertest');
    expect(licenseContent).toContain('https://marcundertest.com');
    expect(licenseContent.toLowerCase()).toContain('non-commercial');
    expect(licenseContent.toLowerCase()).toContain('attribution');
  });

  it('should be a TypeScript project', () => {
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);
  });

  it('should use PNPM (no other lockfiles)', () => {
    expect(fs.existsSync(path.join(rootDir, 'package-lock.json'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'yarn.lock'))).toBe(false);
  });
});
