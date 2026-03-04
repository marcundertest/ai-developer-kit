import { readFileSync } from 'fs';
import { execSync } from 'child_process';

try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
  const currentVersion = pkg.version;

  let oldVersion;
  try {
    const oldPkgContent = execSync('git show HEAD:package.json', {
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString();
    const oldPkg = JSON.parse(oldPkgContent);
    oldVersion = oldPkg.version;
  } catch (e) {
    console.log('No previous version found in Git. Skipping version check.');
    process.exit(0);
  }

  if (currentVersion === oldVersion) {
    console.error(`Error: Version in package.json (${currentVersion}) has not been incremented.`);
    console.error('Please update the version field before committing.');
    process.exit(1);
  }

  const parse = (v) => v.split('.').map(Number);
  const [cMajor, cMinor, cPatch] = parse(currentVersion);
  const [oMajor, oMinor, oPatch] = parse(oldVersion);

  const isValidPatch = cMajor === oMajor && cMinor === oMinor && cPatch === oPatch + 1;
  const isValidMinor = cMajor === oMajor && cMinor === oMinor + 1 && cPatch === 0;
  const isValidMajor = cMajor === oMajor + 1 && cMinor === 0 && cPatch === 0;

  if (!isValidPatch && !isValidMinor && !isValidMajor) {
    console.error(`Error: Invalid version increment from ${oldVersion} to ${currentVersion}.`);
    console.error('Version jumps are not allowed (e.g., 1.0.5 -> 1.0.14).');
    console.error('Valid next versions are:');
    console.error(`- Patch: ${oMajor}.${oMinor}.${oPatch + 1}`);
    console.error(`- Minor: ${oMajor}.${oMinor + 1}.0`);
    console.error(`- Major: ${oMajor + 1}.0.0`);
    process.exit(1);
  }

  console.log(`Version check passed: ${oldVersion} -> ${currentVersion}`);
} catch (error) {
  console.error('Error during version check:', error.message);
  process.exit(1);
}
