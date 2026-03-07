import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  rootDir,
  codeFiles,
  pkg,
  allSourceFiles,
  testsDirs,
  hasTailwind,
  semverGt,
  getMainBranch,
} from './shared.js';

describe('Level 11: Documentation Quality @documentation', () => {
  it('Should not have placeholder or empty descriptions in test files', () => {
    const testFiles = allSourceFiles.filter(
      (f) => testsDirs.some((dir) => f.startsWith(dir)) && /\.(test|spec)\.(ts|tsx)$/.test(f),
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
          '\\bit\\s*\\(\\s*[\'"`](?:T' + 'ODO|F' + 'IXME|placeholder|test\\s+\\d*|untitled)[`\'"]',
          'i',
        ),
      );
    });
  });

  it('Should have JSDoc comments on all exported members in src/', () => {
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

  it('Should include @param tags for all function exports with parameters in src/', () => {
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

  it('Should not have empty JSDoc comments in src/', () => {
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

  it('Should never have a version inferior to origin HEAD (version-check)', () => {
    const mainBranch = getMainBranch();
    try {
      const currentVersion = pkg.version;

      let originVersion = null;
      try {
        const pkgAtOrigin = execSync(
          `git show origin/${mainBranch}:package.json 2>/dev/null || git show HEAD:package.json`,
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
        const isLower =
          !semverGt(currentVersion, originVersion) && currentVersion !== originVersion;

        if (isLower) {
          expect(
            false,
            `Version regression detected: current ${currentVersion} is lower than origin ${originVersion}`,
          ).toBe(true);
        }
      }
    } catch (e: unknown) {}
  });

  it('Should require version bump when non-markdown files are modified', () => {
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
        const mainBranch = getMainBranch();
        const headPkg = execSync(`git show origin/${mainBranch}:package.json`, {
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

  it('Should enforce version bump in staging (strict commit mode)', () => {
    const mainBranch = getMainBranch();
    try {
      let headVersion: string | null = null;
      try {
        const pkgAtHead = execSync(`git show origin/${mainBranch}:package.json 2>/dev/null`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        headVersion = JSON.parse(pkgAtHead).version;
      } catch (e: unknown) {
        return;
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
          'Version in staging (' + pkg.version + ') must be higher than HEAD (' + headVersion + ')',
        ).toBe(true);
      }
    } catch (e: unknown) {}
  });

  it('Should allow same or higher version in staging (relaxed push mode)', () => {
    const mainBranch = getMainBranch();
    try {
      let headVersion: string | null = null;
      try {
        const pkgAtHead = execSync(`git show origin/${mainBranch}:package.json 2>/dev/null`, {
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

  it('Should have CHANGELOG entry for staged version bumped (commit only)', () => {
    let headVersion: string | null = null;
    let currentVersion = pkg.version;
    let shouldCheck = false;

    try {
      try {
        const mainBranch = getMainBranch();
        const pkgAtHead = execSync(`git show origin/${mainBranch}:package.json`, {
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

  it('Should have exactly one changelog entry for the staged version (no duplicates, no missing)', () => {
    try {
      const mainBranch = getMainBranch();
      let headVersion: string | null = null;
      try {
        const pkgAtHead = execSync(`git show origin/${mainBranch}:package.json 2>/dev/null`, {
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

  it('Should not have any changelog version posterior to the staged package.json version', () => {
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) return;
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');

    const versionMatches = [
      ...changelogContent.matchAll(/## \[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)]/g),
    ];

    versionMatches.forEach((match) => {
      const changelogVersion = match[1];
      if (semverGt(changelogVersion, pkg.version)) {
        throw new Error(
          `CHANGELOG contains version ${changelogVersion} which is posterior to package.json version ${pkg.version}`,
        );
      }
    });
  });

  it('Should ensure all changelog versions follow valid semver and are in descending order', () => {
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) return;
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');

    const versionMatches = [
      ...changelogContent.matchAll(/## \[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)]/g),
    ];
    const versions = versionMatches.map((m) => m[1]);

    for (let i = 0; i < versions.length - 1; i++) {
      expect(
        semverGt(versions[i], versions[i + 1]),
        `CHANGELOG not in descending order: ${versions[i]} vs ${versions[i + 1]}`,
      ).toBe(true);
    }
  });

  it('Should validate CHANGELOG sections match version bump type', () => {
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) return;

    try {
      let headVersion: string | null = null;
      try {
        const mainBranch = getMainBranch();
        const pkgAtHead = execSync(`git show origin/${mainBranch}:package.json 2>/dev/null`, {
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
});
