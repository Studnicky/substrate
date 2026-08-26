---
'@studnicky/intake-kit': patch
---

Adds the missing `tsconfig.json` project reference to `@studnicky/types`, fixing a `tsc -b`
build-order failure ("Cannot find module '@studnicky/types'") on a from-scratch build.
