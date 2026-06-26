# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-06-25

### Removed (Breaking)

- `createEslintConfig` factory function removed. The package is consumed as a standard ESLint plugin: register `plugin` and `v8Plugin` in your flat config directly.
- `EslintConfigOptionsType` type removed.
- `@studnicky/config` runtime dependency dropped; the package now has no runtime dependencies.

## [1.0.0] - 2026-06-22

### Added

- ESLint 9 flat config factory (`createEslintConfig`) with optional `tsconfigRootDir` configuration, targeting TypeScript source files with typescript-eslint projectService integration.
- Custom ESLint plugin with four rules: `no-bind-apply-call`, `no-suppression-comments`, `no-trivial-shim`, and `single-export`.
- V8-optimization rules config array available via the `@studnicky/eslint-config/v8` export.
- Integrated rule sets from typescript-eslint, @stylistic/eslint-plugin, eslint-plugin-perfectionist, eslint-plugin-import-x, eslint-plugin-regexp, and eslint-plugin-unused-imports.
