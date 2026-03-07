import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, codeFiles, pkg, allSourceFiles, testsDir, hasTailwind, getFiles } from './shared';

describe('Level 6: Testing & Coverage @testing', () => {
  it('Should have @vitest/coverage-v8 installed', () => {
    if (!fs.existsSync(testsDir)) return;
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBeDefined();
  });

  it('Should have at least one non-dummy test file per source module', () => {
    if (!fs.existsSync(testsDir)) {
      return; // nothing to validate
    }

    const srcFiles = getFiles(path.join(rootDir, 'src')).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'),
    );

    const testFiles = allSourceFiles.filter(
      (f) => f.startsWith(testsDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
    );

    srcFiles.forEach((srcFile) => {
      const moduleName = path.basename(srcFile, path.extname(srcFile));
      const relPath = path.relative(rootDir, srcFile).replace(/\\/g, '/');

      const coveringTests = testFiles.filter((testFile) => {
        const content = fs.readFileSync(testFile, 'utf8');
        const importsModule =
          content.includes(`from '../../src/${moduleName}`) ||
          content.includes(`from "../src/${moduleName}`) ||
          content.includes(relPath.replace('.ts', ''));
        const hasRealAssertions = (content.match(/expect\(/g) ?? []).length >= 2;
        return importsModule && hasRealAssertions;
      });

      expect(
        coveringTests.length,
        `No real test (with imports + assertions) covers module: ${moduleName}`,
      ).toBeGreaterThan(0);
    });
  });

  it('Should configure 100% test coverage threshold in vitest.config.ts', () => {
    const vitestConfigPath = path.join(rootDir, 'vitest.config.ts');
    expect(fs.existsSync(vitestConfigPath), 'vitest.config.ts does not exist').toBe(true);

    const content = fs.readFileSync(vitestConfigPath, 'utf8');
    expect(content, 'vitest.config.ts missing coverage definition').toContain('coverage:');
    expect(content).toMatch(/lines:\s*100/);
    expect(content).toMatch(/functions:\s*100/);
    expect(content).toMatch(/statements:\s*100/);
    expect(content).toMatch(/branches:\s*100/);
    expect(content, 'vitest.config.ts missing all: true coverage definition').toMatch(
      /all:\s*true/,
    );
    expect(content, 'vitest.config.ts missing include definition').toContain('include:');
    expect(content, 'vitest.config.ts include must target src/').toMatch(
      /include:\s*\[['"`]src\/\*\*['"`]\]/,
    );
  });

  it('Should configure vitest timeouts', () => {
    const vitestConfigPath = path.join(rootDir, 'vitest.config.ts');
    expect(fs.existsSync(vitestConfigPath), 'vitest.config.ts does not exist').toBe(true);

    const content = fs.readFileSync(vitestConfigPath, 'utf8');
    expect(content, 'vitest.config.ts missing testTimeout').toContain('testTimeout:');
    expect(content, 'vitest.config.ts missing hookTimeout').toContain('hookTimeout:');
  });

  it('Should have a src/ directory as the coverage target', () => {
    expect(
      fs.existsSync(path.join(rootDir, 'src')),
      'src/ directory is missing: coverage target does not exist',
    ).toBe(true);
  });

  it('Should not have coverage exclusions in vitest.config.ts', () => {
    const content = fs.readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8');
    const coverageBlockMatch = content.match(/coverage:\s*\{([\s\S]*?)(\n\s*\},|\n\s*\})/m);
    const coverageBlock = coverageBlockMatch ? coverageBlockMatch[1] : '';
    expect(
      coverageBlock,
      'vitest.config.ts coverage block must not have an exclude list',
    ).not.toMatch(/\bexclude\s*:/);
  });

  it('Should enforce test coverage flag in package.json scripts', () => {
    if (!fs.existsSync(testsDir)) return;
    expect(pkg.scripts['test:unit']).toContain('--coverage');
  });

  it('Should not have bootstrap files remaining when real functionality is present', () => {
    const srcDir = path.join(rootDir, 'src');
    const srcFiles = getFiles(srcDir).filter((f) => /\.(ts|tsx)$/.test(f));
    const hasRealSrc = srcFiles.some((f) => path.basename(f) !== 'index.ts');

    const bootstrapTests = [path.join(rootDir, 'tests', 'e2e', 'dummy.spec.ts')];

    if (hasRealSrc) {
      bootstrapTests.forEach((file) => {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Bootstrap test ${path.relative(rootDir, file)} must be removed/replaced once real code is added to src/`,
          ).not.toContain('Dummy E2E Test');
        }
      });
    }
  });

  it('Should have at least one unhappy-path assertion per unit test file', () => {
    const unitDir = path.join(rootDir, 'tests', 'unit') + path.sep;
    const unitTestFiles = allSourceFiles.filter(
      (f) => f.startsWith(unitDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
    );
    unitTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const hasUnhappyPath = /\b(toThrow|rejects|toThrowError)\b/.test(content);
      expect(
        hasUnhappyPath,
        `No unhappy-path tests in ${path.relative(rootDir, file)}: add at least one test for error/rejection scenarios`,
      ).toBe(true);
    });
  });

  it('Should not have duplicate test names within the same test file', () => {
    const testFiles = allSourceFiles.filter(
      (f) => f.startsWith(testsDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
    );
    testFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const testNames = [...content.matchAll(/\bit\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
      const uniqueNames = new Set(testNames);
      expect(
        uniqueNames.size,
        `Duplicate test names found in ${path.relative(rootDir, file)}: rename tests to be unique`,
      ).toBe(testNames.length);
    });
  });

  it('Should not contain .only or .skip test modifiers in any test file', () => {
    const testFiles = allSourceFiles.filter(
      (f) => f.startsWith(testsDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
    );
    testFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `.only in ${file}: isolates tests, silently hiding all others`).not.toMatch(
        /\b(?:it|test|describe)\.only\s*\(/,
      );
      expect(content, `.skip in ${file}: disables tests without removing them`).not.toMatch(
        /\b(?:it|test|describe)\.skip\s*\(/,
      );
    });
  });

  it('Should have a minimum of 4 assertions per unit test file', () => {
    const unitDir = path.join(rootDir, 'tests', 'unit') + path.sep;
    allSourceFiles
      .filter((f) => f.startsWith(unitDir) && /\.(test|spec)\.(ts|tsx)$/.test(f))
      .forEach((file) => {
        const count = (fs.readFileSync(file, 'utf8').match(/\bexpect\s*\(/g) ?? []).length;
        expect(
          count,
          `Unit test ${path.relative(rootDir, file)} has only ${count} assertion(s): add more to build confidence`,
        ).toBeGreaterThanOrEqual(4);
      });
  });

  it('Should not configure passWithNoTests: true in vitest.config.ts', () => {
    const vitestContent = fs.readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8');
    expect(vitestContent, 'passWithNoTests: true bypasses empty test runs silently').not.toMatch(
      /passWithNoTests\s*:\s*true/,
    );
  });
});
