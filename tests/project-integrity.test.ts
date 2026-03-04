import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

describe('Project Integrity & Quality Suite', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  const getFiles = (dir: string, allFiles: string[] = []) => {
    if (!fs.existsSync(dir)) return allFiles;
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        if (!name.includes('node_modules') && !name.includes('.git') && !name.includes('dist')) {
          getFiles(name, allFiles);
        }
      } else {
        const ext = path.extname(name);
        if (['.ts', '.js', '.tsx', '.jsx', '.html', '.css'].includes(ext)) {
          allFiles.push(name);
        }
      }
    });
    return allFiles;
  };

  const codeFiles = getFiles(rootDir).filter((f) => !f.split(path.sep).includes('tests'));
  const allSourceFiles = getFiles(rootDir);
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

  describe('Level 0: Base Environment', () => {
    it('should be a git repository', () => {
      expect(fs.existsSync(path.join(rootDir, '.git'))).toBe(true);
    });

    it('should have a .gitignore file', () => {
      expect(fs.existsSync(path.join(rootDir, '.gitignore'))).toBe(true);
    });

    it('should use PNPM (no other lockfiles)', () => {
      expect(fs.existsSync(path.join(rootDir, 'package-lock.json'))).toBe(false);
      expect(fs.existsSync(path.join(rootDir, 'yarn.lock'))).toBe(false);
    });
  });

  describe('Level 1: Project Metadata & Tooling Config', () => {
    it('should have valid package.json details', () => {
      expect(pkg.name).toBeDefined();
      expect(pkg.name.length).toBeGreaterThan(0);
      expect(pkg.author).toBeDefined();
      expect(pkg.author.length).toBeGreaterThan(0);
      expect(pkg.version).toBeDefined();
    });

    it('should have all dev tools configured', () => {
      const configs = ['.eslintrc.json', 'tsconfig.json', '.prettierrc'];
      configs.forEach((config) => {
        // Try multiple possible extensions if needed, but here we have specific ones
        const exists = fs.existsSync(path.join(rootDir, config));
        expect(exists, `Config file ${config} is missing`).toBe(true);
      });

      // Special check for Husky and Markdownlint
      expect(fs.existsSync(path.join(rootDir, '.husky'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, '.markdownlint.json'))).toBe(true);
    });

    it('should have Commitlint configured', () => {
      const commitlintFiles = ['commitlint.config.js', '.commitlintrc.json', '.commitlintrc.js'];
      const existsFile = commitlintFiles.some((f) => fs.existsSync(path.join(rootDir, f)));
      const existsPkg = !!pkg.commitlint;
      expect(existsFile || existsPkg).toBe(true);
    });
  });

  describe('Level 2: Strict Workflow (Pipeline)', () => {
    it('should enforce validation in pre-commit hook', () => {
      const hookPath = path.join(rootDir, '.husky', 'pre-commit');
      const content = fs.readFileSync(hookPath, 'utf8');
      expect(content).toContain('pnpm validate-project');
    });

    it('should have a zero-tolerance validation script', () => {
      const script = pkg.scripts['validate-project'];
      expect(script).toContain('pnpm lint');
      expect(script).toContain('pnpm mdlint');
      expect(script).toContain('pnpm format:check');
      expect(script).toContain('tsc --noEmit');
      expect(script).toContain('pnpm test');
      expect(script).toContain('pnpm check-version');
    });

    it('should fail on any linting warning', () => {
      expect(pkg.scripts['lint']).toContain('--max-warnings 0');
    });

    it('should have a format check script', () => {
      expect(pkg.scripts['format:check']).toBe('prettier --check .');
    });
  });

  describe('Level 3: Code Quality - Types & Standards', () => {
    it('should have TypeScript strict mode enabled', () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should be a TypeScript project', () => {
      expect(fs.existsSync(path.join(rootDir, 'tsconfig.json'))).toBe(true);
    });

    it('should search for and forbid @ts-ignore and explicit "any"', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `File ${file} contains @ts-ignore`).not.toContain('@ts-ignore');
        expect(content, `File ${file} contains explicit "any" type`).not.toMatch(/:\s*any/);
        expect(content, `File ${file} contains explicit "any" cast`).not.toMatch(/<any>/);
        expect(content, `File ${file} contains explicit "any" cast`).not.toMatch(/as\s+any/);
      });
    });
  });

  describe('Level 4: Code Quality - Hygiene & English', () => {
    it('should enforce English-only comments (ASCII)', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('project-integrity.test.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g;
        const comments = content.match(commentRegex);
        if (comments) {
          comments.forEach((comment) => {
            // eslint-disable-next-line no-control-regex
            const nonAscii = /[^\u0000-\u007F]/;
            expect(nonAscii.test(comment), `Non-English comment in ${file}: "${comment}"`).toBe(
              false,
            );
          });
        }
      });
    });

    it('should forbit console.log/debug in source', () => {
      codeFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('scripts') || parts.includes('check-version.js')) return;
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Console usage in ${file}`).not.toMatch(/console\.(log|debug|info)/);
      });
    });

    it('should forbid TODO/FIXME in non-markdown files', () => {
      allSourceFiles.forEach((file) => {
        if (file.endsWith('.md')) return;
        const parts = file.split(path.sep);
        if (parts.includes('project-integrity.test.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Unresolved task in ${file}`).not.toMatch(/TODO|FIXME/i);
      });
    });
  });

  describe('Level 5: Architecture & Security', () => {
    it('should enforce layer isolation (Backend <-> Frontend)', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const parts = file.split(path.sep);
        if (parts.includes('backend')) {
          expect(content, `Backend import leak in ${file}`).not.toMatch(
            /from\s+['"].*\/frontend\//,
          );
        }
        if (parts.includes('frontend')) {
          expect(content, `Frontend import leak in ${file}`).not.toMatch(
            /from\s+['"].*\/backend\//,
          );
        }
      });
    });

    it('should limit component size to 300 lines', () => {
      const compDir = path.join(rootDir, 'src', 'components');
      if (fs.existsSync(compDir)) {
        getFiles(compDir).forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const lineCount = content.split('\n').length;
          expect(lineCount, `Component ${file} exceeds 300 lines`).toBeLessThanOrEqual(300);
        });
      }
    });

    it('should detect potential hardcoded secrets', () => {
      const patterns = [/api[_-]?key/i, /secret[_-]?key/i, /password/i, /token/i];
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        patterns.forEach((pattern) => {
          const assignmentRegex = new RegExp(
            `${pattern.source}\\s*[:=]\\s*['"][\\w-]{8,}['"]`,
            'i',
          );
          expect(content, `Hardcoded secret in ${file}`).not.toMatch(assignmentRegex);
        });
      });
    });

    it('should forbid linter/formatter bypass directives', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('project-integrity.test.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Bypass directive in ${file}`).not.toContain('eslint-disable');
        expect(content, `Bypass directive in ${file}`).not.toContain('prettier-ignore');
      });
    });

    it('should ensure all tests are cross-platform (Meta-test)', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (!parts.includes('tests')) return;
        if (parts.includes('project-integrity.test.ts')) return;

        const content = fs
          .readFileSync(file, 'utf8')
          .replace(/import\s+.*from\s+['"].*['"]/g, '')
          .replace(/https?:\/\/[^\s'"]+/g, '');

        expect(
          content.match(/\.includes\(['"][^'"]*[/\\].*['"]\)/),
          `Hardcoded slash in test ${file}`,
        ).toBeNull();
        expect(
          content.match(/\.match\(['"][^'"]*[/\\].*['"]\)/),
          `Hardcoded slash in test ${file}`,
        ).toBeNull();
      });
    });
  });
});
