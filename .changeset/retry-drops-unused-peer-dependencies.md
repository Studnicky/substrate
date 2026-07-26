---
"@studnicky/retry": patch
---

### Changed

- `@studnicky/retry` declares only the dependencies it imports. `@studnicky/logger` and `@studnicky/timing` are absent from the manifest; `Retry`'s lifecycle hooks remain the extension point for logging, timing, and metrics, and a consumer wires those packages in its own code.
