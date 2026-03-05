import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CHANGELOG_PATH = './CHANGELOG.md';

if (!existsSync(CHANGELOG_PATH)) {
  console.error('Error: CHANGELOG.md does not exist.');
  process.exit(1);
}

try {
  const currentContent = readFileSync(CHANGELOG_PATH, 'utf8').trim();

  let lastContent;
  try {
    lastContent = execSync(`git show HEAD:${CHANGELOG_PATH}`, {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (e) {
    console.log('No previous CHANGELOG.md found in Git. Skipping change check.');
    process.exit(0);
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
      console.log('CHANGELOG.md check skipped: version unchanged, no release entry required.');
      process.exit(0);
    }
    console.error('Error: version was bumped but CHANGELOG.md has not been updated.');
    console.error(`Please add a "## [${pkg.version}]" section to CHANGELOG.md.`);
    process.exit(1);
  }
  const versionPattern = new RegExp(`## \\[${pkg.version.replace(/\./g, '\\.')}\\]`, 'g');
  if (!versionPattern.test(currentContent)) {
    console.error(`Error: No entry found for current version [${pkg.version}] in CHANGELOG.md`);
    console.error(`Please add a "## [${pkg.version}]" header to CHANGELOG.md`);
    process.exit(1);
  }

  console.log('CHANGELOG.md update check passed.');
} catch (error) {
  console.error('Error during CHANGELOG verification:', error.message);
  process.exit(1);
}
