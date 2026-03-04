import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

describe('Integrity Suite', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

  const getFiles = (dir: string, allFiles: string[] = []) => {
    if (!fs.existsSync(dir)) return allFiles;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const name = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          !['node_modules', '.git', 'dist', '.integrity-suite', 'coverage'].includes(entry.name)
        ) {
          getFiles(name, allFiles);
        }
      } else {
        const ext = path.extname(entry.name);
        if (
          ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json'].includes(ext) ||
          entry.name.startsWith('.env')
        ) {
          allFiles.push(name);
        }
      }
    });
    return allFiles;
  };

  const allSourceFiles = getFiles(rootDir);
  const testsDir = path.join(rootDir, 'tests') + path.sep;
  const codeFiles = allSourceFiles.filter((f) => {
    const ext = path.extname(f);
    return ['.ts', '.js', '.tsx', '.jsx'].includes(ext) && !f.startsWith(testsDir);
  });
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
      const isAscii = [...content].every((char) => char.charCodeAt(0) <= 127);
      expect(isAscii, 'CHANGELOG.md contains non-English characters').toBe(true);

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

    it('should enforce validation in pre-commit hook with no escapes', () => {
      const hookPath = path.join(rootDir, '.husky', 'pre-commit');
      const content = fs.readFileSync(hookPath, 'utf8');
      expect(content, 'Pre-commit hook is missing validation').toContain('pnpm validate-project');
      expect(content, 'Pre-commit hook contains an early exit').not.toMatch(/exit\s+0/);
      expect(content, 'Validation command is commented out or fake').not.toMatch(
        /^[ \t]*#.*pnpm validate-project/m,
      );
      expect(content, 'Validation command is echoed').not.toMatch(/echo.*pnpm validate-project/m);
    });

    it('should forbid commits if the latest requirement is not Approved', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      expect(fs.existsSync(reqPath), 'requirements.md is missing').toBe(true);
      const content = fs.readFileSync(reqPath, 'utf8');

      // Find the "## Historial de requerimientos" section to ignore templates
      const historyParts = content.split('## Historial de requerimientos');
      expect(
        historyParts.length,
        'Missing "## Historial de requerimientos" section in requirements.md',
      ).toBeGreaterThan(1);

      const historySection = historyParts[1];
      const reqBlocks = historySection.split('\n### Requerimiento');

      expect(
        reqBlocks.length,
        'No requirements found in history section of requirements.md',
      ).toBeGreaterThan(1);

      const latestReq = reqBlocks[1];
      // Ensure it contains "- **Estado**: Aprobado"
      expect(
        latestReq,
        'The latest requirement must be marked as Approved by the user before committing.',
      ).toContain('- **Estado**: Aprobado');
    });

    it('should maintain structured and sequential requirements in requirements.md', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const content = fs.readFileSync(reqPath, 'utf8');

      const historyParts = content.split('## Historial de requerimientos');
      if (historyParts.length < 2) return;

      const reqBlocks = historyParts[1].split('\n### Requerimiento');
      const numbers: number[] = [];

      for (let i = 1; i < reqBlocks.length; i++) {
        const block = reqBlocks[i];

        // Prevent accidentally merged requirements (e.g. missing a heading)
        const estadoMatches = (block.match(/- \*\*Estado\*\*:/g) || []).length;
        expect(
          estadoMatches,
          `Multiple '- **Estado**:' entries found in a single Requerimiento block (missing heading?)`,
        ).toBeLessThanOrEqual(1);

        const fechaMatches = (block.match(/- \*\*Fecha\*\*:/g) || []).length;
        expect(
          fechaMatches,
          `Multiple '- **Fecha**:' entries found in a single Requerimiento block (missing heading?)`,
        ).toBeLessThanOrEqual(1);

        // Check descending sequence
        const numMatch = block.match(/^\s*(\d+)/);
        if (numMatch) {
          numbers.push(parseInt(numMatch[1], 10));
        }
      }

      for (let i = 0; i < numbers.length - 1; i++) {
        expect(
          numbers[i],
          `Requirements are not sorted in strict descending order: ${numbers[i]} followed by ${numbers[i + 1]}`,
        ).toBeGreaterThan(numbers[i + 1]);
      }
    });

    it('should have a zero-tolerance validation script with security audit', () => {
      const script = pkg.scripts['validate-project'];
      expect(script).toContain('pnpm lint');
      expect(script).toContain('pnpm mdlint');
      expect(script).toContain('pnpm format:check');
      expect(script).toContain('tsc --noEmit');
      expect(script).toContain('pnpm audit');
      expect(script).toContain('pnpm check-version');
      expect(script).toContain('pnpm check-changelog');
      expect(script).toContain('pnpm test');

      // Verify check-changelog and check-version run BEFORE test
      expect(
        script.indexOf('pnpm check-changelog'),
        'check-changelog must run before pnpm test',
      ).toBeLessThan(script.indexOf('pnpm test'));
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
        const content = fs.readFileSync(file, 'utf8');
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g;
        const comments = content.match(commentRegex);
        if (comments) {
          comments.forEach((comment) => {
            const isAscii = [...comment].every((char) => char.charCodeAt(0) <= 127);
            expect(isAscii, `Non-English comment in ${file}: "${comment}"`).toBe(true);
          });
        }
      });
    });

    it('should forbid print statments in source', () => {
      codeFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('.integrity-suite')) return;
        const content = fs.readFileSync(file, 'utf8');
        const consoleRegex = new RegExp('console\\.(log|debug|info)', 'i');
        expect(content, `Console usage in ${file}`).not.toMatch(consoleRegex);
      });
    });

    it('should forbid unresolved tasks in non-markdown files', () => {
      allSourceFiles.forEach((file) => {
        if (file.endsWith('.md') || file.endsWith('.json')) return;
        const content = fs.readFileSync(file, 'utf8');
        const ruleRegex = new RegExp('TO' + 'DO|FIX' + 'ME', 'i');
        expect(content, `Unresolved task in ${file}`).not.toMatch(ruleRegex);
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
      const keys = [
        'api[_-]?key',
        'secret[_-]?key',
        'password',
        'token',
        'private[_-]?key',
        'auth[_-]?key',
      ];
      const patterns = keys.map(
        (key) => new RegExp(`(['"]?${key}['"]?)\\s*[:=]\\s*['"][\\w\\-/+=]{8,}['"]`, 'i'),
      );

      allSourceFiles.forEach((file) => {
        const base = path.basename(file);
        if (base === '.env' || file.endsWith('.md')) return;

        const content = fs.readFileSync(file, 'utf8');
        patterns.forEach((pattern) => {
          expect(content, `Potential hardcoded secret in ${file}`).not.toMatch(pattern);
        });
      });
    });

    it('should ensure all tests are cross-platform (Meta-test)', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (!parts.includes('tests')) return;

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
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Bypass directive in ${file}`).not.toContain('eslint-' + 'disable');
        expect(content, `Bypass directive in ${file}`).not.toContain('prettier-' + 'ignore');
        expect(content, `Bypass directive in ${file}`).not.toContain('markdownlint-' + 'disable');
      });
    });
  });

  describe('Level 6: Testing & Coverage', () => {
    it('should have @vitest/coverage-v8 installed', () => {
      expect(pkg.devDependencies['@vitest/coverage-v8']).toBeDefined();
    });

    it('should configure 100% test coverage threshold in vitest.config.ts', () => {
      const vitestConfigPath = path.join(rootDir, 'vitest.config.ts');
      expect(fs.existsSync(vitestConfigPath), 'vitest.config.ts does not exist').toBe(true);

      const content = fs.readFileSync(vitestConfigPath, 'utf8');
      expect(content, 'vitest.config.ts missing coverage definition').toContain('coverage:');
      expect(content).toMatch(/lines:\s*100/);
      expect(content).toMatch(/functions:\s*100/);
      expect(content).toMatch(/statements:\s*100/);
      expect(content).toMatch(/branches:\s*100/);
    });

    it('should enforce test coverage flag in package.json scripts', () => {
      expect(pkg.scripts['test:unit']).toContain('--coverage');
    });
  });
});
