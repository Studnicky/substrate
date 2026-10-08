---
"@studnicky/concurrency": patch
"@studnicky/fetch": patch
---

Adds a real-browser test harness (Playwright-driven Chromium, Firefox, WebKit) alongside the existing Node-simulated `--conditions=browser` suite, and splits `@studnicky/fetch`'s `FetchTransport` browser spec so its plain client-contract tests run in real browsers while its `ScenarioSuite`-driven table tests stay on the Node path. Fixes a check-then-write race in `@studnicky/concurrency`'s `exitWorker` test fixture, closing a CodeQL file-system-race finding. Removes every package's `CHANGELOG.md`: changesets are now the only changelog mechanism. Pins `shell-quote`, `source-map-js`, and `katex` to patched versions, resolving the open Dependabot advisories.
