# Changelog

## 15.0.0

### Major Changes

- 91ca066: Every source file reachable from a package's `./browser` export imports its workspace dependencies through their own `/browser` entrypoint rather than `/node`, so a package's browser build no longer pulls in a dependency's Node-only implementation. A package whose `/node` and `/browser` builds previously diverged only by accident of which entrypoint a transitive import happened to resolve to now gets the browser-safe implementation consistently through its whole reachable graph.

### Patch Changes

- Updated dependencies [cf88dc6]
- Updated dependencies [91ca066]
- Updated dependencies [f66779c]
- Updated dependencies [ebd9f1c]
- Updated dependencies [bb7bb62]
- Updated dependencies [4d24d54]
- Updated dependencies [c91c4eb]
- Updated dependencies [b554549]
- Updated dependencies
- Updated dependencies [5681045]
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
- Updated dependencies [79e33e6]
- Updated dependencies [5374a59]
  - @studnicky/types@15.0.0
  - @studnicky/errors@15.0.0
  - @studnicky/matching@15.0.0

## 14.0.0

### Patch Changes

- Updated dependencies [4d4555f]
  - @studnicky/types@14.0.0
  - @studnicky/errors@14.0.0
  - @studnicky/matching@14.0.0

## 13.0.0

### Patch Changes

- Updated dependencies [95c7c69]
  - @studnicky/errors@13.0.0
  - @studnicky/matching@13.0.0
  - @studnicky/types@13.0.0

## 12.2.0

### Patch Changes

- @studnicky/errors@12.2.0
  - @studnicky/matching@12.2.0
  - @studnicky/types@12.2.0

## 12.1.1

### Patch Changes

- @studnicky/errors@12.1.1
  - @studnicky/matching@12.1.1
  - @studnicky/types@12.1.1

## 12.1.0

### Patch Changes

- Updated dependencies [aa12145]
  - @studnicky/types@12.1.0
  - @studnicky/errors@12.1.0
  - @studnicky/matching@12.1.0

## 12.0.1

### Patch Changes

- Updated dependencies [ae381ef]
  - @studnicky/types@12.0.1
  - @studnicky/errors@12.0.1
  - @studnicky/matching@12.0.1

## 12.0.0

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/matching@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Minor Changes

- `@studnicky/topic-router` provides composable topic subscription registration, selected-ID resolution, immutable delivery envelopes, and fan-out.
