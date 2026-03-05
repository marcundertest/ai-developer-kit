import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const reportsDir = path.join(rootDir, 'tests', 'meta', 'reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const resultsPath = path.join(reportsDir, 'linter-results.json');

/**
 * Captures linter results from ESLint, Prettier, markdownlint, and TypeScript.
 * @returns {Object} Results object with eslint, prettier, markdownlint, and typescript properties
 */
export function captureLinterResults() {
  const results = {
    eslint: { status: 'pending', errors: [], warnings: [] },
    prettier: { status: 'pending', files: [] },
    markdownlint: { status: 'pending', errors: [] },
    typescript: { status: 'pending', errors: [] },
  };

  // 1. Capture ESLint results
  try {
    const eslintOutput = execSync('npx eslint . --format=json --max-warnings -1', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const eslintResults = JSON.parse(eslintOutput);

    let errorCount = 0;
    let warningCount = 0;

    eslintResults.forEach((file) => {
      file.messages.forEach((msg) => {
        const issue = {
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          message: msg.message,
          rule: msg.ruleId,
        };

        if (msg.severity === 2) {
          errorCount++;
          results.eslint.errors.push(issue);
        } else if (msg.severity === 1) {
          warningCount++;
          results.eslint.warnings.push(issue);
        }
      });
    });

    results.eslint.status = errorCount === 0 ? 'passed' : 'failed';
    results.eslint.summary = `${errorCount} errors, ${warningCount} warnings`;
  } catch (error) {
    results.eslint.status = 'error';
    results.eslint.error = error.message;
  }

  // 2. Capture Prettier results
  try {
    execSync('npx prettier --check .', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    results.prettier.status = 'passed';
    results.prettier.summary = 'All files formatted correctly';
  } catch (error) {
    results.prettier.status = 'failed';
    // Extract file list from error message
    const output = error.stdout?.toString() || error.message;
    const lines = output.split('\n');
    results.prettier.files = lines
      .filter((line) => line.endsWith('needs formatting'))
      .map((line) => {
        const match = line.match(/^(.*?)\s+needs formatting/);
        return match ? match[1] : line;
      });
    results.prettier.summary = `${results.prettier.files.length} file(s) need formatting`;
  }

  // 3. Capture markdownlint results
  try {
    const mdlintOutput = execSync('npx markdownlint . --format json', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const mdlintResults = JSON.parse(mdlintOutput || '{}');

    let errorCount = 0;
    Object.entries(mdlintResults).forEach(([file, issues]) => {
      issues.forEach((issue) => {
        errorCount++;
        results.markdownlint.errors.push({
          file,
          line: issue.lineNumber,
          rule: issue.ruleNames[0],
          message: issue.ruleDescription,
        });
      });
    });

    results.markdownlint.status = errorCount === 0 ? 'passed' : 'failed';
    results.markdownlint.summary = `${errorCount} issue(s)`;
  } catch (error) {
    results.markdownlint.status = 'error';
    results.markdownlint.error = error.message;
  }

  // 4. Capture TypeScript errors
  try {
    execSync('tsc --noEmit', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    results.typescript.status = 'passed';
    results.typescript.summary = 'No TypeScript errors';
  } catch (error) {
    results.typescript.status = 'failed';
    const output = error.stdout?.toString() || error.message;
    const lines = output.split('\n').filter((line) => line.trim());
    results.typescript.errors = lines;
    results.typescript.summary = `${lines.length} error(s)`;
  }

  return results;
}

// CLI wrapper
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = captureLinterResults();
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`✅ Linter results saved to: ${resultsPath}`);
  process.exit(0);
}
