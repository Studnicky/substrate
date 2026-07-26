---
"@studnicky/eslint-config": patch
"@studnicky/errors": patch
---

### Changed

- `@studnicky/errors`' `constants/index.ts` declares `ErrorCode`, `HttpStatus`, and `ErrorDefaults` directly and holds nothing else, making it a pure constants module. `CAUSE_CHAIN_DEPTH_LIMIT`/`CAUSE_DEPTH_SENTINEL` and the classifier HTTP-range constants re-export from `constants/CauseChainConstants.js` and `constants/ClassifierConstants.js` directly through the package's `src/index.ts` instead of routing through `constants/index.ts`. The package's exported symbols are unchanged.
- The `DomainErrorArgs.build()` example names its message builder as a static method, so the message function is allocated once rather than per construction.
- `folder-content-shape`'s constants-placement diagnostic no longer claims a flagged file "lives outside a 'constants/' folder" — a claim that no longer holds now the check is structural rather than path-based, and one a file already inside a `constants/` folder could trip. The message (renamed from `mustLiveInConstantsFolder` to `constantsNotIsolated`) instead states the actual structural condition: the file mixes top-level constants with other declarations (re-exports, functions, classes, or mutable bindings), so it isn't a self-contained constants module, and recommends extracting the constants into their own isolated file.
