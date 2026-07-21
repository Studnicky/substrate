---
"@studnicky/eslint-config": major
---

### Changed

- The package root is the sole code entrypoint. It exports `plugin`, `v8Plugin`, and the suite presets; individual rule objects are consumed through `plugin.rules` or `v8Plugin.rules` rather than named exports.
