# Changelog

All notable changes to this project will be documented in this file. This file is strictly maintained in **English** and must only contain **ASCII** characters.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.46] - 2026-03-05

### Added

- Level 9: Advanced Code Safety & Consistency meta-tests (Rules 129-137):
  - Forbid mixing `async/await` with `.then()/.catch()` in the same file.
  - Enforce strict equality (`===`) and inequality (`!==`) globally.
  - Enforce object spread instead of `Object.assign()`.
  - Limit code nesting depth to 4 levels (max 32-space indentation).
  - Require explicit type annotations for array callback parameters (`map`, `filter`, etc.).
  - Mandate `unknown` type for error variables in `catch` blocks.
  - Detect potential SQL injection patterns in template literals.
  - Forbid `Math.random()` in sensitive security contexts (tokens, secrets).
  - Prohibit direct `innerHTML` assignments to prevent XSS.
- Added `complexity: 10` rule to `.eslintrc.json` to enforce Single Responsibility Principle at the function level.

## [1.4.45] - 2026-03-05

### Added

- 9 additional HTML structure and semantics meta tests:
  - Validates `<meter>` to require explicit `min` and `max` attributes for correct screen reader boundary deduction.
  - Require `<video>` and `<audio>` tags to declare the `controls` property for accessibility playback.
  - Forbids placing interactive components (e.g. `<button>`, `<a>`) directly inside standard `<label>` tags.
  - Forbids `tabIndex` attributes set greater than `0` to prevent forcing unpredictable keyboard workflows.
  - Fails implementations where an image's `alt` text matches nearby or adjacent literal HTML textual content.
  - Requires `<figure>` contexts containing images to use a valid `<figcaption>`.
  - Audits `<button>` to ensure it is rarely 'mute', validating the existence of direct inner text or `aria-label`.
  - Disallows standard `<a>` nodes from existing without an associative `href` attribute.

## [1.4.44] - 2026-03-05

### Added

- 5 new accessibility checks for form & composite controls:
  - Validates `aria-labelledby` so that all string-referenced `id` arrays exist in the document.
  - Requires `<fieldset>` constructs to wrap at least one `<legend>` child.
  - Mandates valid associated labels (`aria-label`, `aria-labelledby`, or `id`) natively on `<select>`.
  - Audits `<progress>` elements to verify proper state projection (`aria-valuenow`).
  - Audits `<details>` wrappers to declare at least one `<summary>` interactive component.

## [1.4.43] - 2026-03-05

### Added

- 5 additional ARIA and semantic form-control meta tests:
  - Restrict `aria-checked` valid context roles (`checkbox`, `radio`, `switch`, `menuitemcheckbox`).
  - Require explicit `aria-modal="true"` declaration within structural `role="dialog"` elements.
  - Assert that references declared in `aria-controls` target a DOM element `id` that exists within the same file.
  - Enforce content availability in label components (block empty `<label></label>`).
  - Restrict explicit implementations of `<input type="image">` to strictly declare accompanying `alt` text.

## [1.4.42] - 2026-03-05

### Added

- Added explicit testing to `.gitignore` to forbid ignoring components of `.integrity-suite` or the `tests/meta` directory, cementing the core protection rules from bypass edge-cases.

## [1.4.41] - 2026-03-05

### Added

- 5 new strict Accessibility HTML tests:
  - Enforce continuous hierarchy for `h1`-`h6` headers to prevent skipping levels.
  - Forbid multiple `<h1>` elements in a single file per standard SEO/Accessibiilty guidelines.
  - Prohibit `aria-hidden="true"` on interactive elements (e.g. `button`, `input`).
  - Prohibit `role="button"` on `<img />` tags.
  - Prohibit `<button>` elements nested inside `<a>` tags.

## [1.4.40] - 2026-03-05

### Added

- A robust suite of 12 new Accessibility & Semantic HTML meta-tests to Level 4 Hygiene:
  - Match `<label for>` with explicit target `<input id>`.
  - Forbid redundant `role="button"` on literal `<button>` elements.
  - Require keyboard handlers (`onKeyDown`, etc.) for clickable `<div>`/`<span>`/`<img>`.
  - Enforce `title` on `<iframe>`.
  - Require `<th>` within `<table>` elements.
  - Enforce `aria-required="true"` on inputs marked `required`.
  - Forbid empty `aria-label=""`.
  - Forbid negative `tabIndex` on standard interactive form elements & anchors.
  - Validate against commonly misspelled or invalid ARIA `role` values.
  - Require focusability (`tabIndex="0"`) on implicit ARIA `role="button"` components.
  - Enfore `<textarea>` includes standard labels/identifiers (`id`, `aria-label`, or `aria-labelledby`).
  - Forbid `href` assignment on `<div>` or `<span>`.

## [1.4.39] - 2026-03-05

### Added

- Meta-test to ensure `<img>` and `<button>` elements with `onClick` handlers explicitly declare a `tabIndex` for keyboard focusability.

## [1.4.38] - 2026-03-05

### Added

- Added extensive DOM, UX, and accessibility validations:
  - Enforce `loading="lazy"` on `<img/>`.
  - Enforce `type` attribute on `<button>`.
  - Enforce `autocomplete` on `<input type="text">`.
  - Forbid `href="#"` on `<a>`.
  - Forbid `<a>` nested inside `<button>`.
  - Enforce `width` and `height` attributes on `<img/>`.
  - Enforce `name` attribute on `<input>` inside `<form>`.
  - Enforce `role="presentation"` on `<img/>` missing `alt` description (using `alt=""`).

## [1.4.37] - 2026-03-05

### Added

- Meta-test to protect core AI Developer Kit files from unauthorized modification by agents when the project name is changed from the default.

## [1.4.36] - 2026-03-05

### Added

- Meta-tests for UX and Security standards:
  - Enforce pointer cursor on buttons and anchors.
  - Disable text selection on buttons for better UX.
  - Enforce `target="_blank"` and `rel="noopener noreferrer"` on external links.

## [1.4.35] - 2026-03-05

### Added

- Meta-test to ensure the `<html>` element has a `lang` attribute in HTML files for accessibility.

## [1.4.34] - 2026-03-05

### Added

- Meta-test to forbid the use of non-semantic elements (`<div>`, `<span>`) as interactive controls with `onClick` handlers in HTML, JSX, and TSX files.

## [1.4.33] - 2026-03-05

### Added

- Meta-test to forbid positive `tabIndex` values in HTML, JSX, and TSX files to prevent disruption of keyboard navigation order.

## [1.4.32] - 2026-03-05

### Added

- Meta-test to detect potential low-contrast color pairs (hardcoded gray values) in CSS, HTML, JSX, and TSX files.

## [1.4.31] - 2026-03-05

### Added

- Meta-test to ensure all HTML files have a `<main>` landmark element for accessibility.

## [1.4.30] - 2026-03-05

### Added

- Meta-test to ensure all `<input>` tags in HTML, JSX, and TSX files have an associated label (via `id` for `<label for>`, `aria-label`, or `aria-labelledby`).

## [1.4.29] - 2026-03-05

### Added

- Meta-test to ensure all `<button>` tags in HTML, JSX, and TSX files have accessible text (either visible content or an `aria-label`).

## [1.4.28] - 2026-03-05

### Added

- Meta-test to ensure all `<img>` tags in HTML, JSX, and TSX files have an `alt` attribute for accessibility.

## [1.4.27] - 2026-03-05

### Added

- Meta-test to forbid wildcard re-exports (`export * from`) in `src/` to respect the Interface Segregation Principle (ISP).

## [1.4.26] - 2026-03-05

### Added

- Meta-test to enforce Dependency Inversion Principle (DIP) by forbidding direct class instantiations within function bodies in `src/`.

## [1.4.25] - 2026-03-05

### Added

- Meta-test to enforce Single Responsibility Principle (SRP) by limiting the number of public methods in a class to a maximum of 10.

## [1.4.24] - 2026-03-05

### Added

- Meta-test to detect unreferenced exports in `src/`, ensuring no dead code is left behind after refactoring.

## [1.4.23] - 2026-03-05

### Added

- Meta-test to forbid functions with more than 4 parameters in `src/`, encouraging the use of configuration objects.

## [1.4.22] - 2026-03-05

### Added

- Meta-test to forbid trivial dummy assertions like `expect(true).toBe(true)` in test files.
- Updated bootstrap E2E tests with non-trivial environment checks.

## [1.4.21] - 2026-03-05

### Added

- Meta-test and `tsconfig.json` configuration to enforce `noUnusedLocals` and `noUnusedParameters`, preventing forgotten imports and variables.

## [1.4.20] - 2026-03-05

### Added

- Meta-test to detect AI reasoning artifacts in comments (e.g., "// This should work", "// Not sure").

## [1.4.19] - 2026-03-05

### Added

- Improved secret detection in integrity suite (JWT, environment variables fallback).
- Added `requirements.md` date format validation.
- Added test to verify `pnpm` version matches `packageManager`.
- Added unit test for `src/index.ts` and enforced index test coverage.
- Configured verbose test output for all test suites.
- Added "Archivos base y ciclo de vida" section to `prompt.md` to instruct agents on replacing bootstrap files.
- Added meta-test to detect remaining bootstrap tests (`dummy.spec.ts`) once real code is present in `src/`.
- Updated `audit` script to target production dependencies only.

### Fixed

- Robust coverage block detection in `vitest.config.ts`.
- Refined cross-platform slash detection to avoid false positives.
- Improved CHANGELOG.md verification to check for the current version's entry.
- Fixed `audit` script to target production dependencies only.
- Fixed relative import with extension for ESM in index tests.

## [1.4.18] - 2026-03-05

### Added

- Meta-test covering em dash in `.integrity-suite/docs/` files (previously excluded from `getFiles`).
- Meta-test verifying `lint-staged` config has ESLint, Prettier, and Markdownlint wired to the correct globs.
- Meta-test verifying `test:meta`, `test:unit`, and `test:e2e` are all present and in the correct order in the `test` script.
- Meta-test verifying the `prepare` script invokes `husky`.
- Meta-test detecting `exclude:` blocks inside the `vitest.config.ts` coverage section.

### Fixed

- Corrected `.gitignore` allowlist matching: removed the inverted `r.startsWith(norm)` condition that made any short prefix (e.g. `di`, `.e`) pass validation.

## [1.4.17] - 2026-03-05

### Added

- Meta-test blocking ESLint overrides that weaken critical AI-safety rules (`no-explicit-any`, `ban-ts-comment`, `no-console`, `no-warning-comments`) for `src/` or `tests/` paths.
- Meta-test auditing `.gitignore` against an allowlist of known-legitimate patterns to detect agent-hidden files.
- Per-file `allowedPatterns` in the linting ignore files test: `pnpm-lock.yaml` is now only permitted in `.prettierignore`, not in `.markdownlintignore`.

## [1.4.16] - 2026-03-05

### Added

- Meta-test blocking arbitrary tool directories (e.g. agent working dirs) from being added to `.prettierignore` or `.markdownlintignore` as a linting bypass.
- Meta-test forbidding `git add` inside the pre-commit hook, which silently defers staged changes to the next commit.

### Fixed

- Renamed `.integrity-suite/docs/REQUIREMENTS.md` to lowercase `requirements.md` to fix a case-sensitivity bug that caused all requirements tests to fail silently on Linux/CI.
- Removed leftover `.gemini` exclusion from `.prettierignore` and `.markdownlintignore`.
- Removed `git add pnpm-lock.yaml package.json` from the pre-commit hook: the staged snapshot is already computed when the hook runs, making the command ineffective and confusing.
- Upgraded `@commitlint/cli` and `@commitlint/config-conventional` from v19 to v20 to resolve known ESM config resolution issues.

## [1.4.15] - 2026-03-05

### Added

- Enforced English-only commit messages and forbidden scopes via two new git-history meta-tests and a custom `commitlint` plugin (`subject-ascii-only`) in `commitlint.config.js`.
- Added meta-test verifying the `commitlint` plugin configuration (rules and inline function) cannot be silently removed.

## [1.4.14] - 2026-03-05

### Added

- Added typographic rules blocking improper English-style usage of the "em dash" as an intra-sentence connector in Spanish Markdown documentation and code comments.

## [1.4.13] - 2026-03-05

### Added

- Added typographic rules blocking improper English-style usage of the "em-dash" (\u2014) as an intra-sentence connector over Spanish translations alongside the README/Requirements documentation (`tests/meta/integrity-suite.test.ts`).
- Included rule prohibiting "em-dash" injection over standard code comments ensuring linguistic compliance and ASCII purity.

## [1.4.12] - 2026-03-05

### Added

- Unforgeable cryptographic integrity check tracking any adversarial changes to `integrity-suite.test.ts` via SHA256 stored inside `.integrity-suite/integrity-suite.sha256`.
- Verified safety tracking of ignoring local `.env` values and arbitrary build output folders like `dist/` or `coverage/` directly in `.gitignore`.
- Blacklisted local bypass arguments injected over scripts masking husky or other git verifiers (`HUSKY=0`, `--no-verify`).
- TypeScript config fortified strictly rendering builds untrustworthy through blocking assertions over `allowJs`, `checkJs`, and enabling `noEmitOnError: true`.
- Testing discipline extended explicitly demanding standardized test file names, penalizing leftover `debugger` breakpoints and completely forbidding unit-tests accessing the OS file system via `fs`.
- `process.exit()` forcefully forbidden from general business logic modules (`src/`) rendering services intrinsically safe.
- Formidable constraints explicitly barring "Dependency Hygiene" defects forbidding duplicates, wildcard (`*`) bounding specs, or dependency type confusion (mixing dependencies targeting into development only paths).

### Fixed

- Prevented early manipulation bypassing window by ordering validation logically inside `.husky/pre-commit` making `git add` execute succeeding `validate-project`.
- Patched `check-version.js` strictly asserting semantic versioning increments via `/^\\d+\\.\\d+\\.\\d+$/` regular expressions.
- Corrected global language parsing checks in `integrity-suite.test.ts` to evade JSON format evaluation.
- Strictened hardcoded secret security policy strictly tying `.env` masking to existent tracking inside the Git Ignore.
- Erased legacy obsolete check around global `.npmrc` matching the PNPM workflow philosophy.
- Dropped aggressive scope restriction block (`scope-enum: never`) from the commit linter object allowing dynamic scopes in production implementations.
- Enforced instruction mapping over `.integrity-suite/docs/prompt.md` banning manual environment variables such as `HUSKY=0`.

## [1.4.11] - 2026-03-05

### Added

- Added pipeline safety expectation for ensuring `pnpm-lock.yaml` presence to guarantee reproducible builds.
- Mandated chronological descending sanity sorting check for the Requirements log history timeline.
- Configured protective timeouts by enforcing `vitest` `testTimeout` and `hookTimeout` properties in `vitest.config.ts`.
- Guardrails implemented bounding the size of all underlying files in `src/` to 300 LOC alongside its `src/components/` specific rule.
- Added explicit AI-safety assertion guaranteeing the baseline rules implementation (`no-explicit-any`, `no-console`, `ban-ts-comment`) in `.eslintrc.json`.
- Imposed rigorous validation against vitest config's coverage path forcing `include: ['src/**']` syntax as well as necessitating explicit existence of the instrumented `src/` mapping schema.

## [1.4.10] - 2026-03-05

### Fixed

- Fixed a typo inside the Level 4 Integrity Suite test name description ensuring grammatical correctness.
- Remedied a dysfunctional `.eslintrc.json` rule which failed to suppress warnings on `no-console` because its file matcher mistakenly targeted `"scripts/**/*.js"` rather than the existing `".integrity-suite/scripts/**/*.js"`.

## [1.4.9] - 2026-03-05

### Fixed

- Eliminated `@ts-expect-error` coverage masking from `vitest.config.ts`, ensuring it strictly conforms to standard compilation without silencing typescript. (Inclusion of `vitest/config` and `node` types in `tsconfig` enforces typing correctness.)
- Hardened Level 3 in the Integrity Suite to comprehensively reject `@ts-expect-error` occurrences alongside its existing `@ts-ignore` prohibition.
- Stripped remaining erroneous `src` argument from the `"test:unit"` script natively in `package.json`.

## [1.4.8] - 2026-03-05

### Fixed

- Strengthened test coverage metrics by enforcing `all: true` and `include: ['src/**']` inside `vitest.config.ts`, ensuring missing tests are properly detected array functionality additions.
- Secured the cross-platform path slashes check meta-test against false negatives by comparing absolute file paths instead of relying only on `basename`.
- Repaired `"test:unit"` script in `package.json` by removing `src` as an incorrect test folder specifier flag for Vitest.

## [1.4.7] - 2026-03-05

### Fixed

- Resolved pipeline inconsistencies: `npx lint-staged` now strictly uses `pnpm lint-staged`, and validation is enforced after `git add`.
- Replaced `--passWithNoTests` flag from unit testing, guaranteeing 100% coverage requires actual unit tests in the directories via dummy files injection.
- Evicted local `coverage/` directory from repository tracking via `.gitignore` caching removal.
- Expanded integrity suite string matching validations to include `console.error`/`console.warn`, account for template literal secrets detection, and avoid false-negative cross-platform tests parsing themselves.

## [1.4.6] - 2026-03-05

### Changed

- Enhanced ESM compatibility and cross-platform (macOS/Windows) node support. Scripts now utilize `node:` prefixes for core modules (`node:fs`, `node:child_process`, `node:url`, `node:path`).
- Replaced the generic `ts-node` development dependency with `tsx` to natively and cleanly support running TypeScript directly in true ESM environments without requiring custom loaders or failing on unrecognized file extensions.

## [1.4.5] - 2026-03-05

### Changed

- Updated `prompt.md` to explicitly state that all source code (comments, variables, functions) must remain in English/ASCII to prevent confusion and test failures due to the Level 4 Hygiene checks.

## [1.4.4] - 2026-03-05

### Changed

- Moved `check-changelog` and `check-version` execution before `test` in `validate-project` script to ensure metadata is validated earlier in the pipeline.
- Upgraded the metadata validation test to enforce the explicit sequence.

## [1.4.3] - 2026-03-05

### Fixed

- Added a robust structural validation test to `integrity-suite.test.ts` to prevent `.integrity-suite/docs/requirements.md` blocks from merging due to accidental missing headers. Ensures strict descending numeric sequence and no duplicate status entries per block.
- Modified the unapproved commit test output message to enforce the user's role ("...Approved by the user before committing").

## [1.4.2] - 2026-03-05

### Added

- Enforced a strict 100% test coverage threshold via `@vitest/coverage-v8` in `vitest.config.ts`.
- Added a new `Level 6: Testing & Coverage` block to the `Integrity Suite` test, assuring the test pipeline blocks any new untested code. `test:unit` now runs with the `--coverage` flag activated.

## [1.4.1] - 2026-03-05

### Security

- Hardened `.husky/pre-commit` hook validation in the `Integrity Suite` test. Added strict RegEx checks to assert not only that the string `pnpm validate-project` exists, but also to forbid common script bypass mechanisms such as preceding the command with `echo`, commenting it out (`#`), or introducing an early `exit 0`.

## [1.4.0] - 2026-03-05

### Changed

- Moved `tests/integrity-suite.test.ts` to `tests/meta/integrity-suite.test.ts` to logically separate it from future unit/e2e tests.
- Updated all internal project references (Prompts, Requirements, Workflows) to point to the new location.
- Removed sample `src/index.ts` file to establish an authentic blank project template.
- Separated testing strategy into `test:meta`, `test:unit`, and `test:e2e` scripts to allow sequential testing across different layers, enforcing all suites to succeed before commit.

## [1.3.5] - 2026-03-05

### Changed

- Hardened `integrity-suite.test.ts` by removing its own escape clauses from code hygiene checks (English-only comments, console.log, TODO/FIXME, bypass directives). The file now evaluates its own code dynamically to prevent internal escapes and guarantee universal rule application.

## [1.3.4] - 2026-03-05

### Fixed

- Refactored `getFiles` in `integrity-suite.test.ts` to use `fs.readdirSync` with `withFileTypes`. This guarantees configuration files at the root of the project (e.g., `.eslintrc.json`, `tsconfig.json`, `config.ts`) are correctly evaluated by security and hygiene checks, preventing false negatives.

## [1.3.3] - 2026-03-05

### Changed

- Enhanced hardcoded secret detection by including `.json` and `.env*` files in security scans.
- Improved secret scanning regex to detect complex assignments, object properties, and Base64-encoded strings.

## [1.3.2] - 2026-03-05

### Fixed

- Reinforced "Commit Lockdown" test to prevent bypasses. The test now strictly requires the existence of the "Historial de requerimientos" section and at least one documented requirement.

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
