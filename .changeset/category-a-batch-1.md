---
"@studnicky/eslint-config": patch
---

`v8/evalFunction.ts`'s two `RuleListener` callbacks already declared the precise listener-derived parameter type (`NonNullable<Rule.RuleListener['VariableDeclarator']>`, `...['CallExpression']>`) and then re-widened `node` to `Record<string, unknown>` inside the body before reading `.id`/`.init`/`.callee` — those fields are already directly typed and accessible on the declared parameter with no cast. `v8/computedClassProperties.ts` and `v8/computedObjectProperties.ts` match a custom esquery selector (`'ClassBody > MethodDefinition[computed=true]'`), not a single named `RuleListener` key, so their callbacks stay `(node: Rule.Node) => void`; reading `.key`/`.callee` off that genuinely-wide union now goes through `AstHelpers.getNodeProperty`, the same generic, non-casting property reader already used elsewhere in this package, instead of an anonymous single-property cast.
