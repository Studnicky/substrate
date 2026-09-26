---
"@studnicky/eslint-config": minor
---

Adds `@studnicky/no-circular-imports`, an arch-suite rule that reports an import or re-export whose target module can reach back to the importing file — a circular import, `type`-only or not. It builds the linted file's `packages/*/src` module import graph directly from the TypeScript `Program` (`ModuleImportGraph`, partitioned into strongly-connected components with an iterative Tarjan's algorithm, cached per-`Program`), so it never shells out to `madge` or another external tool. `LayerBoundarySuite` enables it at `error` alongside the other five layer-boundary rules, and the root `eslint.config.ts` enables it directly since that config lists rules inline rather than importing the suites.

The repo-local `scripts/check-no-circular-imports.ts` (a `madge`-backed script wired into the root `lint` script) is removed — the rule is the one implementation of this check now, exported for every consumer of the package instead of enforced only inside this repository.
