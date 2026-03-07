import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { rootDir, codeFiles, pkg, allSourceFiles, testsDir, hasTailwind } from './shared';

describe('Level 9: Advanced Code Safety & Consistency @consistency', () => {
  it('Should not mix async/await with .then()/.catch() in the same file', () => {
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

  it('Should use strict equality (===) instead of loose equality (==) in src/', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `Loose equality (==) in ${file}`).not.toMatch(/(?<![!=<>])={2}(?!=)/);
      expect(content, `Loose inequality (!=) in ${file}`).not.toMatch(/!={1}(?!=)/);
    });
  });

  it('Should use object spread instead of Object.assign in src/', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        content,
        `Object.assign() in ${file}: use spread operator {...a, ...b} instead for better readability`,
      ).not.toMatch(/\bObject\.assign\s*\(/);
    });
  });

  it('Should not exceed 4 levels of nesting in src/ files', () => {
    const srcDir = path.join(rootDir, 'src') + path.sep;
    codeFiles
      .filter((f) => f.startsWith(srcDir))
      .forEach((file) => {
        const lines = fs.readFileSync(file, 'utf8').split('\N');
        lines.forEach((line, idx) => {
          const indentSpaces = line.match(/^(\s*)/)?.[1].replace(/\t/g, '    ').length ?? 0;
          expect(
            indentSpaces,
            `Line ${idx + 1} in ${file} exceeds 4 levels of nesting (${indentSpaces / 4} levels assuming 4-space indent)`,
          ).toBeLessThanOrEqual(32);
        });
      });
  });

  it('Should not have untyped array callback parameters in src/', () => {
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

  it('Should type catch clause errors as unknown, not any', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        content,
        `Catch with "any" type in ${file}: use "unknown" and narrow with instanceof for better type safety`,
      ).not.toMatch(/catch\s*\(\s*\w+\s*:\s*any\s*\)/);
    });
  });

  it('Should not interpolate variables directly into SQL-like query strings', () => {
    const sqlPattern = /`\s*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^`]*\$\{/i;
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        content,
        `Potential SQL injection via template literal in ${file}: use parameterized queries`,
      ).not.toMatch(sqlPattern);
    });
  });

  it('Should not use Math.random() for security-sensitive operations', () => {
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

  it('Should not use innerHTML assignment in src/', () => {
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

  it('Should not use setTimeout or setInterval in src/', () => {
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

  it('Should not have top-level floating promises in src/', () => {
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

  it('Should not use var declarations in src/', () => {
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

  it('Should not use default exports in src/', () => {
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

  it('Should not have nested ternary expressions in src/', () => {
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

  it('Should have a default clause in all switch statements in src/', () => {
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
