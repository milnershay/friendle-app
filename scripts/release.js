/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const releaseType = args[0] || 'patch'; // default to patch

if (!['major', 'minor', 'patch'].includes(releaseType)) {
  console.error('Invalid release type. Use major, minor, or patch.');
  process.exit(1);
}

try {
  // 1. Bump version in package.json and package-lock.json
  console.log(`Bumping ${releaseType} version...`);
  // --no-git-tag-version prevents npm from creating a commit and tag automatically
  execSync(`npm version ${releaseType} --no-git-tag-version`, { stdio: 'inherit' });

  // 2. Read new version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  // Invalidate cache to get the updated version
  delete require.cache[require.resolve(packageJsonPath)];
  const packageJson = require(packageJsonPath);
  const newVersion = packageJson.version;
  console.log(`New version: ${newVersion}`);

  // 3. Update CHANGELOG.md
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
      let changelog = fs.readFileSync(changelogPath, 'utf8');
      const date = new Date().toISOString().split('T')[0];
      const newEntry = `## [${newVersion}] - ${date}`;

      // Replace [Unreleased] with [Unreleased] \n\n [NewVersion] - Date
      if (changelog.includes('## [Unreleased]')) {
          changelog = changelog.replace(
              '## [Unreleased]',
              `## [Unreleased]\n\n${newEntry}`
          );
          fs.writeFileSync(changelogPath, changelog);
          console.log('CHANGELOG.md updated.');
      } else {
          console.warn('Could not find "## [Unreleased]" in CHANGELOG.md. Skipping update.');
      }
  } else {
      console.warn('CHANGELOG.md not found. Skipping update.');
  }

  // 4. Git commit and tag
  console.log('Committing and tagging...');
  // Check if there are changes to commit
  try {
      execSync('git add package.json package-lock.json CHANGELOG.md', { stdio: 'inherit' });
      execSync(`git commit -m "chore(release): v${newVersion}"`, { stdio: 'inherit' });
      execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
      console.log(`Release v${newVersion} completed!`);
  } catch (err) {
      console.error('Git commit/tag failed. You may need to commit manually.');
      throw err;
  }

} catch (error) {
  console.error('Release failed:', error.message);
  process.exit(1);
}
