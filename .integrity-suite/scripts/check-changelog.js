import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CHANGELOG_PATH = './CHANGELOG.md';

/**
 * Validates that CHANGELOG.md is updated when version changes.
 * @param {Object} options
 * @param {boolean} [options.quiet=false] - If true, suppresses console output
 * @returns {Object} { valid: boolean, message: string, error?: string }
 */
export function validateChangelog(options = {}) {
  const { quiet = false } = options;

  try {
    if (!existsSync(CHANGELOG_PATH)) {
      const error = 'CHANGELOG.md does not exist.';
      if (!quiet) console.error(`Error: ${error}`);
      return { valid: false, message: error, error };
    }

    const currentContent = readFileSync(CHANGELOG_PATH, 'utf8').trim();

    let lastContent;
    try {
      lastContent = execSync(`git show HEAD:${CHANGELOG_PATH}`, {
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch (e) {
      const message = 'No previous CHANGELOG.md found in Git. Skipping change check.';
      if (!quiet) console.log(message);
      return { valid: true, message };
    }

    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

    // If version didn't change, skip changelog enforcement
    let oldVersion = pkg.version;
    try {
      const oldPkgContent = execSync('git show HEAD:package.json', {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString();
      oldVersion = JSON.parse(oldPkgContent).version;
    } catch {
      // No HEAD yet — skip
    }

    if (currentContent === lastContent) {
      if (pkg.version === oldVersion) {
        const message = 'CHANGELOG.md check skipped: version unchanged, no release entry required.';
        if (!quiet) console.log(message);
        return { valid: true, message };
      }
      const error = 'Version was bumped but CHANGELOG.md has not been updated.';
      if (!quiet) {
        console.error(`Error: ${error}`);
        console.error(`Please add a "## [${pkg.version}]" section to CHANGELOG.md.`);
      }
      return { valid: false, message: error, error };
    }

    const versionPattern = new RegExp(`## \\[${pkg.version.replace(/\./g, '\\.')}\\]`, 'g');
    if (!versionPattern.test(currentContent)) {
      const error = `No entry found for current version [${pkg.version}] in CHANGELOG.md`;
      if (!quiet) {
        console.error(`Error: ${error}`);
        console.error(`Please add a "## [${pkg.version}]" header to CHANGELOG.md`);
      }
      return { valid: false, message: error, error };
    }

    const message = 'CHANGELOG.md update check passed.';
    if (!quiet) console.log(message);
    return { valid: true, message };
  } catch (error) {
    const message = `Error during CHANGELOG verification: ${error.message}`;
    if (!quiet) console.error(message);
    return { valid: false, message, error: error.message };
  }
}

// CLI wrapper
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateChangelog({ quiet: false });
  process.exit(result.valid ? 0 : 1);
}
