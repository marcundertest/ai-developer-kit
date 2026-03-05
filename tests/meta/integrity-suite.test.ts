import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const hasTailwind = pkg.dependencies?.tailwindcss || pkg.devDependencies?.tailwindcss;

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

    it('should have a pnpm-lock.yaml lockfile', () => {
      expect(
        fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml')),
        'pnpm-lock.yaml is missing: reproducible builds require a lockfile',
      ).toBe(true);
    });

    it('should use PNPM and forbid obsolete npm/yarn lockfiles', () => {
      expect(
        fs.existsSync(path.join(rootDir, 'package-lock.json')),
        'Found obsolete package-lock.json',
      ).toBe(false);
      expect(fs.existsSync(path.join(rootDir, 'yarn.lock')), 'Found obsolete yarn.lock').toBe(
        false,
      );
    });

    it('should have .env patterns excluded in .gitignore', () => {
      const content = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
      expect(content).toMatch(/^\.env$/m);
      expect(content).toMatch(/\*\.env/m);
    });

    it('should exclude build artifacts from git', () => {
      const content = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
      ['dist/', 'coverage/', 'node_modules/'].forEach((pattern) => {
        expect(content, `${pattern} not in .gitignore`).toContain(pattern);
      });
    });

    it('should not have been tampered with (integrity hash check)', async () => {
      const { createHash } = await import('node:crypto');
      const selfPath = path.join(rootDir, 'tests', 'meta', 'integrity-suite.test.ts');
      const hashPath = path.join(rootDir, '.integrity-suite', 'integrity-suite.sha256');

      expect(fs.existsSync(hashPath), 'Missing integrity hash file').toBe(true);

      const currentHash = createHash('sha256').update(fs.readFileSync(selfPath)).digest('hex');
      const expectedHash = fs.readFileSync(hashPath, 'utf8').trim();

      expect(currentHash, 'integrity-suite.test.ts has been modified!').toBe(expectedHash);
    });
  });

  describe('Level 1: Project Metadata & README', () => {
    it('should forbid em dash in Markdown documentation files', () => {
      const mdFiles = allSourceFiles.filter((f) => f.endsWith('.md'));
      mdFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        // Allow em dash inside fenced code blocks (English content or examples are legitimate there)
        const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
        expect(
          withoutCodeBlocks,
          `Em dash (\u2014) found in ${file} : use ":" or ";" instead`,
        ).not.toContain('\u2014');
      });
    });

    it('should forbid em dash in integrity-suite documentation', () => {
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

    it('should not allow HUSKY=0 bypass in any script', () => {
      const scripts = Object.values(pkg.scripts || {}) as string[];
      scripts.forEach((script) => {
        expect(script, 'HUSKY=0 bypass found in scripts').not.toContain('HUSKY=0');
      });
    });

    it('should forbid --no-verify git bypass in scripts', () => {
      const scripts = Object.values(pkg.scripts || {}) as string[];
      scripts.forEach((script) => {
        expect(script).not.toContain('--no-verify');
      });
    });

    it('should have a valid semver version in package.json', () => {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should enforce English-only commit messages in git history', async () => {
      const { execSync } = await import('node:child_process');
      let log: string;
      try {
        log = execSync('git log --format=%s', {
          cwd: rootDir,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).toString();
      } catch {
        return; // No git history yet
      }
      const messages = log.split('\n').filter(Boolean);
      messages.forEach((msg) => {
        const isAscii = [...msg].every((char) => char.charCodeAt(0) <= 127);
        expect(isAscii, `Non-English commit message found: "${msg}"`).toBe(true);
      });
    });

    it('should forbid scopes in commit messages', async () => {
      const { execSync } = await import('node:child_process');
      let log: string;
      try {
        log = execSync('git log --format=%s', {
          cwd: rootDir,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).toString();
      } catch {
        return;
      }
      const scopePattern = /^[a-z]+\([^)]+\):/;
      const messages = log.split('\n').filter(Boolean);
      messages.forEach((msg) => {
        expect(msg, `Commit with forbidden scope found: "${msg}"`).not.toMatch(scopePattern);
      });
    });

    it('should enforce ASCII-only commit messages via commitlint plugin', async () => {
      const configPath = path.join(rootDir, '.integrity-suite', 'scripts', 'commitlint.config.js');
      expect(fs.existsSync(configPath), 'commitlint.config.js is missing').toBe(true);

      const { default: commitlintConfig } = await import(configPath);

      expect(
        commitlintConfig.rules?.['scope-enum'],
        'scope-enum rule must be set to never',
      ).toEqual([2, 'never']);

      expect(
        commitlintConfig.rules?.['subject-ascii-only'],
        'subject-ascii-only rule must be configured',
      ).toEqual([2, 'always']);

      const plugins: Array<{ rules: Record<string, unknown> }> = commitlintConfig.plugins ?? [];
      const hasAsciiPlugin = plugins.some(
        (plugin) => typeof plugin.rules?.['subject-ascii-only'] === 'function',
      );
      expect(hasAsciiPlugin, 'subject-ascii-only plugin rule is not implemented').toBe(true);
    });

    it('should enforce validation in pre-commit hook with no escapes', () => {
      const hookPath = path.join(rootDir, '.husky', 'pre-commit');
      const content = fs.readFileSync(hookPath, 'utf8');
      expect(content, 'Pre-commit hook is missing lint-staged validation').toContain(
        'pnpm lint-staged',
      );
      expect(content, 'Pre-commit hook is missing validation').toContain('pnpm validate-project');
      expect(content, 'Pre-commit hook contains an early exit').not.toMatch(/exit\s+0/);
      expect(content, 'Validation command is commented out or fake').not.toMatch(
        /^[ \t]*#.*pnpm validate-project/m,
      );
      expect(content, 'Validation command is echoed').not.toMatch(/echo.*pnpm validate-project/m);
    });

    it('should not attempt to modify the git index from within the pre-commit hook', () => {
      const hookPath = path.join(rootDir, '.husky', 'pre-commit');
      const content = fs.readFileSync(hookPath, 'utf8');
      expect(
        content,
        'pre-commit hook must not run git add: staged snapshot is already computed at this point',
      ).not.toMatch(/\bgit add\b/);
    });

    it('should forbid arbitrary tool directories in linting ignore files', () => {
      const allowedPatternsByFile: Record<string, string[]> = {
        '.prettierignore': ['node_modules', 'dist', 'build', 'coverage', 'pnpm-lock.yaml'],
        '.markdownlintignore': ['node_modules', 'dist', 'build', 'coverage'],
      };
      Object.entries(allowedPatternsByFile).forEach(([ignoreFile, allowedPatterns]) => {
        const filePath = path.join(rootDir, ignoreFile);
        if (!fs.existsSync(filePath)) return;
        const lines = fs
          .readFileSync(filePath, 'utf8')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
        lines.forEach((line) => {
          const isAllowed = allowedPatterns.some((p) => line === p || line.startsWith(p));
          expect(
            isAllowed,
            `Unexpected entry in ${ignoreFile}: "${line}" - possible agent bypass`,
          ).toBe(true);
        });
      });
    });

    it('should not have unexpected entries in .gitignore beyond build artifacts', () => {
      const content = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
      // Normalize by stripping trailing slashes; wildcard suffixes handled by startsWith
      const normalize = (s: string) => s.replace(/\/+$/, '');
      const allowedRoots = [
        'node_modules',
        '.pnp',
        '.pnp.js',
        'coverage',
        'dist',
        'build',
        '.next',
        '.nuxt',
        'out',
        '.cache',
        '.parcel-cache',
        '.turbo',
        '.vuepress',
        '.env',
        '.env.local',
        '.env.development.local',
        '.env.test.local',
        '.env.production.local',
        '*.env',
        'npm-debug.log',
        'yarn-debug.log',
        'yarn-error.log',
        'pnpm-debug.log',
        'lerna-debug.log',
        '.idea',
        '.vscode',
        '*.swp',
        '*.swo',
        '.DS_Store',
        '.husky/_',
        '.husky/.huskycache',
        '.vercel',
        '.netlify',
        '.serverless',
        'ts-node-config-',
        'junit.xml',
        'test-results',
        'playwright-report',
        'blob-report',
        'src/__tests__',
        '.vitest-results',
      ];
      lines.forEach((line) => {
        const norm = normalize(line);
        const isAllowed = allowedRoots.some((r) => norm === r || norm.startsWith(r));
        expect(
          isAllowed,
          `Unexpected entry in .gitignore: "${line}" - possible agent hiding files`,
        ).toBe(true);
      });
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

      // Point 9: Verify there is at least one approved requirement in the history (not just the latest template)
      const approvedCount = (historySection.match(/- \*\*Estado\*\*:\s*Aprobado/g) || []).length;
      expect(
        approvedCount,
        'requirements.md must have at least one Approved requirement in its history',
      ).toBeGreaterThanOrEqual(1);
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

    it('should have requirements with chronologically consistent dates', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const content = fs.readFileSync(reqPath, 'utf8');
      const historyParts = content.split('## Historial de requerimientos');
      if (historyParts.length < 2) return;

      const reqBlocks = historyParts[1].split('\n### Requerimiento');
      const dates: Date[] = [];

      for (let i = 1; i < reqBlocks.length; i++) {
        const match = reqBlocks[i].match(/- \*\*Fecha\*\*:\s*(\d{4}-\d{2}-\d{2})(\s+\d{2}:\d{2})?/);
        if (match) {
          const date = new Date(match[1]);
          // Point 7: Validate the date format is valid
          expect(
            date.getTime(),
            `Invalid date format in requirement ${i}: "${match[1]}"`,
          ).not.toBeNaN();
          dates.push(date);
        }
      }

      // Requirements are newest-first, so dates must be descending
      for (let i = 0; i < dates.length - 1; i++) {
        expect(
          dates[i].getTime(),
          `Date in requirement ${i + 1} is older than requirement ${i + 2}: check order`,
        ).toBeGreaterThanOrEqual(dates[i + 1].getTime());
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

    it('should call all three test suites in correct order in the test script', () => {
      const testScript: string = pkg.scripts['test'];
      expect(testScript).toBeDefined();
      const metaIdx = testScript.indexOf('test:meta');
      const unitIdx = testScript.indexOf('test:unit');
      const e2eIdx = testScript.indexOf('test:e2e');
      expect(metaIdx, 'test:meta is missing from test script').toBeGreaterThan(-1);
      expect(unitIdx, 'test:unit is missing from test script').toBeGreaterThan(-1);
      expect(e2eIdx, 'test:e2e is missing from test script').toBeGreaterThan(-1);
      expect(metaIdx, 'test:meta must run before test:unit').toBeLessThan(unitIdx);
      expect(unitIdx, 'test:unit must run before test:e2e').toBeLessThan(e2eIdx);
    });

    it('should have prepare script configured to install husky', () => {
      expect(pkg.scripts['prepare'], 'prepare script is missing').toBeDefined();
      expect(pkg.scripts['prepare'], 'prepare script must invoke husky').toContain('husky');
    });

    it('should have lint-staged configured to lint and format TypeScript files', () => {
      const lintStaged = pkg['lint-staged'] as Record<string, string[]> | undefined;
      expect(lintStaged, 'lint-staged config is missing from package.json').toBeDefined();
      const tsCommands: string[] = lintStaged?.['*.ts'] ?? [];
      expect(tsCommands, 'lint-staged must process *.ts files').not.toHaveLength(0);
      const hasEslint = tsCommands.some((cmd) => cmd.includes('eslint'));
      const hasPrettier = tsCommands.some((cmd) => cmd.includes('prettier'));
      expect(hasEslint, 'lint-staged must run eslint on *.ts files').toBe(true);
      expect(hasPrettier, 'lint-staged must run prettier on *.ts files').toBe(true);
      const mdCommands: string[] = lintStaged?.['*.md'] ?? [];
      const hasMdlint = mdCommands.some((cmd) => cmd.includes('markdownlint'));
      expect(hasMdlint, 'lint-staged must run markdownlint on *.md files').toBe(true);
    });

    it('should fail on any linting warning', () => {
      expect(pkg.scripts['lint']).toContain('--max-warnings 0');
    });

    it('should enforce critical ESLint rules for AI-safety', () => {
      const eslintPath = path.join(rootDir, '.eslintrc.json');
      expect(fs.existsSync(eslintPath), '.eslintrc.json is missing').toBe(true);
      const eslintContent = fs.readFileSync(eslintPath, 'utf8');
      const eslint = JSON.parse(eslintContent);
      const rules = eslint.rules || {};

      expect(rules['@typescript-eslint/no-explicit-any'], 'no-explicit-any must be error').toBe(
        'error',
      );
      expect(rules['@typescript-eslint/ban-ts-comment'], 'ban-ts-comment must be error').toBe(
        'error',
      );
      expect(rules['no-console'], 'no-console must be error').toBe('error');
      expect(rules['no-warning-comments'], 'no-warning-comments must be configured').toBeDefined();
    });

    it('should not have ESLint overrides that weaken rules on src/ or tests/', () => {
      const eslint = JSON.parse(fs.readFileSync(path.join(rootDir, '.eslintrc.json'), 'utf8'));
      const overrides: Array<{ files: string | string[]; rules?: Record<string, unknown> }> =
        eslint.overrides ?? [];
      const criticalRules = [
        '@typescript-eslint/no-explicit-any',
        '@typescript-eslint/ban-ts-comment',
        'no-console',
        'no-warning-comments',
      ];
      const forbiddenGlobs = ['src/', 'tests/', 'src/**', 'tests/**'];
      overrides.forEach((override) => {
        const files = Array.isArray(override.files) ? override.files : [override.files];
        const targetsSrc = files.some((f) => forbiddenGlobs.some((g) => f.includes(g)));
        if (!targetsSrc) return;
        criticalRules.forEach((rule) => {
          const value = override.rules?.[rule];
          if (value === undefined) return;
          expect(
            String(value),
            `ESLint override weakens "${rule}" for "${files.join(', ')}"`,
          ).not.toMatch(/^(off|warn)$/);
        });
      });
    });

    it('should protect core kit files from unauthorized modification', async () => {
      if (pkg.name === 'ai-developer-kit') return;

      const { execSync } = await import('node:child_process');
      let changedFiles = '';
      try {
        changedFiles = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
      } catch (e) {
        return;
      }

      const paths = changedFiles
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim().slice(2).trim());

      const protectedPaths = [
        '.integrity-suite/docs/prompt.md',
        '.integrity-suite/docs/workflow.md',
        '.integrity-suite/scripts/',
        'tests/meta/integrity-suite.test.ts',
      ];

      paths.forEach((p) => {
        const isProtected = protectedPaths.some((prot) => p === prot || p.startsWith(prot));
        expect(
          isProtected,
          `Kit protection: unauthorized modification attempt on protected core file: ${p}`,
        ).toBe(false);
      });
    });
  });

  describe('Level 3: TypeScript Strictness & Config', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));

    it('should have strict mode and implicitAny disabled in tsconfig.json', () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should forbid unsafe tsconfig relaxations', () => {
      expect(tsconfig.compilerOptions.allowJs, 'allowJs must not be enabled').not.toBe(true);
      expect(tsconfig.compilerOptions.checkJs, 'checkJs must not be enabled').not.toBe(true);
      expect(tsconfig.compilerOptions.noEmitOnError, 'noEmitOnError must be true').toBe(true);
    });

    it('should have noUnusedLocals and noUnusedParameters enabled in tsconfig', () => {
      expect(tsconfig.compilerOptions.noUnusedLocals, 'noUnusedLocals must be true').toBe(true);
      expect(tsconfig.compilerOptions.noUnusedParameters, 'noUnusedParameters must be true').toBe(
        true,
      );
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
        expect(content, `File ${file} contains @ts-expect-error`).not.toContain('@ts-expect-error');
      });
    });

    it('should not have exports in src/ that are never imported anywhere', () => {
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

        const namedExports = [
          ...fileData.content.matchAll(
            /^export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/gm,
          ),
        ].map((m) => m[1]);

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
  });

  describe('Level 4: Hygiene & Global Standards', () => {
    it('should forbid em dash in Spanish source code comments', () => {
      allSourceFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g;
        const comments = content.match(commentRegex) ?? [];
        comments.forEach((comment) => {
          expect(comment, `Em dash (—) found in comment in ${file}: "${comment}"`).not.toContain(
            '—',
          );
        });
      });
    });

    it('should enforce test file naming conventions', () => {
      const testFiles = allSourceFiles.filter((f) => f.startsWith(testsDir));
      testFiles.forEach((file) => {
        const basename = path.basename(file);
        const validPattern = /\.(test|spec)\.(ts|tsx)$/;
        expect(basename, `Test file ${file} does not follow naming convention`).toMatch(
          validPattern,
        );
      });
    });

    it('should forbid debugger statements in source', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `debugger statement in ${file}`).not.toMatch(/\bdebugger\b/);
      });
    });

    it('should not use filesystem access in unit tests', () => {
      const unitDir = path.join(rootDir, 'tests', 'unit') + path.sep;
      allSourceFiles
        .filter((f) => f.startsWith(unitDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(content, `fs access in unit test ${file}`).not.toMatch(/from ['"]node:fs['"]/);
          expect(content, `fs access in unit test ${file}`).not.toMatch(
            /require\(['"]node:fs['"]\)/,
          );
          expect(content, `fs access in unit test ${file}`).not.toMatch(/from ['"]fs['"]/);
          expect(content, `fs access in unit test ${file}`).not.toMatch(/require\(['"]fs['"]\)/);
        });
    });

    it('should enforce English-only comments (ASCII)', () => {
      allSourceFiles.forEach((file) => {
        if (file.endsWith('.json') || file.endsWith('.md')) return;
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

    it('should forbid print statements in source', () => {
      codeFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (parts.includes('.integrity-suite')) return;
        const content = fs.readFileSync(file, 'utf8');
        const consoleRegex = new RegExp('console\\.(log|debug|info|error|warn)', 'i');
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

    it('should not contain AI reasoning artifacts in comments', () => {
      const suspiciousPatterns = [
        /\/\/\s*(this should|not sure|i think|maybe|perhaps|let me|we need to|should work)/i,
        /\/\/\s*added by/i,
        /\/\/\s*generated by/i,
        /\/\/\s*note:/i,
      ];
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
        const comments = content.match(commentRegex) ?? [];
        comments.forEach((comment) => {
          suspiciousPatterns.forEach((pattern) => {
            expect(comment, `Suspicious AI artifact comment in ${file}: "${comment}"`).not.toMatch(
              pattern,
            );
          });
        });
      });
    });

    it('should not have trivially passing dummy assertions in test files', () => {
      const testFiles = allSourceFiles.filter(
        (f) => f.startsWith(testsDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
      );
      testFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const trivialPatterns = [
          /expect\(true\)\.toBe\(true\)/,
          /expect\(1\)\.toBe\(1\)/,
          /expect\(false\)\.toBe\(false\)/,
        ];
        trivialPatterns.forEach((pattern) => {
          expect(content, `Trivial dummy assertion in ${file}`).not.toMatch(pattern);
        });
      });
    });

    it('should not have images without alt attribute in HTML/JSX/TSX files', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        // <img without alt= anywhere after it before closing >
        expect(content, `Image without alt attribute in ${file}`).not.toMatch(
          /<img(?![^>]*\balt\s*=)[^>]*>/i,
        );
      });
    });

    it('should not have buttons without accessible text in HTML/JSX/TSX files', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        // <button> with no content AND no aria-label
        const emptyButtons = content.match(/<button(?![^>]*aria-label)[^>]*>\s*<\/button>/gi) ?? [];
        expect(emptyButtons.length, `Button without accessible text or aria-label in ${file}`).toBe(
          0,
        );
      });
    });

    it('should not have form inputs without associated labels', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        // Input without id AND without aria-label AND without aria-labelledby
        expect(content, `Input without label/aria-label in ${file}`).not.toMatch(
          /<input(?![^>]*(?:aria-label|aria-labelledby|id\s*=))[^>]*>/i,
        );
      });
    });

    it('should have a <main> landmark element in HTML pages', () => {
      const htmlFiles = allSourceFiles.filter((f) => f.endsWith('.html'));
      htmlFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Missing <main> landmark in ${file}`).toMatch(/<main[\s>]/i);
      });
    });

    it('should not use known low-contrast color pairs in CSS/HTML', () => {
      const styleFiles = allSourceFiles.filter((f) =>
        ['.css', '.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      // Known problematic: light gray text (#ccc, #999, #aaa) - likely insufficient on white
      const lowContrastPattern = /(color\s*:\s*#(?:ccc|999|aaa|bbb|ddd)|color\s*:\s*lightgr[ae]y)/i;
      styleFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Potential low-contrast color in ${file}`).not.toMatch(lowContrastPattern);
      });
    });

    it('should not use positive tabIndex values in HTML/JSX/TSX files', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Positive tabIndex in ${file}: disrupts keyboard navigation order`,
        ).not.toMatch(/tabIndex\s*=\s*['"]\s*[1-9]/i);
      });
    });

    it('should not use non-semantic elements as interactive controls', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `<div> or <span> with onClick in ${file}: use <button> or <a> instead`,
        ).not.toMatch(/<(?:div|span)[^>]*onClick/i);
      });
    });

    it('should have lang attribute on <html> element', () => {
      const htmlFiles = allSourceFiles.filter((f) => f.endsWith('.html'));
      htmlFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Missing lang attribute on <html> in ${file}`).toMatch(
          /<html[^>]+lang\s*=/i,
        );
      });
    });

    it('buttons and anchors should have pointer cursor', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const elements = content.match(/<(button|a)[^>]*>/gi) ?? [];
        elements.forEach((el) => {
          if (hasTailwind) {
            expect(el, `Missing cursor-pointer in ${file}: ${el}`).toMatch(
              /class\s*=\s*["'][^"']*cursor-pointer/,
            );
          } else {
            expect(el, `Missing cursor:pointer in ${file}: ${el}`).toMatch(
              /style\s*=\s*["'][^"']*cursor\s*:\s*pointer/,
            );
          }
        });
      });
    });

    it('button content should not be selectable', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const buttons = content.match(/<button[^>]*>/gi) ?? [];
        buttons.forEach((btn) => {
          if (hasTailwind) {
            expect(btn, `Missing select-none in ${file}: ${btn}`).toMatch(
              /class\s*=\s*["'][^"']*select-none/,
            );
          } else {
            expect(btn, `Missing user-select:none in ${file}: ${btn}`).toMatch(
              /style\s*=\s*["'][^"']*user-select\s*:\s*none/,
            );
          }
        });
      });
    });

    it('external links should use target _blank with rel noopener noreferrer', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const externalLinks = content.match(/<a[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi) ?? [];
        externalLinks.forEach((link) => {
          expect(link, `External link without target="_blank" in ${file}`).toMatch(
            /target\s*=\s*["']_blank["']/,
          );
          expect(link, `External link missing rel="noopener noreferrer" in ${file}`).toMatch(
            /rel\s*=\s*["'][^"']*(noopener|noreferrer)/,
          );
        });
      });
    });

    it('should not have images without loading="lazy"', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Image without loading="lazy" in ${file}`).not.toMatch(
          /<img(?![^>]*\bloading\s*=\s*["']lazy["'])[^>]*>/i,
        );
      });
    });

    it('should not have buttons without type attribute', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Button without type attribute in ${file}`).not.toMatch(
          /<button(?![^>]*\btype\s*=)[^>]*>/i,
        );
      });
    });

    it('should not have text inputs without autocomplete attribute', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Text input without autocomplete in ${file}`).not.toMatch(
          /<input[^>]*type\s*=\s*["']text["'](?![^>]*\bautocomplete\s*=)[^>]*>/i,
        );
      });
    });

    it('should not have anchors with href="#"', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Anchor with href="#" found in ${file}`).not.toMatch(
          /<a[^>]*href\s*=\s*["']#["'][^>]*>/i,
        );
      });
    });

    it('should not have anchors inside buttons', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Anchor inside button found in ${file}`).not.toMatch(
          /<button[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/button>/i,
        );
      });
    });

    it('should not have images without width and height attributes', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Image missing width or height in ${file}`).not.toMatch(
          /<img(?![^>]*\bwidth\s*=)(?![^>]*\bheight\s*=)[^>]*>/i,
        );
      });
    });

    it('should not have inputs without name attribute inside forms', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const inputsInForms =
          content.match(/<form[^>]*>[\s\S]*?<input[^>]*>[\s\S]*?<\/form>/gi) ?? [];
        inputsInForms.forEach((inputBlock) => {
          expect(inputBlock, `Input without name attribute inside form in ${file}`).not.toMatch(
            /<input(?![^>]*\bname\s*=)[^>]*>/i,
          );
        });
      });
    });

    it('should not have images with empty alt without role="presentation"', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Image with empty alt but not marked decorative in ${file}`).not.toMatch(
          /<img[^>]*alt\s*=\s*["']\s*["'](?![^>]*role\s*=\s*["']presentation["'])[^>]*>/i,
        );
      });
    });

    it('should not have img or button with onClick without tabIndex (keyboard accessibility)', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const clickableElements = content.match(/<(img|button)[^>]*onClick\s*=\s*[^>]+>/gi) ?? [];
        clickableElements.forEach((el) => {
          expect(el, `Clickable element not keyboard-focusable in ${file}: ${el}`).toMatch(
            /\btabIndex\s*=/i,
          );
        });
      });
    });

    it('labels with for attribute should reference an existing input id', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const labels = content.match(/<label[^>]*for\s*=\s*["'][^"']+["'][^>]*>/gi) ?? [];
        labels.forEach((label) => {
          const match = label.match(/for\s*=\s*["']([^"']+)["']/i);
          if (!match) return;
          const id = match[1];
          expect(content, `Label for="${id}" without matching input id in ${file}`).toMatch(
            new RegExp(`<input[^>]*id=["']${id}["']`, 'i'),
          );
        });
      });
    });

    it('button elements should not redundantly declare role="button"', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Button with redundant role="button" in ${file}`).not.toMatch(
          /<button[^>]*role\s*=\s*["']button["'][^>]*>/i,
        );
      });
    });

    it('clickable elements should support keyboard interaction', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const clickable = content.match(/<(div|span|img)[^>]*onClick\s*=\s*[^>]+>/gi) ?? [];
        clickable.forEach((el) => {
          expect(el, `Clickable element without keyboard handler in ${file}`).toMatch(
            /onKey(Down|Up|Press)\s*=/i,
          );
        });
      });
    });

    it('iframes should have title attribute for accessibility', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Iframe without title attribute in ${file}`).not.toMatch(
          /<iframe(?![^>]*\btitle\s*=)[^>]*>/i,
        );
      });
    });

    it('tables should include table headers (th)', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const tables = content.match(/<table[^>]*>[\s\S]*?<\/table>/gi) ?? [];
        tables.forEach((table) => {
          expect(table, `Table without <th> headers in ${file}`).toMatch(/<th[^>]*>/i);
        });
      });
    });

    it('required inputs should include aria-required', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Required input missing aria-required in ${file}`).not.toMatch(
          /<input[^>]*required(?![^>]*aria-required\s*=\s*["']true["'])[^>]*>/i,
        );
      });
    });

    it('aria-label attributes should not be empty', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Empty aria-label found in ${file}`).not.toMatch(
          /aria-label\s*=\s*["']\s*["']/i,
        );
      });
    });

    it('interactive elements should not have negative tabIndex', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Interactive element with negative tabIndex in ${file}`).not.toMatch(
          /<(button|a|input|select|textarea)[^>]*tabIndex\s*=\s*["']?-1["']?/i,
        );
      });
    });

    it('elements should not use invalid aria roles', () => {
      const validRoles = [
        'button',
        'navigation',
        'main',
        'banner',
        'contentinfo',
        'dialog',
        'alert',
        'tab',
        'tabpanel',
        'menu',
        'menuitem',
        'link',
        'presentation',
        'list',
        'listitem',
        'heading',
        'checkbox',
        'radio',
        'switch',
        'slider',
        'progressbar',
        'spinbutton',
        'combobox',
        'option',
        'grid',
        'gridcell',
        'row',
        'rowgroup',
        'columnheader',
        'rowheader',
        'tree',
        'treegrid',
        'treeitem',
        'tooltip',
        'toolbar',
        'status',
        'log',
        'math',
        'feed',
        'article',
        'figure',
        'document',
        'application',
        'separator',
        'scrollbar',
        'none',
        'cell',
        'table',
        'alertdialog',
        'menubar',
        'menuitemcheckbox',
        'menuitemradio',
        'tablist',
        'img',
        'search',
        'form',
        'region',
        'group',
        'complementary',
      ];
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const roles = content.match(/role\s*=\s*["'][^"']+["']/gi) ?? [];
        roles.forEach((roleAttr) => {
          const role = roleAttr.match(/["']([^"']+)["']/)?.[1];
          if (!role) return;
          const isValidRole = validRoles.includes(role);
          expect(isValidRole, `Possibly invalid aria role "${role}" in ${file}`).toBe(true);
        });
      });
    });

    it('elements with role="button" must be focusable', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const roleButtons = content.match(/<[^>]*role\s*=\s*["']button["'][^>]*>/gi) ?? [];
        roleButtons.forEach((el) => {
          expect(el, `role="button" element not focusable in ${file}`).toMatch(
            /tabIndex\s*=\s*["']?0["']?/i,
          );
        });
      });
    });

    it('non-anchor elements should not have href attributes', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Non-anchor element with href found in ${file}`).not.toMatch(
          /<(div|span)[^>]*href\s*=/i,
        );
      });
    });

    it('textarea elements should have accessible labels', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Textarea without label or aria-label in ${file}`).not.toMatch(
          /<textarea(?![^>]*(aria-label|aria-labelledby|id\s*=))[^>]*>/i,
        );
      });
    });
  });

  describe('Level 5: Architecture & Security', () => {
    it('should have a .env.example documenting required variables', () => {
      if (fs.existsSync(path.join(rootDir, '.env'))) {
        expect(
          fs.existsSync(path.join(rootDir, '.env.example')),
          '.env.example is missing: required env vars must be documented',
        ).toBe(true);
      }
    });

    it('should forbid process.exit() in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(content, `process.exit() in ${file}`).not.toMatch(/process\.exit\s*\(/);
        });
    });

    it('should forbid wildcard or unbounded dependency ranges', () => {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.entries(allDeps || {}).forEach(([name, version]) => {
        expect(version as string, `Dependency ${name} has a wildcard range`).not.toBe('*');
        expect(version as string, `Dependency ${name} has unbounded range`).not.toMatch(/^>=[^,]/);
      });
    });

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

    it('should limit file size to 300 lines in src/', () => {
      const srcDir = path.join(rootDir, 'src');
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

    it('should not have functions with more than 4 parameters in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          // Matches function declarations and arrow functions with 5+ params
          const manyParamsPattern =
            /(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()\s*[^)]*,[^)]*,[^)]*,[^)]*,[^)]/;
          expect(
            content,
            `Function with 5+ parameters in ${file}: consider a config object`,
          ).not.toMatch(manyParamsPattern);
        });
    });

    it('should ignore .env files in git', () => {
      const gitignorePath = path.join(rootDir, '.gitignore');
      expect(fs.existsSync(gitignorePath), '.gitignore is missing').toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content, '.gitignore must exclude .env').toMatch(/^\.env$/m);
    });

    it('should detect potential hardcoded secrets', () => {
      const keys = [
        'api[_-]?key',
        'secret[_-]?key',
        'password',
        'token',
        'private[_-]?key',
        'auth[_-]?key',
        'credential',
      ];
      // Point 4: Enhanced regex to detect more variants of hardcoded secrets
      const patterns = keys.map(
        (key) =>
          new RegExp(
            `(['"\`]?${key}['"\`]?)\\s*[:=]\\s*['"\`][\\w\\-/+=]{8,}['"\`]|process\\.env\\.[\\w_]+\\s*\\|\\|\\s*['"\`][\\w\\-/+=]{8,}['"\`]`,
            'i',
          ),
      );

      allSourceFiles.forEach((file) => {
        const base = path.basename(file);
        if (base === '.env' || file.endsWith('.md')) return;

        const content = fs.readFileSync(file, 'utf8');
        patterns.forEach((pattern) => {
          expect(content, `Potential hardcoded secret in ${file}`).not.toMatch(pattern);
        });

        // Point 4: Detect JWT-like strings (header.payload.signature)
        const jwtPattern = /ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/;
        expect(content, `Potential JWT token found in ${file}`).not.toMatch(jwtPattern);
      });
    });

    it('should not have classes with more than 10 public methods (SRP violation)', () => {
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

    it('should not instantiate concrete classes inside business logic functions in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      // Pattern: new Something() inside a function body (not at module level)
      // We look for function bodies containing "new" for non-built-in types
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
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const matches = [...content.matchAll(pattern)];
          expect(
            matches.length,
            `Direct instantiation of "${matches[0]?.[1]}" inside function body in ${file}: prefer dependency injection`,
          ).toBe(0);
        });
    });

    it('should not use wildcard re-exports (export * from) in src/', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Wildcard re-export in ${file}: use named exports to respect Interface Segregation`,
        ).not.toMatch(/^export\s+\*\s+from/m);
      });
    });

    it('should ensure all tests are cross-platform (Meta-test)', () => {
      allSourceFiles.forEach((file) => {
        const parts = file.split(path.sep);
        if (!parts.includes('tests')) return;
        const metaTestPath = path.join(rootDir, 'tests', 'meta', 'integrity-suite.test.ts');
        if (file === metaTestPath) return;

        const content = fs
          .readFileSync(file, 'utf8')
          .replace(/import\s+.*from\s+['"].*['"]/g, '')
          .replace(/https?:\/\/[^\s'"]+/g, '');

        // Point 5: Refined slash detection to avoid false positives in strings like './src/index'
        // Only flag if a slash is used inside an .includes() or .match() that looks like a path check
        const hardcodedSlashPattern = /\.(includes|match)\(['"][^'"]*[/\\][^'"]*['"]\)/;
        expect(
          content.match(hardcodedSlashPattern),
          `Hardcoded slash in test ${file}: use path.join or path.sep for cross-platform compatibility`,
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

    it('should have at least one non-dummy test file per source module', () => {
      const srcFiles = getFiles(path.join(rootDir, 'src')).filter(
        (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'),
      );

      const testFiles = allSourceFiles.filter(
        (f) => f.startsWith(testsDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
      );

      srcFiles.forEach((srcFile) => {
        const moduleName = path.basename(srcFile, path.extname(srcFile));
        const relPath = path.relative(rootDir, srcFile).replace(/\\/g, '/');

        // Must import from this module AND have at least one real assertion
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

    it('should configure 100% test coverage threshold in vitest.config.ts', () => {
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

    it('should configure vitest timeouts', () => {
      const vitestConfigPath = path.join(rootDir, 'vitest.config.ts');
      expect(fs.existsSync(vitestConfigPath), 'vitest.config.ts does not exist').toBe(true);

      const content = fs.readFileSync(vitestConfigPath, 'utf8');
      expect(content, 'vitest.config.ts missing testTimeout').toContain('testTimeout:');
      expect(content, 'vitest.config.ts missing hookTimeout').toContain('hookTimeout:');
    });

    it('should have a src/ directory as the coverage target', () => {
      expect(
        fs.existsSync(path.join(rootDir, 'src')),
        'src/ directory is missing: coverage target does not exist',
      ).toBe(true);
    });

    it('should not have coverage exclusions in vitest.config.ts', () => {
      const content = fs.readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8');
      // Point 1: Robust extraction of coverage block to avoid false negatives
      const coverageBlockMatch = content.match(/coverage:\s*\{([\s\S]*?)(\n\s*\},|\n\s*\})/m);
      const coverageBlock = coverageBlockMatch ? coverageBlockMatch[1] : '';
      expect(
        coverageBlock,
        'vitest.config.ts coverage block must not have an exclude list',
      ).not.toMatch(/\bexclude\s*:/);
    });

    it('should enforce test coverage flag in package.json scripts', () => {
      expect(pkg.scripts['test:unit']).toContain('--coverage');
    });

    it('should not have bootstrap files remaining when real functionality is present', () => {
      const srcDir = path.join(rootDir, 'src');
      const srcFiles = getFiles(srcDir).filter((f) => /\.(ts|tsx)$/.test(f));
      const hasRealSrc = srcFiles.some((f) => path.basename(f) !== 'index.ts');

      const bootstrapTests = [path.join(rootDir, 'tests', 'e2e', 'dummy.spec.ts')];

      // If we have real code files in src/, we shouldn't have dummy e2e tests
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

      // If index.ts has been fundamentally changed (not just dummyping),
      // the agent can decide to keep it or rename it.
      // But the e2e dummy.spec.ts is the clearest "REMOVEME" marker.
    });
  });

  describe('Level 7: Dependency Hygiene', () => {
    it('should not have dependencies that belong in devDependencies', () => {
      const devOnlyPackages = ['vitest', 'eslint', 'prettier', 'typescript', 'husky'];
      const prodDeps = Object.keys(pkg.dependencies || {});
      devOnlyPackages.forEach((dep) => {
        expect(prodDeps, `${dep} should be in devDependencies, not dependencies`).not.toContain(
          dep,
        );
      });
    });

    it('should not have duplicate packages across dependencies and devDependencies', () => {
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      const duplicates = deps.filter((d) => devDeps.includes(d));
      expect(duplicates, `Duplicate packages: ${duplicates.join(', ')}`).toHaveLength(0);
    });

    it('should have packageManager field pinned to exact version and match installed version', async () => {
      const { execSync } = await import('node:child_process');
      expect(pkg.packageManager, 'packageManager field is missing').toBeDefined();
      expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);

      // Point 11: Verify installed pnpm version matches packageManager
      const [, expectedVersion] = pkg.packageManager.split('@');
      try {
        const installedVersion = execSync('pnpm --version').toString().trim();
        expect(
          installedVersion,
          `Installed pnpm version (${installedVersion}) does not match packageManager (${expectedVersion})`,
        ).toBe(expectedVersion);
      } catch (e) {
        // Skip if pnpm is not in path (likely CI environment without pnpm)
      }
    });
  });

  describe('Level 8: Dependency Security', () => {
    it('should have audit script with no severity bypass flags', () => {
      const auditScript = pkg.scripts['audit'];
      expect(auditScript, 'audit script is missing').toBeDefined();
      expect(auditScript).not.toContain('--audit-level=critical');
      expect(auditScript).not.toContain('--audit-level=high');
      expect(auditScript).not.toContain('--ignore-registry-errors');
    });

    it('should run audit before tests in validate-project', () => {
      const script = pkg.scripts['validate-project'];
      const auditIdx = script.indexOf('pnpm audit');
      const testIdx = script.indexOf('pnpm test');
      expect(auditIdx, 'audit must run before tests').toBeLessThan(testIdx);
    });

    it('should have a lockfile that is not outdated relative to package.json', () => {
      const lockPath = path.join(rootDir, 'pnpm-lock.yaml');
      const lock = fs.readFileSync(lockPath, 'utf8');
      const allDeclaredDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      Object.keys(allDeclaredDeps).forEach((dep) => {
        expect(lock, `${dep} is in package.json but missing from lockfile`).toContain(dep);
      });
    });

    it('should not use historically vulnerable versions of critical packages', () => {
      const lock = fs.readFileSync(path.join(rootDir, 'pnpm-lock.yaml'), 'utf8');

      const knownVulnerable: Array<{ pkg: string; bannedRange: RegExp; reason: string }> = [
        {
          pkg: 'lodash',
          bannedRange: /lodash@[34]\.\d+\.\d+(?!\d)/,
          reason: 'lodash <4.17.21 has prototype pollution (CVE-2021-23337)',
        },
        {
          pkg: 'minimist',
          bannedRange: /minimist@0\.\d+\.\d+/,
          reason: 'minimist <1.2.6 has prototype pollution (CVE-2021-44906)',
        },
        {
          pkg: 'semver',
          bannedRange: /semver@[1-6]\.\d+\.\d+/,
          reason: 'semver <7.5.2 has ReDoS vulnerability (CVE-2022-25883)',
        },
      ];

      knownVulnerable.forEach(({ pkg: name, bannedRange, reason }) => {
        expect(lock, `Vulnerable version of ${name} detected: ${reason}`).not.toMatch(bannedRange);
      });
    });

    it('should not have direct dependencies pinned below known-safe minimums', () => {
      const safeMinimumsForDirectDeps: Record<string, string> = {};
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.entries(safeMinimumsForDirectDeps).forEach(([name, minVersion]) => {
        if (!allDeps[name]) return;
        const declared = (allDeps[name] as string).replace(/^[\^~]/, '');
        const [dMaj, dMin, dPatch] = declared.split('.').map(Number);
        const [mMaj, mMin, mPatch] = minVersion.split('.').map(Number);
        const isOk =
          dMaj > mMaj ||
          (dMaj === mMaj && dMin > mMin) ||
          (dMaj === mMaj && dMin === mMin && dPatch >= mPatch);
        expect(isOk, `${name}@${declared} is below safe minimum ${minVersion}`).toBe(true);
      });
    });
  });
});
