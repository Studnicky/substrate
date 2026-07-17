---
"@studnicky/eslint-config": patch
---

Fixed three pre-existing precision bugs surfaced by dogfooding the full rule set against real code for the first time:

- `PropertyKeyName.get` only resolved unquoted (`key:`) property keys, never quoted (`'key':`) ones — since this repo's own `quote-props: always` convention quotes every property key, the `inlineFunctions`/`inlineArrowFunctions` rules' `EXEMPT_KEYS` allowlist never actually matched anything. Now resolves both forms.
- `inlineArrowFunctions`'s `EXEMPT_KEYS` gains `'message'`, alongside the existing `'callback'`/`'handler'`/etc. — a single caller-supplied callback property in an options object is not a dispatch-map branch.
- `folderContentShape`'s `isUnderFolder` matched a `types`/`interfaces` path segment anywhere in the file path, including a package's own root name (e.g. `packages/types/`) — incorrectly treating any package literally named `types` or `interfaces` as if every file inside it lived under a `types/`/`interfaces/` convention subfolder. Now only matches real subfolders within the package.
