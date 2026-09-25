---
"@studnicky/eslint-config": patch
---

`preferCollectionTypes.ts`, `v8/tryCatchInLoops.ts`, `v8/inlineCallablePosition.ts`, and `shared/CallIdentity.ts` read a node's `.parent` through `AstHelpers.getParent` instead of an `as unknown as { readonly 'parent'?: unknown }` cast. Every one of these reads is off a `Scope.Reference.identifier` (`@types/eslint`'s `Scope.Reference.identifier: ESTree.Identifier` carries no `NodeParentExtension`, though ESLint's traverser always attaches `.parent` at runtime) except `CallIdentity.ownerNameOf`, whose `declaration.parent.parent` walks the TypeScript compiler AST's own `ts.Node.parent`, a non-optional, directly-typed property that never needed a cast at all.
