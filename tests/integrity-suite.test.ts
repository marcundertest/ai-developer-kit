import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

describe('Integrity Suite', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  const getFiles = (dir: string, allFiles: string[] = []) => {
    if (!fs.existsSync(dir)) return allFiles;
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        if (
          !name.includes('node_modules') &&
          !name.includes('.git') &&
          !name.includes('dist') &&
          !name.includes('.integrity-suite')
        ) {
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

  describe('Level 0: Base Environment & Cleanup', () => {
    it('should be a git repository', () => {
      expect(fs.existsSync(path.join(rootDir, '.git'))).toBe(true);
    });

    it('should have a .gitignore file', () => {
      expect(fs.existsSync(path.join(rootDir, '.gitignore'))).toBe(true);
    });

    it('should have essential config files (.husky, .markdownlint.json)', () => {
      expect(fs.existsSync(path.join(rootDir, '.husky'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, '.markdownlint.json'))).toBe(true);
    });

    it('should have a CHANGELOG.md file in English and without emojis', () => {
      const changelogPath = path.join(rootDir, 'CHANGELOG.md');
      expect(fs.existsSync(changelogPath), 'CHANGELOG.md is missing').toBe(true);
      const content = fs.readFileSync(changelogPath, 'utf8');

      // Check for legal notice
      expect(content, 'CHANGELOG.md missing language policy notice').toContain(
        'strictly maintained in **English**',
      );

      // Check for emojis
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/u;
      expect(content, 'CHANGELOG.md contains emojis').not.toMatch(emojiRegex);

      // Check for non-ASCII characters (Strict English/ASCII)
      // eslint-disable-next-line no-control-regex
      const nonAscii = /[^\u0000-\u007F]/;
      expect(nonAscii.test(content), 'CHANGELOG.md contains non-English characters').toBe(false);

      expect(content).toContain('Changelog');
      expect(content).toContain('Added');
      expect(content).toContain('Changed');
      expect(content).toContain('Fixed');
    });

    it('should have a requirements.md file in Spanish', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      expect(fs.existsSync(reqPath), 'requirements.md is missing').toBe(true);
      const content = fs.readFileSync(reqPath, 'utf8');

      // Check for legal notice
      expect(content, 'requirements.md missing language policy notice').toContain(
        'mantiene estrictamente en **castellano**',
      );

      // Check for Spanish keywords
      expect(content).toContain('Historial de requerimientos');
      expect(content).toContain('Interpretación');

      // Check for at least some Spanish-specific character (optional but reinforces it's not plain ASCII)
      const spanishChars = /[áéíóúñÁÉÍÓÚÑ]/;
      expect(spanishChars.test(content), 'requirements.md should contain Spanish characters').toBe(
        true,
      );
    });

    it('should use PNPM and forbid obsolete npm/yarn lockfiles', () => {
      expect(
        fs.existsSync(path.join(rootDir, 'package-lock.json')),
        'Found obsolete package-lock.json',
      ).toBe(false);
      expect(fs.existsSync(path.join(rootDir, 'yarn.lock')), 'Found obsolete yarn.lock').toBe(
        false,
      );
      expect(
        fs.existsSync(path.join(rootDir, '.npmrc')),
        'Found obsolete .npmrc (npm-specific)',
      ).toBe(false);
    });
  });

  describe('Level 1: Project Metadata & README', () => {
    it('should have valid package.json metadata', () => {
      expect(pkg.name).toBeDefined();
      expect(pkg.name.length).toBeGreaterThan(0);
      expect(pkg.author).toBeDefined();
      expect(pkg.version).toBeDefined();
    });

    it('should have a README.md with essential sections', () => {
      const readmePath = path.join(rootDir, 'README.md');
      expect(fs.existsSync(readmePath), 'README.md is missing').toBe(true);
      const content = fs.readFileSync(readmePath, 'utf8');
      expect(content).toContain('Installation');
      expect(content).toContain('Usage');
      expect(content).toContain('Contribution');
    });

    it('should have essential dependencies installed', () => {
      const devDeps = pkg.devDependencies || {};
      const required = ['vitest', 'husky', 'typescript', 'eslint', 'prettier', 'markdownlint-cli'];
      required.forEach((dep) => {
        expect(devDeps[dep], `Missing required devDependency: ${dep}`).toBeDefined();
      });
    });
  });

  describe('Level 2: Strict Workflow (Pipeline)', () => {
    it('should have essential scripts in package.json', () => {
      expect(pkg.scripts['build']).toBeDefined();
      expect(pkg.scripts['test']).toBeDefined();
      expect(pkg.scripts['start']).toBeDefined();
      expect(pkg.scripts['audit']).toBeDefined();
    });

    it('should enforce validation in pre-commit hook', () => {
      const hookPath = path.join(rootDir, '.husky', 'pre-commit');
      const content = fs.readFileSync(hookPath, 'utf8');
      expect(content).toContain('pnpm validate-project');
    });

    it('should forbid commits if the latest requirement is not Approved', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      expect(fs.existsSync(reqPath), 'requirements.md is missing').toBe(true);
      const content = fs.readFileSync(reqPath, 'utf8');

      // Find the "## Historial de requerimientos" section to ignore templates
      const historySection = content.split('## Historial de requerimientos')[1] || '';
      const reqBlocks = historySection.split('### Requerimiento');

      if (reqBlocks.length > 1) {
        const latestReq = reqBlocks[1];
        // Ensure it contains "- **Estado**: Aprobado"
        expect(
          latestReq,
          'The latest requirement must be marked as Approved before committing.',
        ).toContain('- **Estado**: Aprobado');
      }
    });

    it('should have a zero-tolerance validation script with security audit', () => {
      const script = pkg.scripts['validate-project'];
      expect(script).toContain('pnpm lint');
      expect(script).toContain('pnpm mdlint');
      expect(script).toContain('pnpm format:check');
      expect(script).toContain('tsc --noEmit');
      expect(script).toContain('pnpm audit');
      expect(script).toContain('pnpm test');
      expect(script).toContain('pnpm check-version');
    });

    it('should fail on any linting warning', () => {
      expect(pkg.scripts['lint']).toContain('--max-warnings 0');
    });
  });

  describe('Level 3: TypeScript Strictness & Config', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));

    it('should have strict mode and implicitAny disabled in tsconfig.json', () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should have a modern target in tsconfig.json', () => {
      expect(tsconfig.compilerOptions.target).toBeDefined();
      expect(['ESNext', 'ES2022', 'ES2021']).toContain(tsconfig.compilerOptions.target);
    });

    it('should be a TypeScript project and forbid bypass keywords', () => {
      expect(fs.existsSync(path.join(rootDir, 'tsconfig.json'))).toBe(true);
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `File ${file} contains @ts-ignore`).not.toContain('@ts-ignore');
        expect(content, `File ${file} contains explicit "any" type`).not.toMatch(/:\s*any/);
        expect(content, `File ${file} contains explicit "any" cast`).not.toMatch(/<any>/);
        expect(content, `File ${file} contains explicit "any" cast`).not.toMatch(/as\s+any/);
      });
    });
  });

  describe('Level 4: Hygiene & Global Standards', () => {
    it('should enforce English-only comments (ASCII)', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('integrity-suite.test.ts')) return;
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
        if (parts.includes('.integrity-suite') || parts.includes('integrity-suite.test.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Console usage in ${file}`).not.toMatch(/console\.(log|debug|info)/);
      });
    });

    it('should forbid TODO/FIXME in non-markdown files', () => {
      allSourceFiles.forEach((file) => {
        if (file.endsWith('.md')) return;
        const parts = file.split(path.sep);
        if (parts.includes('integrity-suite.test.ts')) return;
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

    it('should ensure all tests are cross-platform (Meta-test)', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (!parts.includes('tests')) return;
        if (parts.includes('integrity-suite.test.ts')) return;

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

    it('should forbid linter/formatter bypass directives', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('integrity-suite.test.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Bypass directive in ${file}`).not.toContain('eslint-disable');
        expect(content, `Bypass directive in ${file}`).not.toContain('prettier-ignore');
        expect(content, `Bypass directive in ${file}`).not.toContain('markdownlint-disable');
      });
    });
  });
});
