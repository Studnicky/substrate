---
"@studnicky/eslint-config": patch
---

### Fixed

- Type-contract classification treats an indexed type as its element type alone. A resolved array's own members are prototype methods supplied by the standard library — `push`, `map`, `filter` and friends each own a call signature — so enumerating them classified every array as callable. The effect was position-dependent and therefore easy to miss: an array nested in an object property passed, while the same array at a type alias's root was always rejected as "not pure data".
