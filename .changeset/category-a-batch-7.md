---
"@studnicky/eslint-config": patch
---

`hashPrivateFields.ts`'s `ClassMemberCheck.onParameterProperty` narrows a genuinely `unknown`-sourced identifier (resolved through a chain of `Reflect.get` calls, not a `RuleListener` callback parameter) through `AstHelpers.isNode` before passing it to a function requiring `Rule.Node`. `v8/arrayScanOutsideLoops.ts`'s `findDeclarationNode` reads `.name` — specific to `Identifier`, not common to the full `Rule.Node` union its parameter is typed for — through `AstHelpers.getNodeProperty`, narrowed to a real `string` with an explicit type check immediately after, instead of asserting the field's presence and type together in one cast.
