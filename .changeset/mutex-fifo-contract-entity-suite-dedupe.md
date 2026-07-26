---
"@studnicky/mutex": patch
"@studnicky/eslint-config": patch
---

### Changed

- `Mutex` documents its FIFO acquisition contract: waiters queued behind a held lock are granted access in request order, and a burst of queued waiters that time out together reject in that same order. Documented on the class TSDoc and in the README's new "Ordering" section, and referenced from the `burst-timeout-drains-queue` scenario so the exact-order assertion reads as contract verification.
- `entitySuite`'s hand-written duplicate test (`entitySuite.test.ts`) is removed in favor of its data-driven equivalent (`entitySuite.loop.spec.ts` / `entitySuite.scenarios.json`), which gains the three `assigns-owning-rule` fixtures (naked type-alias-to-interface, suffix-collision pure data, dual-remediation contract) it was missing.
