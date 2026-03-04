import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

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

  if (currentContent === lastContent) {
    console.error('Error: CHANGELOG.md has not been updated in this commit.');
    console.error('Please document your changes in CHANGELOG.md before committing.');
    process.exit(1);
  }

  console.log('CHANGELOG.md update check passed.');
} catch (error) {
  console.error('Error during CHANGELOG verification:', error.message);
  process.exit(1);
}
