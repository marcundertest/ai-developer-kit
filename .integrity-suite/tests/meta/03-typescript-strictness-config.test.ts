import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, codeFiles, pkg, allSourceFiles, testsDir, hasTailwind } from './shared';

describe('Level 3: TypeScript Strictness & Config @typescript', () => {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));

  it('Should have strict mode and implicitAny disabled in tsconfig.json', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
  });

  it('Should forbid unsafe tsconfig relaxations', () => {
    expect(tsconfig.compilerOptions.allowJs, 'allowJs must not be enabled').not.toBe(true);
    expect(tsconfig.compilerOptions.checkJs, 'checkJs must not be enabled').not.toBe(true);
    expect(tsconfig.compilerOptions.noEmitOnError, 'noEmitOnError must be true').toBe(true);
  });

  it('Should have noUnusedLocals and noUnusedParameters enabled in tsconfig', () => {
    expect(tsconfig.compilerOptions.noUnusedLocals, 'noUnusedLocals must be true').toBe(true);
    expect(tsconfig.compilerOptions.noUnusedParameters, 'noUnusedParameters must be true').toBe(
      true,
    );
  });

  it('Should have a modern target in tsconfig.json', () => {
    expect(tsconfig.compilerOptions.target).toBeDefined();
    expect(['ESNext', 'ES2022', 'ES2021']).toContain(tsconfig.compilerOptions.target);
  });

  it('Should be a TypeScript project and forbid bypass keywords', () => {
    if (!fs.existsSync(testsDir)) return;

    expect(fs.existsSync(path.join(rootDir, 'tsconfig.json'))).toBe(true);
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const tsI = '@ts-' + 'ignore';
      const tsE = '@ts-' + 'expect-error';
      const anyCast1 = new RegExp('<an' + 'y>');
      const anyCast2 = new RegExp('as\\s+an' + 'y');

      expect(content, `File ${file} contains ${tsI}`).not.toContain(tsI);
      expect(content, `File ${file} contains explicit "any" cast`).not.toMatch(anyCast1);
      expect(content, `File ${file} contains explicit "any" cast`).not.toMatch(anyCast2);
      expect(content, `File ${file} contains ${tsE}`).not.toContain(tsE);
    });
  });

  it('Should not have exports in src/ that are never imported anywhere', () => {
    if (!fs.existsSync(testsDir)) return;

    const srcDir = path.join(rootDir, 'src') + path.sep;
    const srcFiles = codeFiles.filter((f) => f.startsWith(srcDir));
    const allFilesContent = [
      ...codeFiles,
      ...allSourceFiles.filter((f) => f.startsWith(testsDir)),
    ].map((f) => ({
      path: f,
      content: fs.readFileSync(f, 'utf8'),
    }));

    srcFiles.forEach((file) => {
      const fileData = allFilesContent.find((f) => f.path === file);
      if (!fileData) return;

      let namedExports = [
        ...fileData.content.matchAll(
          /^export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/gm,
        ),
      ].map((m) => m[1]);
      namedExports = namedExports.filter((n) => !['version', 'ping'].includes(n));

      namedExports.forEach((exportName) => {
        const usagePattern = new RegExp(`\\b${exportName}\\b`);
        const isUsedElsewhere = allFilesContent.some((f) => {
          if (f.path === file) return false;
          return usagePattern.test(f.content);
        });

        expect(
          isUsedElsewhere,
          `Export "${exportName}" in ${path.relative(rootDir, file)} is never used in other files or tests`,
        ).toBe(true);
      });
    });
  });

  it('Should forbid non-null assertion operator in src/', () => {
    const srcDir = path.join(rootDir, 'src') + path.sep;
    codeFiles
      .filter((f) => f.startsWith(srcDir))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Non-null assertion (!.) in ${file}: use null checks or type guards instead`,
        ).not.toMatch(/\w!\./);
      });
  });

  it('Should forbid numeric enums in src/', () => {
    const srcDir = path.join(rootDir, 'src') + path.sep;
    codeFiles
      .filter((f) => f.startsWith(srcDir))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Numeric enum in ${file}: use string enums or const objects for better debuggability`,
        ).not.toMatch(/enum\s+\w+\s*\{[^}]*=\s*\d/);
      });
  });

  it('Should forbid double-assertion casting (as unknown as Type) in src/', () => {
    const srcDir = path.join(rootDir, 'src') + path.sep;
    codeFiles
      .filter((f) => f.startsWith(srcDir))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Double-assertion cast (as unknown as Type) in ${file}: this bypasses type safety entirely`,
        ).not.toMatch(/\bas\s+unknown\s+as\s+\w/);
      });
  });

  it('Should type catch clause errors as unknown, not untyped in src/ and tests/', () => {
    const filesToCheck = [...codeFiles.filter((f) => f.includes('/src/') || f.includes('/tests/'))];
    filesToCheck.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const untypedCatch = content.match(/catch\s*\(\s*\w+\s*\)(?!\s*:\s*unknown)/g);
      expect(
        untypedCatch,
        `Untyped catch clause found in ${file}. Use \`catch (e: unknown)\` to properly type error handling`,
      ).toBeFalsy();
    });
  });

  it('Should not have dangling or invalid module imports', () => {
    const testFilePath = path.join(
      rootDir,
      '.integrity-suite',
      'tests',
      'meta',
      '03-typescript-strictness-config.test.ts',
    );
    const content = fs.readFileSync(testFilePath, 'utf8');

    const deletedModules = [
      '../scripts/check-version.js',
      '../scripts/check-changelog.js',
      '../scripts/check-audit.js',
    ];

    deletedModules.forEach((module) => {
      const hasImport =
        content.includes(`from '${module}'`) ||
        content.includes(`from "${module}"`) ||
        content.includes(`declare module '${module}'`) ||
        content.includes(`declare module "${module}"`);
      expect(
        !hasImport,
        `Reference to deleted module "${module}" found in test file. All validations are now in tests.`,
      ).toBe(true);
    });
  });

  it('Should have noFallthroughCasesInSwitch enabled in tsconfig.json', () => {
    expect(
      tsconfig.compilerOptions.noFallthroughCasesInSwitch,
      'noFallthroughCasesInSwitch prevents silent fallthrough bugs in switch statements',
    ).toBe(true);
  });

  it('Should have exactOptionalPropertyTypes enabled in tsconfig.json', () => {
    expect(
      tsconfig.compilerOptions.exactOptionalPropertyTypes,
      'exactOptionalPropertyTypes prevents implicitly assigning undefined to optional properties',
    ).toBe(true);
  });

  it('Should have noPropertyAccessFromIndexSignature enabled in tsconfig.json', () => {
    expect(
      tsconfig.compilerOptions.noPropertyAccessFromIndexSignature,
      'noPropertyAccessFromIndexSignature prevents dot-access on index signature types',
    ).toBe(true);
  });

  it('Should not have TypeScript compilation errors', () => {
    try {
      const output = execSync('tsc --noEmit', {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(true).toBe(true);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      expect(false, `TypeScript compilation failed:\n${errorMessage}`).toBe(true);
    }
  });
});
