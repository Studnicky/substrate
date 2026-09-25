---
"@studnicky/eslint-config": patch
---

`ReceiverOrigin.isProvenLoopLocal` reads `declarationNode.range`/`loopNode.range` directly instead of through a cast asserting `readonly [number, number]` where `@types/estree`'s `BaseNode` actually declares `range?: [number, number] | undefined`. The cast's non-optional literal type let the code check its four derived `.at()` results for `undefined` three lines after already dereferencing a possibly-absent tuple, so a missing `range` (parser configured without `range: true`) would have thrown before that guard ever ran. Destructuring each tuple directly under a single `declRange !== undefined && loopRange !== undefined` guard collapses the four-way check to two and can no longer throw on the case it exists to guard against.
