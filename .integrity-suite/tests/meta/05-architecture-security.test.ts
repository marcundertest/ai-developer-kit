import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as ts from 'typescript';
import {
  rootDir,
  codeFiles,
  pkg,
  allSourceFiles,
  testsDirs,
  srcDirs,
  hasTailwind,
  getFiles,
} from './shared.js';

describe('Level 5: Architecture & Security @security', () => {
  it('Should have a .env.example documenting required variables', () => {
    if (fs.existsSync(path.join(rootDir, '.env'))) {
      expect(
        fs.existsSync(path.join(rootDir, '.env.example')),
        '.env.example is missing: required env vars must be documented',
      ).toBe(true);
    }
  });

  it('Should forbid process.exit() in src/', () => {
    codeFiles
      .filter((file) => srcDirs.some((srcDir) => file.startsWith(srcDir)))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `process.exit() in ${file}`).not.toMatch(/process\.exit\s*\(/);
      });
  });

  it('Should forbid wildcard or unbounded dependency ranges', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    Object.entries(allDeps || {}).forEach(([name, version]) => {
      expect(version as string, `Dependency ${name} has a wildcard range`).not.toBe('*');
      expect(version as string, `Dependency ${name} has unbounded range`).not.toMatch(/^>=[^,]/);
    });
  });

  it('Should enforce layer isolation (Backend <-> Frontend)', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const parts = file.split(path.sep);
      if (parts.includes('backend')) {
        expect(content, `Backend import leak in ${file}`).not.toMatch(/from\s+['"].*\/frontend\//);
      }
      if (parts.includes('frontend')) {
        expect(content, `Frontend import leak in ${file}`).not.toMatch(/from\s+['"].*\/backend\//);
      }
    });
  });

  it('Should limit file size to 300 lines in src/', () => {
    srcDirs.forEach((srcDir) => {
      if (fs.existsSync(srcDir)) {
        getFiles(srcDir).forEach((file) => {
          const ext = path.extname(file);
          if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;
          const content = fs.readFileSync(file, 'utf8');
          const lineCount = content.split('\n').length;
          expect(lineCount, `File ${file} exceeds 300 lines`).toBeLessThanOrEqual(300);
        });
      }
    });
  });

  it('Should not have functions with more than 4 parameters in src/', () => {
    codeFiles
      .filter((file) => srcDirs.some((srcDir) => file.startsWith(srcDir)))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        let hasTooManyParams = false;

        const visit = (node: ts.Node) => {
          if (
            ts.isFunctionDeclaration(node) ||
            ts.isArrowFunction(node) ||
            ts.isFunctionExpression(node) ||
            ts.isMethodDeclaration(node)
          ) {
            if (node.parameters.length > 4) {
              hasTooManyParams = true;
            }
          }
          ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        expect(
          hasTooManyParams,
          `Function with 5+ parameters in ${file}: consider a config object`,
        ).toBe(false);
      });
  });

  it('Should ignore .env files in git', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath), '.gitignore is missing').toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content, '.gitignore must exclude .env').toMatch(/^\.env$/m);
  });

  it('Should detect potential hardcoded secrets', () => {
    const keys = [
      'api[_-]?key',
      'secret[_-]?key',
      'password',
      'token',
      'private[_-]?key',
      'auth[_-]?key',
      'credential',
      'bearer',
      'access[_-]?key',
      'client[_-]?secret',
      'passphrase',
      'refresh[_-]?token',
      'webhook[_-]?secret',
    ];
    const patterns = [
      ...keys.map(
        (key) =>
          new RegExp(
            `(['"\`]?${key}['"\`]?)\\s*[:=]\\s*['"\`][\\w\\-/+=]{8,}['"\`]|process\\.env\\.[\\w_]+\\s*(?:\\|\\||\\?\\?)\\s*['"\`][\\w\\-/+=]{8,}['"\`]`,
            'i',
          ),
      ),
      /https?:\/\/[^:@\s"'`]+:[^@\s"'`]{4,}@/i, // URLs with credentials
      /\/\/.*(?:password|secret|token)\s*[:=]\s*\S{6,}/i, // Secrets in comments
      /['"`][A-Za-z0-9+/]{32,}={0,2}['"`]/, // Base64-like (32+ chars)
      /ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, // JWT
      /['"`][0-9a-fA-F]{40,}['"`]/, // Hex secret (40+ chars)
    ];

    allSourceFiles.forEach((file) => {
      const base = path.basename(file);
      if (
        base === '.env' ||
        file.endsWith('.md') ||
        base === 'tsconfig.json' ||
        base === 'pnpm-lock.yaml' ||
        file.endsWith('.yaml')
      )
        return;

      const content = fs.readFileSync(file, 'utf8');
      patterns.forEach((pattern) => {
        expect(content, `Potential hardcoded secret in ${file}`).not.toMatch(pattern);
      });
    });
  });

  it('Should not have classes with more than 10 public methods (SRP violation)', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const classBlocks = content.match(/class\s+\w+[\s\S]*?(?=\nclass\s|\n*$)/g) ?? [];
      classBlocks.forEach((block) => {
        const publicMethods = (
          block.match(/^\s+(?:public\s+)?(?:async\s+)?\w+\s*\(/gm) ?? []
        ).filter((m) => !m.includes('private') && !m.includes('protected'));
        const className = block.match(/class\s+(\w+)/)?.[1] ?? 'unknown';
        expect(
          publicMethods.length,
          `Class "${className}" in ${file} has ${publicMethods.length} public methods (SRP concern)`,
        ).toBeLessThanOrEqual(10);
      });
    });
  });

  it('Should not instantiate concrete classes inside business logic functions in src/', () => {
    const builtIns = [
      'Date',
      'Map',
      'Set',
      'Array',
      'Error',
      'URL',
      'URLSearchParams',
      'Promise',
      'RegExp',
      'Headers',
      'Request',
      'Response',
      'Blob',
      'File',
    ];
    const builtInPattern = builtIns.join('|');
    const pattern = new RegExp(
      `(?:=>|\\{)[\\s\\S]{0,500}?\\bnew\\s+(?!(?:${builtInPattern})\\b)(\\w+)\\s*\\(`,
      'g',
    );
    codeFiles
      .filter((file) => srcDirs.some((srcDir) => file.startsWith(srcDir)))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const matches = [...content.matchAll(pattern)];
        expect(
          matches.length,
          `Direct instantiation of "${matches[0]?.[1]}" inside function body in ${file}: prefer dependency injection`,
        ).toBe(0);
      });
  });

  it('Should not use wildcard re-exports (export * from) in src/', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        content,
        `Wildcard re-export in ${file}: use named exports to respect Interface Segregation`,
      ).not.toMatch(/^export\s+\*\s+from/m);
    });
  });

  it('Should ensure all tests are cross-platform (Meta-test)', () => {
    allSourceFiles.forEach((file) => {
      const isTestFile = testsDirs.some((testsDir) => file.startsWith(testsDir));
      if (!isTestFile) return;

      const metaTestPath = path.join(rootDir, 'tests', 'meta', 'integrity-suite.test.ts');
      if (file === metaTestPath) return;

      const content = fs
        .readFileSync(file, 'utf8')
        .replace(/import\s+.*from\s+['"].*['"]/g, '')
        .replace(/https?:\/\/[^\s'"]+/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/\/\/[^\n]*/g, '');

      const hardcodedSlashPattern = /\.(includes|match)\(['"][^'"]*[/\\][^'"]*['"]\)/;
      expect(
        content.match(hardcodedSlashPattern),
        `Hardcoded slash in test ${file}: use path.join or path.sep for cross-platform compatibility`,
      ).toBeNull();
    });
  });

  it('Should forbid linter/formatter bypass directives', () => {
    allSourceFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `Bypass directive in ${file}`).not.toContain('eslint-' + 'disable');
      expect(content, `Bypass directive in ${file}`).not.toContain('prettier-' + 'ignore');
      expect(content, `Bypass directive in ${file}`).not.toContain('markdownlint-' + 'disable');
    });
  });

  it('Should not use eval() or dynamic new Function() in src/', () => {
    codeFiles
      .filter((file) => srcDirs.some((srcDir) => file.startsWith(srcDir)))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `eval() in ${file}: arbitrary code execution risk`).not.toMatch(
          /\beval\s*\(/,
        );
        expect(
          content,
          `new Function() in ${file}: bypasses static analysis and strict mode`,
        ).not.toMatch(/\bnew\s+Function\s*\(/);
      });
  });

  it('Should not use dangerouslySetInnerHTML in JSX/TSX files', () => {
    codeFiles
      .filter((f) => /\.(tsx|jsx)$/.test(f))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `dangerouslySetInnerHTML in ${file}: XSS risk, use a DOM sanitizer`,
        ).not.toMatch(/dangerouslySetInnerHTML/);
      });
  });

  it('Should not throw string literals in src/', () => {
    codeFiles
      .filter((file) => srcDirs.some((srcDir) => file.startsWith(srcDir)))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `String throw in ${file}: use "throw new Error(...)" for typed, catchable errors`,
        ).not.toMatch(/\bthrow\s+['"]/);
      });
  });

  it('Should not have circular imports in src/', () => {
    srcDirs.forEach((srcDir) => {
      if (!fs.existsSync(srcDir)) return;
      try {
        execSync(`pnpm exec madge --circular --extensions ts ${srcDir}`, {
          cwd: rootDir,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        expect(false, `Circular imports detected in ${srcDir}:\n${msg}`).toBe(true);
      }
    });
  });
});
