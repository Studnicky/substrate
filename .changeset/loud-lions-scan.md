---
"@studnicky/eslint-config": minor
---

`@studnicky/v8` gains three loop-performance rules covering all loop types (`for`, `while`, `do...while`, `for...of`, `for...in`): `array-splice-outside-loops` flags `.splice()` calls inside a loop body, and `chained-array-iteration` flags `.map().filter()`/`.filter().map()` chains anywhere in the file.

`array-scan-outside-loops` flags `.find()`/`.filter()`/`.indexOf()`/`.includes()`/`.some()`/`.every()` calls inside a loop body, type-checked against the receiver to distinguish a real array scan from `String.prototype.indexOf`/`.includes()` (same method names, different complexity story), and scoped-checked to skip a receiver proven to be freshly derived every iteration (a `for...of` loop's own binding, or a `const` declared inside the loop body) rather than the same stable collection re-scanned each time.
