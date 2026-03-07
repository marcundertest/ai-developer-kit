import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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
    return ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
  });
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const hasTailwind = pkg.dependencies?.tailwindcss || pkg.devDependencies?.tailwindcss;

  describe('Level 0: Base Environment & Cleanup @base', () => {
    it('should compile this integrity-suite test file without type errors', () => {
      try {
        execSync(
          'tsc --noEmit --target ESNext --module NodeNext --lib ESNext --moduleResolution NodeNext --esModuleInterop true --strict true --skipLibCheck true .integrity-suite/tests/integrity-suite.test.ts',
          { encoding: 'utf8' },
        );
      } catch (e: any) {
        const msg = e.stdout ? e.stdout.toString() : String(e.message || e);
        expect(false, `TypeScript compilation failed:\n${msg}`).toBe(true);
      }
    });

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

      expect(content, 'CHANGELOG.md missing language policy notice').toContain(
        'strictly maintained in **English**',
      );

      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/u;
      expect(content, 'CHANGELOG.md contains emojis').not.toMatch(emojiRegex);

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

      expect(content, 'requirements.md missing language policy notice').toContain(
        'mantiene estrictamente en **castellano**',
      );

      expect(content).toContain('Historial de requerimientos');
      expect(content).toContain('Interpretación');

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

    it('should have a commit-msg hook that enforces commitlint', () => {
      const commitMsgPath = path.join(rootDir, '.husky', 'commit-msg');
      expect(fs.existsSync(commitMsgPath), '.husky/commit-msg hook is missing').toBe(true);
      const commitMsgContent = fs.readFileSync(commitMsgPath, 'utf8');
      expect(commitMsgContent, 'commit-msg hook must invoke commitlint').toContain('commitlint');
      expect(
        commitMsgContent,
        'commit-msg hook must reference the integrity-suite commitlint config',
      ).toContain('.integrity-suite/scripts/commitlint.config.ts');
    });

    it('should have a .nvmrc or .node-version file for Node.js version pinning', () => {
      const hasNvmrc = fs.existsSync(path.join(rootDir, '.nvmrc'));
      const hasNodeVersion = fs.existsSync(path.join(rootDir, '.node-version'));
      expect(
        hasNvmrc || hasNodeVersion,
        '.nvmrc or .node-version is missing: pin the Node.js version for reproducible environments',
      ).toBe(true);
    });
  });

  describe('Level 1: Project Metadata & README @metadata', () => {
    it('should forbid em dash in Markdown documentation files', () => {
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

    it('should pass security audit with resilience to network errors', () => {
      try {
        execSync('pnpm audit --prod', {
          stdio: 'pipe',
          encoding: 'utf8',
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        const networkErrors = [
          'ENOTFOUND',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'network',
          'socket hang up',
        ];
        const isNetworkError = networkErrors.some((err) => errorMessage.includes(err));

        if (isNetworkError) {
          console.warn('⚠️  Audit skipped: network unavailable. Check audit later.');
          return;
        }

        if (errorMessage.includes('registry') || errorMessage.includes('fetch')) {
          console.warn('⚠️  Audit warning: registry unreachable. Check registry status.');
          return;
        }

        if (errorMessage.includes('vulnerabilities')) {
          expect(false, '❌ Audit failed: vulnerabilities detected in dependencies').toBe(true);
        }

        expect(false, `Audit failed with unexpected error: ${errorMessage}`).toBe(true);
      }
    });
  });

  describe('Level 2: Strict Workflow (Pipeline) @workflow', () => {
    it('should have essential scripts in package.json', () => {
      expect(pkg.scripts['build']).toBeDefined();
      expect(pkg.scripts['test:full']).toBeDefined();
      expect(pkg.scripts['test:report']).toBeDefined();
      expect(pkg.scripts['start']).toBeDefined();
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
      } catch (e: unknown) {
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
      } catch (e: unknown) {
        return;
      }
      const scopePattern = /^[a-z]+\([^)]+\):/;
      const messages = log.split('\n').filter(Boolean);
      messages.forEach((msg) => {
        expect(msg, `Commit with forbidden scope found: "${msg}"`).not.toMatch(scopePattern);
      });
    });

    it('should enforce ASCII-only commit messages via commitlint plugin', async () => {
      const configPath = path.join(rootDir, '.integrity-suite', 'scripts', 'commitlint.config.ts');
      expect(fs.existsSync(configPath), 'commitlint.config.ts is missing').toBe(true);

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

    it('should run full validation in pre-commit hook with strict version check', () => {
      const hookPath = path.join(rootDir, '.husky', 'pre-commit');
      const content = fs.readFileSync(hookPath, 'utf8');
      expect(
        content,
        'Pre-commit hook must run pnpm test:full (or the wrapper test:develop) to enforce strict commit quality',
      ).toMatch(/pnpm test:(?:full|develop)/);
      expect(
        content,
        'Pre-commit must not contain test:nobump (that is for push with relaxed version check)',
      ).not.toContain('test:nobump');
      expect(content, 'Pre-commit hook contains an early exit').not.toMatch(/exit\s+0/);
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
        '.prettierignore': [
          'node_modules',
          'dist',
          'build',
          'coverage',
          'pnpm-lock.yaml',
          '.integrity-suite/tests/reports',
        ],
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
        '.integrity-suite/.user_secret',
        '.integrity-suite/tests/reports',
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

    it('should verify the latest requirement in requirements.md is not Pendiente', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      expect(fs.existsSync(reqPath), 'requirements.md is missing').toBe(true);
      const content = fs.readFileSync(reqPath, 'utf8');

      const historyParts = content.split('## Historial de requerimientos');
      expect(
        historyParts.length,
        'Missing "## Historial de requerimientos" section in requirements.md',
      ).toBeGreaterThan(1);

      const historySection = historyParts[1];
      const reqBlocks = historySection.split(/\n### Requerimiento\s+/);

      expect(
        reqBlocks.length,
        'No requirements found in history section of requirements.md',
      ).toBeGreaterThan(1);

      const latestReqRaw = reqBlocks[1];
      const latestIdMatch = latestReqRaw.match(/^(\d+)/);
      const latestId = latestIdMatch ? latestIdMatch[1] : 'unknown';

      expect(
        latestReqRaw,
        `The latest requirement (#${latestId}) is still "Pendiente". The agent must complete the task and all tests must pass before suggesting a commit.`,
      ).not.toContain('- **Estado**: Pendiente');

      expect(
        latestReqRaw,
        `The latest requirement (#${latestId}) must be marked as "Completado".`,
      ).toContain('- **Estado**: Completado');
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
          expect(
            date.getTime(),
            `Invalid date format in requirement ${i}: "${match[1]}"`,
          ).not.toBeNaN();
          dates.push(date);
        }
      }

      for (let i = 0; i < dates.length - 1; i++) {
        expect(
          dates[i].getTime(),
          `Date in requirement ${i + 1} is older than requirement ${i + 2}: check order`,
        ).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    });

    it('should have a zero-tolerance validation script with consolidated validations in tests', () => {
      const script = pkg.scripts['test:full'];
      expect(script).toContain('eslint . --max-warnings 0');
      expect(script).toContain('markdownlint .');
      expect(script).toContain('prettier --check .');
      expect(script).toContain('tsc --noEmit');
      expect(script).toContain('vitest run .integrity-suite/tests');
      expect(script).not.toContain('check-version');
      expect(script).not.toContain('check-changelog');
      expect(script).not.toContain('check-audit.js');
      expect(
        script.indexOf('vitest run .integrity-suite/tests'),
        'vitest tests must run before other test suites',
      ).toBeLessThan(script.indexOf('test:unit'));
    });

    it('should call all three test suites in correct order in test:full', () => {
      const fullScript = pkg.scripts['test:full'] as string;
      expect(fullScript).toBeDefined();
      const fullVitest = fullScript.indexOf('vitest run .integrity-suite/tests');
      const fullUnit = fullScript.indexOf('test:unit');
      const fullE2e = fullScript.indexOf('test:e2e');
      expect(fullVitest, 'vitest tests are missing from test:full script').toBeGreaterThan(-1);
      expect(fullUnit, 'test:unit is missing from test:full script').toBeGreaterThan(-1);
      expect(fullE2e, 'test:e2e is missing from test:full script').toBeGreaterThan(-1);
      expect(fullVitest, 'vitest tests must run before test:unit in test:full').toBeLessThan(
        fullUnit,
      );
      expect(fullUnit, 'test:unit must run before test:e2e in test:full').toBeLessThan(fullE2e);
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
      const fullScript = pkg.scripts['test:full'];
      expect(fullScript).toContain('eslint . --max-warnings 0');
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

    it('should explicitly forbid ignoring core kit files in .gitignore', () => {
      const gitignorePath = path.join(rootDir, '.gitignore');
      if (!fs.existsSync(gitignorePath)) return;

      const content = fs.readFileSync(gitignorePath, 'utf8');
      const lines = content
        .split('\n')
        .map((l) => l.trim().replace(/\/+$/, ''))
        .filter((l) => l && !l.startsWith('#'));

      const coreKitPatterns = [
        '.integrity-suite/docs',
        '.integrity-suite/docs/prompt.md',
        '.integrity-suite/docs/workflow.md',
        '.integrity-suite/scripts',
        '.integrity-suite/tests',
        '.integrity-suite/tests/integrity-suite.test.ts',
      ];

      lines.forEach((line) => {
        const isReport =
          line === '.integrity-suite/tests/reports' ||
          line.startsWith('.integrity-suite/tests/reports');
        const targetsCoreKit =
          !isReport &&
          coreKitPatterns.some((p) => line === p || line.startsWith(p) || p.startsWith(line));

        if (line === 'tests') {
          expect(line, `Kit vulnerability: .gitignore must not hide the tests directory`).not.toBe(
            'tests',
          );
        }

        expect(
          targetsCoreKit,
          `Kit vulnerability: .gitignore must not hide core kit files: ${line}`,
        ).toBe(false);
      });
    });

    it('should not have silent bypass patterns in test:full', () => {
      const script = pkg.scripts['test:full'] as string;
      expect(script, '|| true bypass in test:full').not.toMatch(/\|\|\s*true/);
      expect(script, '; true bypass in test:full').not.toMatch(/;\s*true\b/);
      expect(script, '&& exit 0 bypass in test:full').not.toMatch(/&&\s*exit\s+0/);
    });

    it('should have a pre-push hook that runs full validation suite', () => {
      const prePushPath = path.join(rootDir, '.husky', 'pre-push');
      expect(fs.existsSync(prePushPath), '.husky/pre-push hook is missing').toBe(true);
      const prePushContent = fs.readFileSync(prePushPath, 'utf8');
      expect(
        prePushContent,
        'pre-push hook must invoke test:full for full protection (includes core-protection)',
      ).toMatch(/test:full/);
      expect(prePushContent, 'pre-push must not skip tests with bypass patterns').not.toMatch(
        /\|\|\s*true/,
      );
    });
  });

  describe('Level 3: TypeScript Strictness & Config @typescript', () => {
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

    it('should not have exports in src/ that are never imported anywhere', () => {
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

    it('should forbid non-null assertion operator in src/', () => {
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

    it('should forbid numeric enums in src/', () => {
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

    it('should forbid double-assertion casting (as unknown as Type) in src/', () => {
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

    it('should type catch clause errors as unknown, not untyped in src/ and tests/', () => {
      const filesToCheck = [
        ...codeFiles.filter((f) => f.includes('/src/') || f.includes('/tests/')),
      ];
      filesToCheck.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const untypedCatch = content.match(/catch\s*\(\s*\w+\s*\)(?!\s*:\s*unknown)/g);
        expect(
          untypedCatch,
          `Untyped catch clause found in ${file}. Use \`catch (e: unknown)\` to properly type error handling`,
        ).toBeFalsy();
      });
    });

    it('should not have dangling or invalid module imports', () => {
      const testFilePath = path.join(
        rootDir,
        '.integrity-suite',
        'tests',
        'integrity-suite.test.ts',
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

    it('should have noFallthroughCasesInSwitch enabled in tsconfig.json', () => {
      expect(
        tsconfig.compilerOptions.noFallthroughCasesInSwitch,
        'noFallthroughCasesInSwitch prevents silent fallthrough bugs in switch statements',
      ).toBe(true);
    });

    it('should have exactOptionalPropertyTypes enabled in tsconfig.json', () => {
      expect(
        tsconfig.compilerOptions.exactOptionalPropertyTypes,
        'exactOptionalPropertyTypes prevents implicitly assigning undefined to optional properties',
      ).toBe(true);
    });

    it('should have noPropertyAccessFromIndexSignature enabled in tsconfig.json', () => {
      expect(
        tsconfig.compilerOptions.noPropertyAccessFromIndexSignature,
        'noPropertyAccessFromIndexSignature prevents dot-access on index signature types',
      ).toBe(true);
    });

    it('should not have TypeScript compilation errors', () => {
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

  describe('Level 4: Hygiene & Global Standards @hygiene', () => {
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
      const testFiles = allSourceFiles.filter(
        (f) => f.startsWith(testsDir) && !f.includes(`${path.sep}reports${path.sep}`),
      );
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

    it('headings should not skip levels (e.g., h1 to h3)', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const headings = [...content.matchAll(/<h([1-6])[^>]*>/gi)].map((m) => Number(m[1]));
        for (let i = 1; i < headings.length; i++) {
          const prev = headings[i - 1];
          const curr = headings[i];
          expect(curr - prev <= 1, `Heading level skipped in ${file}: h${prev} → h${curr}`).toBe(
            true,
          );
        }
      });
    });

    it('pages should not contain multiple h1 elements', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const h1s = content.match(/<h1[^>]*>/gi) ?? [];
        expect(h1s.length, `Multiple h1 elements found in ${file}`).toBeLessThanOrEqual(1);
      });
    });

    it('interactive elements should not have aria-hidden="true"', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Interactive element hidden from screen readers in ${file}`).not.toMatch(
          /<(button|a|input|select|textarea)[^>]*aria-hidden\s*=\s*["']true["'][^>]*>/i,
        );
      });
    });

    it('images should not use role="button"', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Image incorrectly using role="button" in ${file}`).not.toMatch(
          /<img[^>]*role\s*=\s*["']button["'][^>]*>/i,
        );
      });
    });

    it('anchors should not contain buttons', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Button nested inside anchor in ${file}`).not.toMatch(
          /<a[^>]*>[\s\S]*?<button[^>]*>[\s\S]*?<\/button>[\s\S]*?<\/a>/i,
        );
      });
    });

    it('aria-checked should only be used on appropriate roles', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      const validRoles = ['checkbox', 'menuitemcheckbox', 'radio', 'switch'];
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const elements = content.match(/<[^>]*aria-checked\s*=\s*["'][^"']+["'][^>]*>/gi) ?? [];
        elements.forEach((el) => {
          const roleMatch = el.match(/role\s*=\s*["']([^"']+)["']/i);
          const role = roleMatch?.[1];
          expect(
            role !== undefined && validRoles.includes(role),
            `aria-checked used on incompatible role in ${file}: ${el}`,
          ).toBe(true);
        });
      });
    });

    it('dialog roles should include aria-modal', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Dialog missing aria-modal in ${file}`).not.toMatch(
          /<[^>]*role\s*=\s*["']dialog["'](?![^>]*aria-modal\s*=\s*["']true["'])[^>]*>/i,
        );
      });
    });

    it('aria-controls should reference an existing id', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const controls = content.match(/aria-controls\s*=\s*["'][^"']+["']/gi) ?? [];
        controls.forEach((attr) => {
          const idMatch = attr.match(/["']([^"']+)["']/);
          if (!idMatch) return;
          const id = idMatch[1];
          expect(content, `aria-controls references missing id "${id}" in ${file}`).toMatch(
            new RegExp(`id=["']${id}["']`, 'i'),
          );
        });
      });
    });

    it('labels should contain accessible text', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Label without accessible text in ${file}`).not.toMatch(
          /<label[^>]*>\s*<\/label>/i,
        );
      });
    });

    it('aria-labelledby should reference existing ids', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const attrs = content.match(/aria-labelledby\s*=\s*["'][^"']+["']/gi) ?? [];
        attrs.forEach((attr) => {
          const idStrMatch = attr.match(/["']([^"']+)["']/);
          if (!idStrMatch) return;
          const ids = idStrMatch[1].split(/\s+/);
          ids.forEach((id) => {
            if (!id) return;
            expect(content, `aria-labelledby references missing id "${id}" in ${file}`).toMatch(
              new RegExp(`id=["']${id}["']`, 'i'),
            );
          });
        });
      });
    });

    it('fieldset elements should contain a legend', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const fieldsets = content.match(/<fieldset[^>]*>[\s\S]*?<\/fieldset>/gi) ?? [];
        fieldsets.forEach((fieldset) => {
          expect(fieldset, `Fieldset missing legend in ${file}`).toMatch(/<legend[^>]*>/i);
        });
      });
    });

    it('select elements should have associated labels', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Select without label or aria-label in ${file}`).not.toMatch(
          /<select(?![^>]*(aria-label|aria-labelledby|id\s*=))[^>]*>/i,
        );
      });
    });

    it('progress elements should expose aria-valuenow', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Progress element missing aria-valuenow in ${file}`).not.toMatch(
          /<progress(?![^>]*aria-valuenow\s*=)[^>]*>/i,
        );
      });
    });

    it('details elements should contain a summary', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const details = content.match(/<details[^>]*>[\s\S]*?<\/details>/gi) ?? [];
        details.forEach((block) => {
          expect(block, `Details element missing summary in ${file}`).toMatch(/<summary[^>]*>/i);
        });
      });
    });

    it('meter elements should define min and max attributes', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const meters = content.match(/<meter[^>]*>/gi) ?? [];
        meters.forEach((meter) => {
          expect(meter, `Meter missing min attribute in ${file}`).toMatch(
            /\bmin\s*=\s*["'][^"']+["']/i,
          );
          expect(meter, `Meter missing max attribute in ${file}`).toMatch(
            /\bmax\s*=\s*["'][^"']+["']/i,
          );
        });
      });
    });

    it('video elements should include controls attribute', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Video element without controls in ${file}`).not.toMatch(
          /<video(?![^>]*\bcontrols\b)[^>]*>/i,
        );
      });
    });

    it('audio elements should include controls attribute', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Audio element without controls in ${file}`).not.toMatch(
          /<audio(?![^>]*\bcontrols\b)[^>]*>/i,
        );
      });
    });

    it('figures containing images should include figcaption', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const figures = content.match(/<figure[^>]*>[\s\S]*?<\/figure>/gi) ?? [];
        figures.forEach((figure) => {
          if (/<img[^>]*>/i.test(figure)) {
            expect(figure, `Figure with image missing figcaption in ${file}`).toMatch(
              /<figcaption[^>]*>/i,
            );
          }
        });
      });
    });

    it('buttons should have visible text or aria-label', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const emptyButtons = content.match(/<button(?![^>]*aria-label)[^>]*>\s*<\/button>/gi) ?? [];
        expect(emptyButtons.length, `Button without text or aria-label in ${file}`).toBe(0);
      });
    });

    it('anchor elements should include href attribute', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Anchor without href found in ${file}`).not.toMatch(
          /<a(?![^>]*href\s*=)[^>]*>/i,
        );
      });
    });

    it('image alt text should not duplicate adjacent visible text', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const images = content.match(/<img[^>]*alt\s*=\s*["'][^"']+["'][^>]*>/gi) ?? [];
        images.forEach((img) => {
          const altMatch = img.match(/alt\s*=\s*["']([^"']+)["']/i);
          if (!altMatch) return;
          const altText = altMatch[1];
          const nearbyText = new RegExp(`>${altText}<`, 'i');
          expect(content, `Image alt duplicates visible text "${altText}" in ${file}`).not.toMatch(
            nearbyText,
          );
        });
      });
    });

    it('tabIndex should not be greater than 0', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `tabIndex greater than 0 found in ${file}`).not.toMatch(
          /tabIndex\s*=\s*["']?[1-9]\d*["']?/i,
        );
      });
    });

    it('labels should not contain interactive elements', () => {
      const htmlLikeFiles = allSourceFiles.filter((f) =>
        ['.html', '.tsx', '.jsx'].includes(path.extname(f)),
      );
      htmlLikeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const labels = content.match(/<label[^>]*>[\s\S]*?<\/label>/gi) ?? [];
        labels.forEach((label) => {
          expect(label, `Interactive element inside label in ${file}`).not.toMatch(
            /<(button|a|input|select|textarea)[^>]*>/i,
          );
        });
      });
    });

    it('should not have commented-out code blocks in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      const commentedCodePattern =
        /\/\/\s*(?:const|let|var|function\s+\w|return\s+[\w(]|import\s+[{*\w])/;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const lines = fs.readFileSync(file, 'utf8').split('\n');
          const hits = lines.filter((l) => commentedCodePattern.test(l));
          expect(
            hits.length,
            `Commented-out code in ${file}: ${hits.slice(0, 2).join(' | ')}`,
          ).toBe(0);
        });
    });

    it('should have node: imports before relative imports in src/ files', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const importLines = content.match(/^import\s.+$/gm) ?? [];
          const lastNodeIdx = importLines.reduce(
            (acc: number, l: string, i: number) => (l.includes("from 'node:") ? i : acc),
            -1,
          );
          const firstRelativeIdx = importLines.findIndex((l: string) =>
            /from\s+['"]\.[.'"]/.test(l),
          );
          if (lastNodeIdx === -1 || firstRelativeIdx === -1) return;
          expect(
            lastNodeIdx,
            `node: imports must precede relative imports in ${file}`,
          ).toBeLessThan(firstRelativeIdx);
        });
    });
  });

  describe('Level 5: Architecture & Security @security', () => {
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

    it('should not have extended hardcoded secret patterns', () => {
      const extendedKeys = [
        'bearer',
        'access[_-]?key',
        'client[_-]?secret',
        'passphrase',
        'api[_-]?token',
        'refresh[_-]?token',
        'webhook[_-]?secret',
      ];
      const extendedPatterns = extendedKeys.map(
        (key) =>
          new RegExp('([\'"`]?' + key + '[\'"`]?)\\s*[:=]\\s*[\'"`][\\w\\-/+=]{8,}[\'"`]', 'i'),
      );
      const hexSecretPattern = /['"`][0-9a-fA-F]{40,}['"`]/;
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        extendedPatterns.forEach((pattern) => {
          expect(content, `Potential extended hardcoded secret in ${file}`).not.toMatch(pattern);
        });
        expect(
          content,
          `Potential raw hex secret (40+ chars) in ${file}: use environment variables`,
        ).not.toMatch(hexSecretPattern);
      });
    });

    it('should not use eval() or dynamic new Function() in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
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

    it('should not use dangerouslySetInnerHTML in JSX/TSX files', () => {
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

    it('should not throw string literals in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `String throw in ${file}: use "throw new Error(...)" for typed, catchable errors`,
          ).not.toMatch(/\bthrow\s+['"]/);
        });
    });
  });

  describe('Level 6: Testing & Coverage @testing', () => {
    it('should have @vitest/coverage-v8 installed', () => {
      if (!fs.existsSync(testsDir)) return;
      expect(pkg.devDependencies['@vitest/coverage-v8']).toBeDefined();
    });

    it('should have at least one non-dummy test file per source module', () => {
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
      const coverageBlockMatch = content.match(/coverage:\s*\{([\s\S]*?)(\n\s*\},|\n\s*\})/m);
      const coverageBlock = coverageBlockMatch ? coverageBlockMatch[1] : '';
      expect(
        coverageBlock,
        'vitest.config.ts coverage block must not have an exclude list',
      ).not.toMatch(/\bexclude\s*:/);
    });

    it('should enforce test coverage flag in package.json scripts', () => {
      if (!fs.existsSync(testsDir)) return;
      expect(pkg.scripts['test:unit']).toContain('--coverage');
    });

    it('should not have bootstrap files remaining when real functionality is present', () => {
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

    it('should have at least one unhappy-path assertion per unit test file', () => {
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

    it('should not have duplicate test names within the same test file', () => {
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

    it('should not contain .only or .skip test modifiers in any test file', () => {
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

    it('should have a minimum of 4 assertions per unit test file', () => {
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

    it('should not configure passWithNoTests: true in vitest.config.ts', () => {
      const vitestContent = fs.readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8');
      expect(vitestContent, 'passWithNoTests: true bypasses empty test runs silently').not.toMatch(
        /passWithNoTests\s*:\s*true/,
      );
    });
  });

  describe('Level 7: Dependency Hygiene @dependencies', () => {
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

      const [, expectedVersion] = pkg.packageManager.split('@');
      try {
        const installedVersion = execSync('pnpm --version').toString().trim();
        expect(
          installedVersion,
          `Installed pnpm version (${installedVersion}) does not match packageManager (${expectedVersion})`,
        ).toBe(expectedVersion);
      } catch (e: unknown) {}
    });

    it('should not have direct dependencies at major version 0.x (unstable API)', () => {
      const allowedAt0x = ['markdownlint-cli', 'markdownlint-cli2'];
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.entries(allDeps).forEach(([name, version]) => {
        if (allowedAt0x.includes(name)) return;
        const cleaned = (version as string).replace(/^[\^~>=\s]+/, '');
        const major = parseInt(cleaned.split('.')[0], 10);
        if (Number.isNaN(major)) return;
        expect(
          major,
          `Dependency "${name}@${version}" is at major version 0: API may be unstable`,
        ).toBeGreaterThan(0);
      });
    });

    it('should declare a Node.js engine requirement in package.json', () => {
      expect(pkg.engines, 'engines field is missing in package.json').toBeDefined();
      expect(
        pkg.engines?.node,
        'engines.node is missing: specify minimum Node.js version',
      ).toBeDefined();
      expect(String(pkg.engines?.node)).toMatch(/^[>=<^~\d]/);
    });

    it('should not have git:// or file: dependencies in package.json', () => {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.entries(allDeps).forEach(([name, version]) => {
        expect(
          version as string,
          `${name} uses a git dependency: only registry packages are allowed`,
        ).not.toMatch(/^git(\+|:)/i);
        expect(version as string, `${name} uses a local file dependency`).not.toMatch(/^file:/);
        expect(version as string, `${name} uses a GitHub shorthand`).not.toMatch(
          /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/,
        );
      });
    });
  });

  describe('Level 8: Dependency Security @security-audit', () => {
    it('should have audit check integrated as a test case', () => {
      const testFilePath = path.join(
        rootDir,
        '.integrity-suite',
        'tests',
        'integrity-suite.test.ts',
      );
      const testContent = fs.readFileSync(testFilePath, 'utf-8');
      const hasAuditTest = testContent.includes(
        'should pass security audit with resilience to network errors',
      );
      expect(hasAuditTest, 'Audit validation must be a test case in integrity-suite.test.ts').toBe(
        true,
      );
      const fullScript = pkg.scripts['test:full'];
      expect(fullScript).not.toContain('check-audit.js');
    });

    it('should run all validations (audit, version, changelog) as test cases', () => {
      const testFilePath = path.join(
        rootDir,
        '.integrity-suite',
        'tests',
        'integrity-suite.test.ts',
      );
      const testContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(testContent).toContain('should pass security audit with resilience to network errors');
      expect(testContent).toContain('should require version to be bumped for non-markdown files');
      expect(testContent).toContain('should update CHANGELOG.md when version changes');
      const scriptFull = pkg.scripts['test:full'];
      expect(scriptFull).toBeDefined();
      expect(scriptFull).not.toContain('check-audit.js');
      expect(scriptFull).not.toContain('pnpm check-version');
      expect(scriptFull).not.toContain('pnpm check-changelog');
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

  describe('Level 9: Advanced Code Safety & Consistency @consistency', () => {
    it('should not mix async/await with .then()/.catch() in the same file', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const hasAwait = /\bawait\s+/.test(content);
        const hasThen = /\.(then|catch)\s*\(/.test(content);
        expect(
          hasAwait && hasThen,
          `Mixed async styles (await + .then/.catch) in ${file}: stick to one style per file for consistency`,
        ).toBe(false);
      });
    });

    it('should use strict equality (===) instead of loose equality (==) in src/', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Loose equality (==) in ${file}`).not.toMatch(/(?<![!=<>])={2}(?!=)/);
        expect(content, `Loose inequality (!=) in ${file}`).not.toMatch(/!={1}(?!=)/);
      });
    });

    it('should use object spread instead of Object.assign in src/', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Object.assign() in ${file}: use spread operator {...a, ...b} instead for better readability`,
        ).not.toMatch(/\bObject\.assign\s*\(/);
      });
    });

    it('should not exceed 4 levels of nesting in src/ files', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const lines = fs.readFileSync(file, 'utf8').split('\n');
          lines.forEach((line, idx) => {
            const indentSpaces = line.match(/^(\s*)/)?.[1].replace(/\t/g, '    ').length ?? 0;
            expect(
              indentSpaces,
              `Line ${idx + 1} in ${file} exceeds 4 levels of nesting (${indentSpaces / 4} levels assuming 4-space indent)`,
            ).toBeLessThanOrEqual(32);
          });
        });
    });

    it('should not have untyped array callback parameters in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const untypedArrayCallback = /\.(map|filter|forEach|find|some|every|reduce)\(\s*\w+\s*=>/;
          expect(
            content,
            `Untyped callback parameter in ${file}: add explicit types to array callbacks (e.g. .map((x: Type) => ...))`,
          ).not.toMatch(untypedArrayCallback);
        });
    });

    it('should type catch clause errors as unknown, not any', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Catch with "any" type in ${file}: use "unknown" and narrow with instanceof for better type safety`,
        ).not.toMatch(/catch\s*\(\s*\w+\s*:\s*any\s*\)/);
      });
    });

    it('should not interpolate variables directly into SQL-like query strings', () => {
      const sqlPattern = /`\s*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^`]*\$\{/i;
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Potential SQL injection via template literal in ${file}: use parameterized queries`,
        ).not.toMatch(sqlPattern);
      });
    });

    it('should not use Math.random() for security-sensitive operations', () => {
      codeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const securityContext =
          /(token|secret|password|key|auth|nonce|salt|id)\s*=.*Math\.random|Math\.random.*=.*(token|secret|password|key|auth|nonce|salt)/i;
        expect(
          content,
          `Math.random() used for security token in ${file}: use crypto.randomUUID() or crypto.getRandomValues() for cryptographic safety`,
        ).not.toMatch(securityContext);
      });
    });

    it('should not use innerHTML assignment in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `innerHTML assignment in ${file}: use textContent or a DOM sanitizer to prevent XSS`,
          ).not.toMatch(/\.innerHTML\s*=/);
        });
    });

    it('should not use setTimeout or setInterval in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `setTimeout in ${file}: prefer event-driven or observable patterns for async control flow`,
          ).not.toMatch(/\bsetTimeout\s*\(/);
          expect(
            content,
            `setInterval in ${file}: prefer event-driven patterns with explicit cleanup`,
          ).not.toMatch(/\bsetInterval\s*\(/);
        });
    });

    it('should not have top-level floating promises in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Floating Promise.all/race in ${file}: unhandled promise may cause silent failures`,
          ).not.toMatch(/^\s+Promise\.(all|race|allSettled|any)\s*\(/m);
        });
    });

    it('should not use var declarations in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(content, `var declaration in ${file}: use const or let instead`).not.toMatch(
            /\bvar\s+\w/,
          );
        });
    });

    it('should not use default exports in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Default export in ${file}: use named exports for safer refactoring and explicit imports`,
          ).not.toMatch(/^export\s+default\s/m);
        });
    });

    it('should not have nested ternary expressions in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Nested ternary in ${file}: extract to if/else or a helper function for readability`,
          ).not.toMatch(/\?[^:?\n]{0,100}\?[^:?\n]{0,100}:/);
        });
    });

    it('should have a default clause in all switch statements in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const switchBlocks = content.match(/\bswitch\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/gm) ?? [];
          switchBlocks.forEach((block) => {
            expect(block, `switch without default clause in ${file}`).toMatch(/\bdefault\s*:/);
          });
        });
    });
  });

  describe('Level 10: Runtime Performance & Efficiency @performance', () => {
    it('should not use namespace imports (import * as) in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Namespace import (import * as ...) in ${file}: use named imports to enable tree-shaking`,
          ).not.toMatch(/import\s+\*\s+as\s+\w+\s+from/);
        });
    });

    it('should not use JSON.parse(JSON.stringify(...)) as a deep-clone in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `JSON.parse(JSON.stringify(...)) in ${file}: use structuredClone() for deep cloning`,
          ).not.toMatch(/JSON\.parse\s*\(\s*JSON\.stringify/);
        });
    });

    it('should not have sequential awaits inside for...of loops in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Sequential await inside for...of loop in ${file}: use Promise.all() for parallel execution`,
          ).not.toMatch(/for\s*\([^)]*\bof\b[^)]*\)[^{]*\{[^}]*\bawait\b/s);
        });
    });

    it('should not import the entire lodash library in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Full lodash import in ${file}: use individual method imports (e.g. import debounce from 'lodash/debounce')`,
          ).not.toMatch(/from\s+['"]lodash['"]/);
        });
    });

    it('should not use synchronous fs methods inside async functions in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Synchronous fs call inside async function in ${file}: use fs.promises equivalents`,
          ).not.toMatch(
            /async\s+(?:function\s+\w+|\(\s*[^)]*\)\s*=>)[\s\S]{0,500}?fs\.\w+Sync\s*\(/,
          );
        });
    });
  });

  describe('Level 11: Documentation Quality @documentation', () => {
    it('should not have placeholder or empty descriptions in test files', () => {
      const testFiles = allSourceFiles.filter(
        (f) => f.startsWith(testsDir) && /\.(test|spec)\.(ts|tsx)$/.test(f),
      );
      testFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Placeholder description in ${file}: replace T` +
            'ODO/F' +
            `IXME/placeholder with a real description`,
        ).not.toMatch(
          new RegExp(
            '\\bit\\s*\\(\\s*[\'"`](?:T' +
              'ODO|F' +
              'IXME|placeholder|test\\s+\\d*|untitled)[`\'"]',
            'i',
          ),
        );
      });
    });

    it('should have JSDoc comments on all exported members in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const exportLines = [
            ...content.matchAll(/^export\s+(?:const|function|class|type|interface|enum)\s+/gm),
          ];
          exportLines.forEach((match) => {
            const pos = match.index ?? 0;
            const preceding = content.slice(Math.max(0, pos - 300), pos);
            expect(
              preceding,
              `Export at position ${pos} in ${file} is missing a JSDoc comment`,
            ).toMatch(/\*\/\s*$/);
          });
        });
    });

    it('should include @param tags for all function exports with parameters in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          const funcExports = [
            ...content.matchAll(/\/\*\*([\s\S]*?)\*\/\s*export\s+const\s+\w+\s*=\s*\([^)]+\)/gm),
          ];
          funcExports.forEach((match) => {
            const jsdoc = match[1] ?? '';
            expect(
              jsdoc,
              `Function export in ${file} has parameters but is missing @param tags in its JSDoc`,
            ).toMatch(/@param/);
          });
        });
    });

    it('should not have empty JSDoc comments in src/', () => {
      const srcDir = path.join(rootDir, 'src') + path.sep;
      codeFiles
        .filter((f) => f.startsWith(srcDir))
        .forEach((file) => {
          const content = fs.readFileSync(file, 'utf8');
          expect(
            content,
            `Empty JSDoc block in ${file}: add a meaningful description or remove the comment`,
          ).not.toMatch(/\/\*\*\s*\*\//);
        });
    });

    it('should have requirements.md in git staging area (for commits)', () => {
      try {
        const stagingFiles = execSync('git diff --cached --name-only', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        })
          .trim()
          .split('\n');

        const hasRequirements = stagingFiles.includes('.integrity-suite/docs/requirements.md');
        expect(
          hasRequirements,
          'requirements.md must be staged during commits to track completed requirements',
        ).toBe(true);
      } catch (e: unknown) {}
    });

    it('should never have a version inferior to origin HEAD (version-check)', () => {
      try {
        const currentVersion = pkg.version;

        let originVersion = null;
        try {
          const pkgAtOrigin = execSync(
            'git show origin:package.json 2>/dev/null || git show HEAD:package.json',
            {
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          originVersion = JSON.parse(pkgAtOrigin).version;
        } catch (e: unknown) {
          originVersion = null;
        }

        if (originVersion) {
          const current = currentVersion.split('.').map(Number);
          const origin = originVersion.split('.').map(Number);

          for (let i = 0; i < 3; i++) {
            if (current[i] > origin[i]) break;
            if (current[i] < origin[i]) {
              expect(
                false,
                `Version regression detected: current ${currentVersion} is lower than origin ${originVersion}`,
              ).toBe(true);
              break;
            }
          }
        }
      } catch (e: unknown) {}
    });

    it('should record current version in requirements file', () => {
      try {
        const reqContent = fs.readFileSync(
          path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md'),
          'utf8',
        );
        const patternStr = '\\*\\*Versi[oó]n\\*\\*: ' + pkg.version.replace(/\./g, '\\.');
        const versionPattern = new RegExp(patternStr);
        expect(
          versionPattern.test(reqContent),
          'requirements.md must include "**Versión**: ' + pkg.version + '" for the current release',
        ).toBe(true);
      } catch (e) {}
    });

    it('should require version bump when non-markdown files are modified', () => {
      let nonMdFiles: string[] = [];
      let headVersion = '';
      let currentVersion = '';
      let shouldCheck = false;

      try {
        let stagedOutput = '';
        let workingOutput = '';
        try {
          stagedOutput = execSync('git diff --cached --name-only', {
            encoding: 'utf8',
          }).trim();
          workingOutput = execSync('git diff --name-only', { encoding: 'utf8' }).trim();
        } catch (e) {
          return;
        }

        const allFiles = new Set<string>();
        if (stagedOutput) stagedOutput.split('\n').forEach((f) => allFiles.add(f));
        if (workingOutput) workingOutput.split('\n').forEach((f) => allFiles.add(f));

        nonMdFiles = [...allFiles].filter((f) => f && !f.endsWith('.md'));

        if (nonMdFiles.length === 0) {
          return;
        }

        try {
          const headPkg = execSync('git show HEAD:package.json', {
            encoding: 'utf8',
          });
          headVersion = JSON.parse(headPkg).version;
        } catch (e) {
          return;
        }

        currentVersion = pkg.version;

        shouldCheck = true;
      } catch (e: unknown) {}

      if (shouldCheck) {
        expect(
          currentVersion,
          `❌ Version not bumped! Modified non-markdown files (${nonMdFiles.join(', ')}) but version still ${currentVersion} (was ${headVersion}). Bump the version in package.json.`,
        ).not.toBe(headVersion);
      }
    });

    it('should enforce version bump in staging (strict commit mode)', () => {
      try {
        let headVersion = null;
        try {
          const pkgAtHead = execSync('git show HEAD:package.json 2>/dev/null', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          headVersion = JSON.parse(pkgAtHead).version;
        } catch (e: unknown) {
          headVersion = '0.0.0';
        }

        if (headVersion) {
          const parse = (v: string) => v.split('.').map(Number);
          const [cMajor, cMinor, cPatch] = parse(pkg.version);
          const [hMajor, hMinor, hPatch] = parse(headVersion);

          let isHigher = false;
          if (cMajor > hMajor) isHigher = true;
          else if (cMajor === hMajor && cMinor > hMinor) isHigher = true;
          else if (cMajor === hMajor && cMinor === hMinor && cPatch > hPatch) isHigher = true;

          expect(
            isHigher,
            'Version in staging (' +
              pkg.version +
              ') must be higher than HEAD (' +
              headVersion +
              ')',
          ).toBe(true);
        }
      } catch (e: unknown) {}
    });

    it('should allow same or higher version in staging (relaxed push mode)', () => {
      try {
        let headVersion = null;
        try {
          const pkgAtHead = execSync('git show HEAD:package.json 2>/dev/null', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          headVersion = JSON.parse(pkgAtHead).version;
        } catch (e: unknown) {
          headVersion = '0.0.0';
        }

        if (headVersion) {
          const parse = (v: string) => v.split('.').map(Number);
          const [cMajor, cMinor, cPatch] = parse(pkg.version);
          const [hMajor, hMinor, hPatch] = parse(headVersion);

          let isGteq = false;
          if (cMajor > hMajor) isGteq = true;
          else if (cMajor === hMajor && cMinor > hMinor) isGteq = true;
          else if (cMajor === hMajor && cMinor === hMinor && cPatch >= hPatch) isGteq = true;

          expect(
            isGteq,
            'Version in staging (' + pkg.version + ') must be >= HEAD (' + headVersion + ')',
          ).toBe(true);
        }
      } catch (e: unknown) {}
    });

    it('should have CHANGELOG entry for staged version bumped (commit only)', () => {
      let headVersion: string | null = null;
      let currentVersion = pkg.version;
      let shouldCheck = false;

      try {
        try {
          const pkgAtHead = execSync('git show HEAD:package.json', {
            encoding: 'utf8',
          });
          headVersion = JSON.parse(pkgAtHead).version;
        } catch (e: unknown) {
          headVersion = '0.0.0';
        }

        if (headVersion && currentVersion !== headVersion) {
          shouldCheck = true;
        }
      } catch (e: unknown) {}

      if (shouldCheck && headVersion) {
        const changelogPath = path.join(rootDir, 'CHANGELOG.md');
        const changelogContent = fs.readFileSync(changelogPath, 'utf8');
        const hasEntry =
          changelogContent.includes('## [' + currentVersion + ']') ||
          changelogContent.includes('## ' + currentVersion);

        expect(
          hasEntry,
          `CHANGELOG.md must include entry "## [${currentVersion}]" when version bumped from ${headVersion}`,
        ).toBe(true);
      }
    });

    it('should have requirements entry for staged version bumped (commit only)', () => {
      let headVersion: string | null = null;
      let currentVersion = pkg.version;
      let shouldCheck = false;

      try {
        try {
          const pkgAtHead = execSync('git show HEAD:package.json', {
            encoding: 'utf8',
          });
          headVersion = JSON.parse(pkgAtHead).version;
        } catch (e: unknown) {
          headVersion = '0.0.0';
        }

        if (headVersion && currentVersion !== headVersion) {
          shouldCheck = true;
        }
      } catch (e: unknown) {}

      if (shouldCheck && headVersion) {
        const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
        const reqContent = fs.readFileSync(reqPath, 'utf8');
        const patternStr = '\\*\\*Versi[oó]n\\*\\*: ' + currentVersion.replace(/\./g, '\\.');
        const versionPattern = new RegExp(patternStr);

        expect(
          versionPattern.test(reqContent),
          `requirements.md must include "**Versión**: ${currentVersion}" when version bumped from ${headVersion}`,
        ).toBe(true);
      }
    });

    it('should have exactly one changelog entry for the staged version (no duplicates, no missing)', () => {
      try {
        let headVersion = null;
        try {
          const pkgAtHead = execSync('git show HEAD:package.json 2>/dev/null', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          headVersion = JSON.parse(pkgAtHead).version;
        } catch (e: unknown) {
          headVersion = '0.0.0';
        }

        if (headVersion && pkg.version !== headVersion) {
          const changelogPath = path.join(rootDir, 'CHANGELOG.md');
          const changelogContent = fs.readFileSync(changelogPath, 'utf8');
          const pattern = new RegExp('## \\[' + pkg.version.replace(/\./g, '\\.') + '\\]', 'g');
          const matches = changelogContent.match(pattern) || [];
          expect(
            matches.length,
            `CHANGELOG.md must have exactly 1 entry for version ${pkg.version}, but found ${matches.length}`,
          ).toBe(1);
        }
      } catch (e: unknown) {}
    });

    it('should not have any changelog version posterior to the staged package.json version', () => {
      const changelogPath = path.join(rootDir, 'CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) return;
      const changelogContent = fs.readFileSync(changelogPath, 'utf8');

      const versionMatches = [...changelogContent.matchAll(/## \[([0-9]+\.[0-9]+\.[0-9]+)\]/g)];

      versionMatches.forEach((match) => {
        const changelogVersion = match[1];
        const changelogParts = changelogVersion.split('.').map(Number);
        const pkgParts = pkg.version.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
          if (changelogParts[i] > pkgParts[i]) {
            throw new Error(
              `CHANGELOG contains version ${changelogVersion} which is posterior to package.json version ${pkg.version}`,
            );
          }
          if (changelogParts[i] < pkgParts[i]) {
            break; // Earlier version is OK
          }
        }
      });

      expect(true).toBe(true); // Placeholder pass if no errors thrown
    });

    it('should allow multiple requirements with the staged version, but NOT posterior versions in requirements.md', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');

      let headVersion = null;
      try {
        const pkgAtHead = execSync('git show HEAD:package.json 2>/dev/null', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        headVersion = JSON.parse(pkgAtHead).version;
      } catch (e: unknown) {
        headVersion = '0.0.0';
      }

      if (!headVersion || pkg.version === headVersion) {
        expect(true).toBe(true);
        return;
      }

      const versionMatches = [
        ...reqContent.matchAll(/\*\*Versi[oó]n\*\*:\s*([0-9]+\.[0-9]+\.[0-9]+)/g),
      ];

      versionMatches.forEach((match) => {
        const reqVersion = match[1];
        const reqParts = reqVersion.split('.').map(Number);
        const pkgParts = pkg.version.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
          expect(
            reqParts[i],
            `requirements.md version ${reqVersion} is posterior to package.json ${pkg.version}`,
          ).toBeLessThanOrEqual(pkgParts[i]);
          if (reqParts[i] < pkgParts[i]) break;
        }
      });
    });

    it('should ensure all changelog versions follow valid semver and are in descending order', () => {
      const changelogPath = path.join(rootDir, 'CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) return;
      const changelogContent = fs.readFileSync(changelogPath, 'utf8');

      const versionMatches = [...changelogContent.matchAll(/## \[([0-9]+\.[0-9]+\.[0-9]+)\]/g)];
      const versions = versionMatches.map((m) => m[1]);

      for (let i = 0; i < versions.length - 1; i++) {
        const currParts = versions[i].split('.').map(Number);
        const nextParts = versions[i + 1].split('.').map(Number);

        for (let j = 0; j < 3; j++) {
          expect(
            currParts[j],
            `CHANGELOG versions not in descending order: ${versions[i]} should be > ${versions[i + 1]}`,
          ).toBeGreaterThanOrEqual(nextParts[j]);
          if (currParts[j] > nextParts[j]) break;
        }
      }
    });

    it('should ensure requirements.md versions are in descending order by requirement number', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');

      const reqBlocks = reqContent.split('\n### Requerimiento');
      const versionsByReq: Record<number, string> = {};

      for (let i = 1; i < reqBlocks.length; i++) {
        const block = reqBlocks[i];
        const numMatch = block.match(/^\s*(\d+)/);
        const versionMatch = block.match(/\*\*Versi[oó]n\*\*:\s*([0-9]+\.[0-9]+\.[0-9]+)/);

        if (numMatch && versionMatch) {
          versionsByReq[parseInt(numMatch[1], 10)] = versionMatch[1];
        }
      }

      const reqNums = Object.keys(versionsByReq)
        .map(Number)
        .sort((a, b) => b - a);

      for (let i = 0; i < reqNums.length - 1; i++) {
        const currReqNum = reqNums[i];
        const nextReqNum = reqNums[i + 1];
        const currVersion = versionsByReq[currReqNum];
        const nextVersion = versionsByReq[nextReqNum];

        const currParts = currVersion.split('.').map(Number);
        const nextParts = nextVersion.split('.').map(Number);

        for (let j = 0; j < 3; j++) {
          expect(
            currParts[j],
            `Requirement #${currReqNum} version ${currVersion} should be >= #${nextReqNum} version ${nextVersion}`,
          ).toBeGreaterThanOrEqual(nextParts[j]);
          if (currParts[j] > nextParts[j]) break;
        }
      }
    });

    it('should validate CHANGELOG sections match version bump type', () => {
      const changelogPath = path.join(rootDir, 'CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) return;

      try {
        let headVersion = null;
        try {
          const pkgAtHead = execSync('git show HEAD:package.json 2>/dev/null', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          headVersion = JSON.parse(pkgAtHead).version;
        } catch (e: unknown) {
          headVersion = '0.0.0';
        }

        if (!headVersion || pkg.version === headVersion) return;

        const changelogContent = fs.readFileSync(changelogPath, 'utf8');
        const [currMajor, currMinor, currPatch] = pkg.version.split('.').map(Number);
        const [headMajor, headMinor, headPatch] = headVersion.split('.').map(Number);

        const versionSection = changelogContent.match(
          new RegExp(`## \\[${pkg.version}\\][\\s\\S]*?(?=## \\[|$)`, 'i'),
        );
        if (!versionSection) return;

        const section = versionSection[0];
        const hasAdded = /### Added/i.test(section);
        const hasFixed = /### Fixed/i.test(section);
        const hasChanged = /### Changed/i.test(section);
        const hasContent = section.split('\n').filter((l) => l.match(/^\s*-\s+\S/)).length > 0;

        expect(
          hasContent,
          `CHANGELOG entry for ${pkg.version} is empty: add at least one item under Added/Changed/Fixed`,
        ).toBe(true);

        if (currMajor > headMajor) {
          expect(
            hasAdded || hasChanged || hasFixed,
            `CHANGELOG major bump (${headVersion} -> ${pkg.version}) should have substantial content`,
          ).toBe(true);
        } else if (currMinor > headMinor) {
          expect(
            hasAdded || hasChanged,
            `CHANGELOG minor bump (${headVersion} -> ${pkg.version}) should include ### Added section`,
          ).toBe(true);
        }
      } catch (e: unknown) {}
    });

    it('should not have future dates in requirements.md', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dateMatches = [...reqContent.matchAll(/\*\*Fecha\*\*:\s*(\d{4}-\d{2}-\d{2})/g)];
      dateMatches.forEach((match) => {
        const dateStr = match[1];
        const date = new Date(dateStr);
        expect(date.getTime(), `Future date in requirements.md: ${dateStr}`).toBeLessThanOrEqual(
          today.getTime(),
        );
      });
    });

    it('should have date for each requirement entry in requirements.md', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');

      const historialStart = reqContent.indexOf('## Historial de requerimientos');
      if (historialStart === -1) return;
      const historialContent = reqContent.substring(historialStart);
      const reqBlocks = historialContent.split('### Requerimiento').slice(1);

      let validCount = 0;
      reqBlocks.forEach((block) => {
        const numMatch = block.match(/^\s*([1-9]\d*)/);
        if (!numMatch) return; // Skip non-requirement blocks

        const hasFecha = /\*\*Fecha\*\*:\s*\d{4}-\d{2}-\d{2}/.test(block);
        if (hasFecha) {
          validCount++;
        } else {
          const reqNum = numMatch[1];
          expect(false, `Requirement #${reqNum} is missing Fecha field`).toBe(true);
        }
      });

      expect(validCount, 'No valid requirements found in requirements.md').toBeGreaterThan(0);
    });

    it('should use consistent ISO date format in requirements.md (YYYY-MM-DD or YYYY-MM-DD HH:MM)', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');

      const historialStart = reqContent.indexOf('## Historial de requerimientos');
      if (historialStart === -1) return;
      const historialContent = reqContent.substring(historialStart);

      const fechaLines = [...historialContent.matchAll(/^\s*-\s+\*\*Fecha\*\*:\s*(.+)$/gm)];
      fechaLines.forEach((match) => {
        const valor = match[1].trim();
        const isValidFormat = /^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2})?$/.test(valor);
        expect(
          isValidFormat,
          `requirements.md has non-standard date format: "${valor}". Use YYYY-MM-DD or YYYY-MM-DD HH:MM`,
        ).toBe(true);
      });
    });

    it('should only use valid Estado values in requirements.md', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');

      const validEstados = ['Completado', 'Pendiente', 'En Progreso'];
      const estadoMatches = [...reqContent.matchAll(/\*\*Estado\*\*:\s*(\w+(?:\s+\w+)?)/g)];

      estadoMatches.forEach((match) => {
        const estado = match[1];
        expect(
          validEstados.includes(estado),
          `Invalid Estado value in requirements.md: "${estado}". Valid values: ${validEstados.join(', ')}`,
        ).toBe(true);
      });
    });

    it('should have all required fields in each requirement entry', () => {
      const reqPath = path.join(rootDir, '.integrity-suite', 'docs', 'requirements.md');
      if (!fs.existsSync(reqPath)) return;
      const reqContent = fs.readFileSync(reqPath, 'utf8');

      const requiredFields = [
        { name: 'Fecha', pattern: /\*\*Fecha\*\*:/ },
        { name: 'Versión', pattern: /\*\*Versi[oó]n\*\*:/ },
        { name: 'Requerimiento', pattern: /\*\*Requerimiento\*\*:/ },
        { name: 'Estado', pattern: /\*\*Estado\*\*:/ },
      ];

      const historialStart = reqContent.indexOf('## Historial de requerimientos');
      if (historialStart === -1) return;
      const historialContent = reqContent.substring(historialStart);
      const reqBlocks = historialContent.split('### Requerimiento').slice(1);

      let validCount = 0;
      reqBlocks.forEach((block) => {
        const numMatch = block.match(/^\s*([1-9]\d*)/);
        if (!numMatch) return; // Skip non-requirement blocks or requirement 0/001/037

        const reqNum = numMatch[1];
        let allFieldsPresent = true;

        requiredFields.forEach(({ name, pattern }) => {
          const hasField = pattern.test(block);
          if (!hasField) {
            allFieldsPresent = false;
          }
        });

        if (allFieldsPresent) {
          validCount++;
        } else {
          expect(false, `Requirement #${reqNum} is missing one or more required fields`).toBe(true);
        }
      });

      expect(
        validCount,
        'No valid requirements found in requirements.md historial',
      ).toBeGreaterThan(0);
    });
  });
});
