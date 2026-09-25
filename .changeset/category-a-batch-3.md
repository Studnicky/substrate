---
"@studnicky/eslint-config": patch
---

`v8/chainedArrayIteration.ts` no longer imports `AstNodeInterface`. `IterationCall.matches` narrows an `unknown` node through `AstHelpers.isNode` before checking `.type`, instead of a `Predicates.isRecord` check plus a cast into `Rule.Node`. `hasEarlierIterationCallInChain` takes `Rule.Node` directly and reads `.callee` through `AstHelpers.getNodeProperty`. `StatementIndex.locate` and the two `RuleListener` callbacks that call into it read `.parent` and narrow `.type` on already-real `Rule.Node` values with no cast at all; `StatementLocationInterface.block` is `Rule.Node`, not the anonymous `AstNodeInterface` bag, which is what let the `'block': parent` assignment compile without a cast in the first place — `AstNodeInterface`'s bare index signature rejects a real narrowed node type on assignment even though every property value it holds satisfies `unknown`.
