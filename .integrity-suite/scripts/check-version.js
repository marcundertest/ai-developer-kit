import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/**
 * Validates project version against HEAD version.
 * @param {Object} options
 * @param {boolean} [options.relaxed=false] - If true, allows version to equal HEAD (for push)
 * @param {boolean} [options.quiet=false] - If true, suppresses console output
 * @returns {Object} { valid: boolean, message: string, error?: string }
 */
export function validateVersion(options = {}) {
  const { relaxed = false, quiet = false } = options;

  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
    const currentVersion = pkg.version;

    if (!/^\d+\.\d+\.\d+$/.test(currentVersion)) {
      const error = `Version in package.json (${currentVersion}) is not a valid semantic version (major.minor.patch).`;
      if (!quiet) console.error(`Error: ${error}`);
      return { valid: false, message: error, error };
    }

    let oldVersion;
    try {
      const oldPkgContent = execSync('git show HEAD:package.json', {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString();
      const oldPkg = JSON.parse(oldPkgContent);
      oldVersion = oldPkg.version;
    } catch (e) {
      const message = 'No previous version found in Git. Skipping version check.';
      if (!quiet) console.log(message);
      return { valid: true, message };
    }

    if (currentVersion === oldVersion) {
      if (relaxed) {
        const message = `Version check passed: ${currentVersion} (relaxed mode: equal to HEAD is OK for push).`;
        if (!quiet) console.log(message);
        return { valid: true, message };
      } else {
        const error = `Version in package.json (${currentVersion}) has not been incremented.`;
        if (!quiet) {
          console.error(`Error: ${error}`);
          console.error('Please update the version field before committing.');
        }
        return { valid: false, message: error, error };
      }
    }

    const parse = (v) => v.split('.').map(Number);
    const [cMajor, cMinor, cPatch] = parse(currentVersion);
    const [oMajor, oMinor, oPatch] = parse(oldVersion);

    const isValidPatch = cMajor === oMajor && cMinor === oMinor && cPatch === oPatch + 1;
    const isValidMinor = cMajor === oMajor && cMinor === oMinor + 1 && cPatch === 0;
    const isValidMajor = cMajor === oMajor + 1 && cMinor === 0 && cPatch === 0;

    if (!isValidPatch && !isValidMinor && !isValidMajor) {
      const error = `Invalid version increment from ${oldVersion} to ${currentVersion}.`;
      if (!quiet) {
        console.error(`Error: ${error}`);
        console.error('Version jumps are not allowed (e.g., 1.0.5 -> 1.0.14).');
        console.error('Valid next versions are:');
        console.error(`- Patch: ${oMajor}.${oMinor}.${oPatch + 1}`);
        console.error(`- Minor: ${oMajor}.${oMinor + 1}.0`);
        console.error(`- Major: ${oMajor + 1}.0.0`);
      }
      return { valid: false, message: error, error };
    }

    const message = `Version check passed: ${oldVersion} -> ${currentVersion}`;
    if (!quiet) console.log(message);
    return { valid: true, message };
  } catch (error) {
    const message = `Error during version check: ${error.message}`;
    if (!quiet) console.error(message);
    return { valid: false, message, error: error.message };
  }
}

// CLI wrapper
if (import.meta.url === `file://${process.argv[1]}`) {
  const relaxed = process.argv.includes('--relaxed');
  const result = validateVersion({ relaxed, quiet: false });
  process.exit(result.valid ? 0 : 1);
}
