import { describe, expect } from 'vitest';
import { it } from './shared.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, allSourceFiles, pkg } from './shared.js';

describe('Level 1: Project Metadata & README @metadata', () => {
  it('Should forbid em dash in Markdown documentation files', () => {
    const mdFiles = allSourceFiles.filter((f) => f.endsWith('.md'));
    mdFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
      expect(
        withoutCodeBlocks,
        `Em dash (\u2014) found in ${file} : use ":" or ";" instead`,
      ).not.toContain('\u2014');
    });
  });

  it('Should forbid em dash in integrity-suite documentation', () => {
    const docsDir = path.join(rootDir, '.integrity-suite', 'docs');
    if (!fs.existsSync(docsDir)) return;
    fs.readdirSync(docsDir)
      .filter((f) => f.endsWith('.md'))
      .forEach((f) => {
        const content = fs.readFileSync(path.join(docsDir, f), 'utf8');
        const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
        expect(
          withoutCodeBlocks,
          `Em dash (\u2014) found in .integrity-suite/docs/${f}: use ":" or ";" instead`,
        ).not.toContain('\u2014');
      });
  });

  it('Should have valid package.json metadata', () => {
    expect(pkg.name).toBeDefined();
    expect(pkg.name.length).toBeGreaterThan(0);
    expect(pkg.author).toBeDefined();
    expect(pkg.version).toBeDefined();
  });

  it('Should have a README.md with essential sections', () => {
    const readmePath = path.join(rootDir, 'README.md');
    expect(fs.existsSync(readmePath), 'README.md is missing').toBe(true);
    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toContain('Installation');
    expect(content).toContain('Usage');
    expect(content).toContain('Contribution');
  });

  it('Should have essential dependencies installed', () => {
    const devDeps = pkg.devDependencies || {};
    const required = ['vitest', 'husky', 'typescript', 'eslint', 'prettier', 'markdownlint-cli'];
    required.forEach((dep) => {
      expect(devDeps[dep], `Missing required devDependency: ${dep}`).toBeDefined();
    });
  });

  it('Should pass security audit with resilience to network errors', { timeout: 60000 }, () => {
    try {
      execSync('pnpm audit --prod', {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 30000,
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const networkErrors = [
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EAI_AGAIN',
        'ECONNRESET',
        'socket hang up',
      ];
      const isNetworkError = networkErrors.some((err) => errorMessage.includes(err));

      if (isNetworkError) {
        return;
      }

      const isVulnerability = errorMessage.toLowerCase().includes('vulnerabilities');
      expect(
        !isVulnerability,
        `❌ Audit failed: vulnerabilities detected in dependencies. Details:\n${errorMessage}`,
      ).toBe(true);

      expect(false, `Audit failed with unexpected error: ${errorMessage}`).toBe(true);
    }
  });
});
