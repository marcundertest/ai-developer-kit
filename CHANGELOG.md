# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.7] - 2026-03-04

### Changed

- Reorganized project structure to isolate template-specific files.
- Moved `docs` and `scripts` into a new hidden directory: `.guardian`.
- Updated all internal references (package.json, tests) to the new structure.

### Removed

- Deleted `developer-kit` directory entirely.

## [1.1.6] - 2026-03-04

### Added

- Enforced prohibition of `markdownlint-disable` directives across all project files.
- Extended the integrity test suite to detect and fail on local Markdownlint bypasses.

## [1.1.5] - 2026-03-04

### Added

- Created `scripts/check-changelog.js` to enforce changelog updates.
- Added a `check-changelog` script to `package.json`.
- Integrated changelog verification into `validate-project` script.

### Changed

- Moved `CHANGELOG.md` to the project root.
- Re-formatted `CHANGELOG.md` to strictly follow "Keep a Changelog" and Markdownlint rules.

## [1.1.4] - 2026-03-04

### Added

- Created `README.md` with installation, usage, and security sections.
- Integrated `pnpm audit` into the validation pipeline.
- Added `build`, `start`, and `audit` scripts to `package.json`.
- Created `src/index.ts` as a clean entry point.
- Implemented `.markdownlintignore` and `.prettierignore`.

### Fixed

- Resolved 4 security vulnerabilities in dependencies (markdownlint-cli, vitest, vite).
- Fixed cross-platform path issues in test suite.

## [1.1.3] - 2026-03-04

### Changed

- Unified all tests into a single `project-integrity.test.ts` suite.
- Reorganized tests into maturity levels (0-5).
- Balanced template flexibility by allowing any non-empty project name/author.

### Removed

- Deleted legacy test files (`strict-commits.test.ts`, `strict-quality.test.ts`, `initial-setup.test.ts`).
- Removed specific license content validation tests.

## [1.1.0] - 2026-03-04

### Added

- Implemented comprehensive strict quality rules.
- Added English-only comment enforcement.
- Added console.log and TODO/FIXME detection.
- Enforced layer isolation between frontend and backend.
- Limited component size to 300 lines.
- Added hardcoded secrets detection.
- Implemented cross-platform path separator meta-test.

## [1.0.8] - 2026-03-04

### Changed

- Renamed project to `project-template` for generic use.
- Updated license and metadata for template reuse.

## [1.0.0] - 2026-03-04

### Added

- Initial project setup with Vitest, ESLint, Prettier, and Husky.
- Automated version increment control.
- Conventional commits enforcement.
