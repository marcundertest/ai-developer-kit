import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

describe('Strict Quality Rules', () => {
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

  const codeFiles = getFiles(rootDir).filter((f) => !f.includes('tests/'));
  const allSourceFiles = getFiles(rootDir);

  it('RULE 1: Only English comments (ASCII only) in all code files', () => {
    allSourceFiles.forEach((file) => {
      if (file.includes('strict-quality.test.ts')) return;
      const content = fs.readFileSync(file, 'utf8');
      const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g;
      const comments = content.match(commentRegex);
      if (comments) {
        comments.forEach((comment) => {
          // eslint-disable-next-line no-control-regex
          const nonAscii = /[^\u0000-\u007F]/;
          expect(
            nonAscii.test(comment),
            `File ${file} contains non-ASCII characters in comment: "${comment}"`,
          ).toBe(false);
        });
      }
    });
  });

  it('RULE 2: No console.log or console.debug in source code', () => {
    codeFiles.forEach((file) => {
      if (file.includes('scripts/') || file.includes('check-version.js')) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.(log|debug|info)/);
    });
  });

  it('RULE 3: No TODO or FIXME in non-markdown files', () => {
    allSourceFiles.forEach((file) => {
      if (file.endsWith('.md')) return;
      if (file.includes('strict-quality.test.ts')) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/TODO|FIXME/i);
    });
  });

  it('RULE 4: TypeScript strict mode must be enabled', () => {
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      expect(tsconfig.compilerOptions.strict).toBe(true);
    }
  });

  it('RULE 5: No @ts-ignore in code', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('@ts-ignore');
    });
  });

  it('RULE 6: No explicit any types', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      // Basic check for explicit any in declarations or casts
      expect(content).not.toMatch(/:\s*any/);
      expect(content).not.toMatch(/<any>/);
      expect(content).not.toMatch(/as\s+any/);
    });
  });

  it('RULE 7: Layer isolation (No cross-imports between backend and frontend)', () => {
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      if (file.includes('/backend/')) {
        expect(content, `Backend file ${file} should not import from frontend`).not.toMatch(
          /from\s+['"].*\/frontend\//,
        );
      }
      if (file.includes('/frontend/')) {
        expect(content, `Frontend file ${file} should not import from backend`).not.toMatch(
          /from\s+['"].*\/backend\//,
        );
      }
    });
  });

  it('RULE 8: Component size limit (max 300 lines in src/components)', () => {
    const componentDir = path.join(rootDir, 'src/components');
    const componentFiles = getFiles(componentDir);
    componentFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const lineCount = content.split('\n').length;
      expect(
        lineCount,
        `Component ${file} is too large (${lineCount} lines). Max is 300.`,
      ).toBeLessThanOrEqual(300);
    });
  });

  it('RULE 9: No eslint-disable or prettier-ignore directives', () => {
    allSourceFiles.forEach((file) => {
      if (file.includes('strict-quality.test.ts')) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('eslint-disable');
      expect(content).not.toContain('prettier-ignore');
    });
  });

  it('RULE 10: No hardcoded secrets (API keys, passwords)', () => {
    const secretPatterns = [/api[_-]?key/i, /secret[_-]?key/i, /password/i, /token/i];
    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      secretPatterns.forEach((pattern) => {
        // Look for assignments to secret-like variables that look like hardcoded strings
        const assignmentRegex = new RegExp(`${pattern.source}\\s*[:=]\\s*['"][\\w-]{8,}['"]`, 'i');
        expect(content, `Potential secret found in ${file}`).not.toMatch(assignmentRegex);
      });
    });
  });
});
