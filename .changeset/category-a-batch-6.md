---
"@studnicky/eslint-config": patch
---

`v8/prototypeModification.ts`'s two `RuleListener` callbacks already carried the precise listener-derived parameter type and re-widened it before reading `.left`/`.arguments`, fields already directly typed on the declared parameter. `v8/deleteProperty.ts`, `v8/dynamicPropertyAccess.ts`, and `v8/objectSpread.ts` read node-type-specific fields (`.key`, `.kind`, `.value`, `.computed`, `.left`, `.argument`, `.operator`) off a `Rule.Node`-typed parameter through `AstHelpers.getNodeProperty` instead of casting to `Record<string, unknown>` first, and narrow a genuinely `unknown`-sourced value (an array element, a member's `.object`, a call argument) through `AstHelpers.isNode` before treating it as `Rule.Node`. `objectSpread.ts`'s `findSiblingConstructor` reads `.body` directly off a `ClassBody`-narrowed `Rule.Node` — a real, directly-typed field once narrowed via a `.type` check — instead of casting the whole node first.
