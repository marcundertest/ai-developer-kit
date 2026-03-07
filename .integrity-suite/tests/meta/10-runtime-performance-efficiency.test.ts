import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, codeFiles, pkg, allSourceFiles, testsDir, hasTailwind } from './shared';

describe('Level 10: Runtime Performance & Efficiency @performance', () => {
  it('Should not use namespace imports (import * as) in src/', () => {
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

  it('Should not use JSON.parse(JSON.stringify(...)) as a deep-clone in src/', () => {
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

  it('Should not have sequential awaits inside for...of loops in src/', () => {
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

  it('Should not import the entire lodash library in src/', () => {
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

  it('Should not use synchronous fs methods inside async functions in src/', () => {
    const srcDir = path.join(rootDir, 'src') + path.sep;
    codeFiles
      .filter((f) => f.startsWith(srcDir))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        expect(
          content,
          `Synchronous fs call inside async function in ${file}: use fs.promises equivalents`,
        ).not.toMatch(/async\s+(?:function\s+\w+|\(\s*[^)]*\)\s*=>)[\s\S]{0,500}?fs\.\w+Sync\s*\(/);
      });
  });
});
