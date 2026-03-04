# Changelog

All notable changes to this project will be documented in this file. This file is strictly maintained in **English** and must only contain **ASCII** characters.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-03-05

### Changed

- Normalized infrastructure filenames by renaming `REQUIREMENTS.md` and `WORKFLOW.md` to lowercase (`requirements.md` and `workflow.md`).
- Updated all references in documentation and tests to reflect these naming changes.

## [1.3.0] - 2026-03-05

### Added

- Implemented "Commit Lockdown" mechanism: the Integrity Suite now blocks commits unless the latest requirement in `requirements.md` is explicitly marked as **Approved**.
- Updated `workflow.md` and `prompt.md` to enforce the mandatory commit approval flow.
- Added automated test to verify the "Approved" status of requirements.

## [1.2.2] - 2026-03-04

### Changed

- Reinforced language policy enforcement by explicitly stating requirements in `CHANGELOG.md` and `requirements.md`.
- Added automated tests to ensure `CHANGELOG.md` remains in English (ASCII) and `requirements.md` remains in Spanish.

## [1.2.1] - 2026-03-04

### Changed

- Refined `prompt.md` with explicit instructions on prohibiting Integrity Suite modifications and the responsibility of maintaining `CHANGELOG.md`.

## [1.2.0] - 2026-03-04

### Changed

- Translated `prompt.md` to Spanish to enforce agent responses in that language.

## [1.1.9] - 2026-03-04

### Added

- Updated `prompt.md` with a comprehensive introduction to the Integrity Suite and agent constraints.

## [1.1.8] - 2026-03-04

### Changed

- Renamed the infrastructure directory to `.integrity-suite`.
- Renamed the main test file to `tests/integrity-suite.test.ts`.
- Updated all internal references, scripts, and ignore patterns to the new naming.

## [1.1.7] - 2026-03-04

### Changed

- Reorganized project structure to isolate template-specific files.
- Moved `docs` and `scripts` into a new hidden directory: `.integrity-suite` (originally `.guardian`).
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
