import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

describe('Strict Commit Rules', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  it('should have a pre-commit hook that runs validate-project', () => {
    const hookPath = path.join(rootDir, '.husky/pre-commit');
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, 'utf8');
    expect(content).toContain('pnpm validate-project');
  });

  it('should have a validate-project script in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    expect(pkg.scripts['validate-project']).toContain('pnpm lint');
    expect(pkg.scripts['validate-project']).toContain('pnpm mdlint');
    expect(pkg.scripts['validate-project']).toContain('tsc --noEmit');
    expect(pkg.scripts['validate-project']).toContain('pnpm test');
    expect(pkg.scripts['validate-project']).toContain('pnpm check-version');
  });

  it('should have ESLint configured to reject warnings and explicit any', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    expect(pkg.scripts['lint']).toContain('--max-warnings 0');

    const eslintConfig = JSON.parse(fs.readFileSync(path.join(rootDir, '.eslintrc.json'), 'utf8'));
    expect(eslintConfig.rules['@typescript-eslint/no-explicit-any']).toBe('error');
  });

  it('should have TypeScript configured to reject implicit any', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
  });

  it('should have a version check script', () => {
    const scriptPath = path.join(rootDir, 'scripts/check-version.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});

describe('License Verification', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  it('should have the correct project name and author details', () => {
    const licensePath = path.join(rootDir, 'LICENSE');
    const content = fs.readFileSync(licensePath, 'utf8');

    expect(content).toContain('Project Template');
    expect(content).toContain('project-template');
    expect(content).toContain('Marc Galindo');
    expect(content).toContain('https://marcundertest.com');
    expect(content).toContain('marcundertest');
  });

  it('should include a link to the full license online', () => {
    const licensePath = path.join(rootDir, 'LICENSE');
    const content = fs.readFileSync(licensePath, 'utf8');
    expect(content).toContain('https://creativecommons.org/licenses/by-nc/4.0/');
  });

  it('should specify non-commercial and attribution terms', () => {
    const licensePath = path.join(rootDir, 'LICENSE');
    const content = fs.readFileSync(licensePath, 'utf8');
    expect(content.toLowerCase()).toContain('non-commercial');
    expect(content.toLowerCase()).toContain('attribution');
  });
});
