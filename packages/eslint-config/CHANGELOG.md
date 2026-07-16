# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New `folder-content-shape` rule enforces that `interfaces/` folders hold `interface` declarations, `types/` folders hold `type` alias declarations, and other folders keep data constants (regex, enums, frozen collections) grouped under a `constants/` folder (or `fixtures/` for test/example data). Regex literals are zero-tolerance — a single inline regex is flagged, unlike the 2+ threshold for other constants. Merges the former `folder-declaration-shape`, `constants-folder-required`, and `entity-namespace` rules.
- New `type-alias-invariants` rule merges the former `type-alias-must-end-type`, `no-readonly-in-data-type`, `no-type-aliasing`, `types-derived-from-schema`, and `no-prefer-existing-type` rules into one shared visitor with five independently toggleable checks. Types imported from external (`node_modules`) packages are automatically exempt from schema-derivation via real type-checker resolution.
- New hexagonal-architecture rule category: `layer-import-boundary`, `domain-purity`, `adapter-only-import`, and `known-types-outside-adapters` (bans `any`/`unknown` outside a configurable adapters layer). `HexagonalSuite.create(...)` wires all four from one shared layers/sourceRoot configuration.
- New `whole-canonical-types` rule bans deriving `Partial<X>`/`Pick<X, K>`/`Omit<X, K>` from any canonical, codebase-owned named type or interface — no directive-comment exemption.
- New domain-grouped suite/preset configs — `entitySuite`, `hygieneSuite`, `v8Suite`, and `HexagonalSuite.create(...)` — for one-import consumption.

### Changed

- **Breaking:** every rule id previously framed as a prohibition (`no-*`) is renamed to a positive framing: `no-any-unknown-outside-adapters`→`known-types-outside-adapters`, `no-bind-apply-call`→`direct-invocation-only`, `no-concat-in-loops`→`array-concat-outside-loops` (`@studnicky/v8`), `no-export-alias`→`canonical-export-names`, `no-freestanding-verb-noun`→`static-method-verbs`, `no-partial-canonical-type`→`whole-canonical-types`, `no-project-internal-acronyms`→`descriptive-identifiers`, `no-spread-in-loops`→`array-spread-outside-loops` (`@studnicky/v8`), `no-suppression-comments`→`clean-diagnostics`, `no-this-alias`→`lexical-this-only`, `no-trivial-shim`→`inline-trivial-logic`, `no-underscore-private`→`hash-private-fields`. Rule behavior and `messageId`s are unchanged — only the rule id, exported symbol, and filename changed.
- **Breaking:** the package now depends on `@studnicky/types` (`workspace:*`) as a real runtime dependency, ending its previous zero-runtime-dependency design — required so `type-alias-invariants` can derive its own options type via `FromSchema` instead of hand-declaring a parallel type.
- `static-method-verbs` (formerly `no-freestanding-verb-noun`) no longer detects violations via a hardcoded verb-prefix name list; it uses real structural (and optionally type-aware) AST analysis via a configurable `mode` option. `single-export`'s error-class detection resolves the superclass through the TypeScript type checker instead of a `"Error"`-suffix name check.

## [5.0.0] - 2026-07-08

### Changed

- **Breaking:** `@studnicky/no-export-alias` now forbids every non-index re-export path. Outside `index.*` files, the rule rejects `export { Foo } from './foo.js'`, `export * from './foo.js'`, and forwarding an imported binding such as `import { Foo } from './foo.js'; export { Foo };`. The same restriction now applies to type-only imports and exports.
- **Breaking:** `@studnicky/single-export` now recognizes restricted topology both as directories (`constants/`, `entities/`, `errors/`, `interfaces/`, `types/`) and as fractal filename suffixes such as `client.constants.ts` and `request.types.ts`. Constant modules within that topology must export `SCREAMING_SNAKE_CASE` symbols only, and enum exemptions now apply only to files whose exports are limited to enums and const values.
- `@studnicky/no-suppression-comments` now rejects coverage suppression markers including `c8 ignore`, `c8-ignore`, and `istanbul ignore entirely`, in addition to the existing lint and TypeScript suppression comments.

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
