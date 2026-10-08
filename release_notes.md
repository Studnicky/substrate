### browser-testing-changesets-security

*Affects: @studnicky/concurrency, @studnicky/fetch*

Adds a real-browser test harness (Playwright-driven Chromium, Firefox, WebKit) alongside the existing Node-simulated `--conditions=browser` suite, and splits `@studnicky/fetch`'s `FetchTransport` browser spec so its plain client-contract tests run in real browsers while its `ScenarioSuite`-driven table tests stay on the Node path. Fixes a check-then-write race in `@studnicky/concurrency`'s `exitWorker` test fixture, closing a CodeQL file-system-race finding. Removes every package's `CHANGELOG.md`: changesets are now the only changelog mechanism. Pins `shell-quote`, `source-map-js`, and `katex` to patched versions, resolving the open Dependabot advisories.

### minimize-dependency-overrides

*Affects: @studnicky/types*

Removes the `shell-quote` and `source-map-js` entries from `pnpm.overrides`: both already resolve to their patched versions through the existing dependency tree's own declared ranges (`launch-editor`'s `^1.10.0` and `@vue/compiler-core`'s `^1.2.1`), so forcing them was unnecessary. Keeps the `katex` override, which genuinely exceeds what `mermaid`/`@mermaid-js/mermaid-cli` currently declare support for — no newer release of either exists yet.
