import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, pkg } from './shared.js';

describe('Level 2: Strict Workflow (Pipeline) @workflow', () => {
  it('Should have essential scripts in package.json', () => {
    expect(pkg.scripts?.['build']).toBeDefined();
    expect(pkg.scripts?.['test:full']).toBeDefined();
    expect(pkg.scripts?.['test:report']).toBeDefined();
    expect(pkg.scripts?.['start']).toBeDefined();
  });

  it('Should not allow HUSKY=0 bypass in any script', () => {
    const scripts = Object.values(pkg.scripts || {}) as string[];
    scripts.forEach((script) => {
      expect(script, 'HUSKY=0 bypass found in scripts').not.toContain('HUSKY=0');
    });
  });

  it('Should forbid --no-verify git bypass in scripts', () => {
    const scripts = Object.values(pkg.scripts || {}) as string[];
    scripts.forEach((script) => {
      expect(script).not.toContain('--no-verify');
    });
  });

  it('Should have a valid semver version in package.json', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('Should enforce English-only commit messages in git history', async () => {
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

  it('Should forbid scopes in commit messages', async () => {
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

  it('Should enforce ASCII-only commit messages via commitlint plugin', async () => {
    const configPath = path.join(rootDir, '.integrity-suite', 'scripts', 'commitlint.config.ts');
    expect(fs.existsSync(configPath), 'commitlint.config.ts is missing').toBe(true);

    const { default: commitlintConfig } = await import(configPath);

    expect(commitlintConfig.rules?.['scope-enum'], 'scope-enum rule must be set to never').toEqual([
      2,
      'never',
    ]);

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

  it('Should run full validation in pre-commit hook with strict version check', () => {
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

  it('Should not attempt to modify the git index from within the pre-commit hook', () => {
    const hookPath = path.join(rootDir, '.husky', 'pre-commit');
    const content = fs.readFileSync(hookPath, 'utf8');
    expect(
      content,
      'pre-commit hook must not run git add: staged snapshot is already computed at this point',
    ).not.toMatch(/\bgit add\b/);
  });

  it('Should forbid arbitrary tool directories in linting ignore files', () => {
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

  it('Should not have unexpected entries in .gitignore beyond build artifacts', () => {
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

  it('Should have a zero-tolerance validation script with consolidated validations in tests', () => {
    const script = pkg.scripts['test:full'];
    expect(script, 'test:full script is missing').toBeDefined();
    if (script) {
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
    }
  });

  it('Should call all three test suites in correct order in test:full', () => {
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

  it('Should have prepare script configured to install husky', () => {
    expect(pkg.scripts['prepare'], 'prepare script is missing').toBeDefined();
    expect(pkg.scripts['prepare'], 'prepare script must invoke husky').toContain('husky');
  });

  it('Should have lint-staged configured to lint and format TypeScript files', () => {
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

  it('Should fail on any linting warning', () => {
    const fullScript = pkg.scripts['test:full'];
    expect(fullScript).toContain('eslint . --max-warnings 0');
  });

  it('Should enforce critical ESLint rules for AI-safety', () => {
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

  it('Should not have ESLint overrides that weaken rules on src/ or tests/', () => {
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

  it('Should explicitly forbid ignoring core kit files in .gitignore', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return;

    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content
      .split('\n')
      .map((l) => l.trim().replace(/\/+$/, ''))
      .filter((l) => l && !l.startsWith('#'));

    const coreKitPatterns = [
      '.integrity-suite/scripts',
      '.integrity-suite/scripts/commitlint.config.js',
      '.integrity-suite/scripts/generate-report.js',
      '.integrity-suite/tests',
      '.integrity-suite/tests/core-protection.test.ts',
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

  it('Should not have silent bypass patterns in test:full', () => {
    const script = pkg.scripts['test:full'] as string;
    expect(script, '|| true bypass in test:full').not.toMatch(/\|\|\s*true/);
    expect(script, '; true bypass in test:full').not.toMatch(/;\s*true\b/);
    expect(script, '&& exit 0 bypass in test:full').not.toMatch(/&&\s*exit\s+0/);
  });

  it('Should have a pre-push hook that runs full validation suite', () => {
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
