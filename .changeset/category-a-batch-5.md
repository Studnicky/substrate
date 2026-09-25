---
"@studnicky/eslint-config": patch
---

`arch/EntityIntake.ts`, `arch/intakeParseOnly.ts`, `arch/noUnparsedAssertion.ts`, `arch/domainPurity.ts`, and `arch/noThreadedVocabulary.ts` read node-type-specific fields (`.id`, `.key`, `.params`, `.expression`, `.typeAnnotation`, `.accessibility`) off a `Rule.Node`-typed parameter through `AstHelpers.getNodeProperty` instead of casting the whole node to `Record<string, unknown>` first; direct fields already exposed by `Rule.Node` itself (`.type`, `.parent`) are read directly.

`EntityIntake.ts`'s `#isUnexported`/`#isInEntityNamespace` compare `.type` against `'TSModuleBlock'`/`'TSModuleDeclaration'` — TypeScript-ESLint node types `@types/eslint`'s `Rule.Node` union doesn't include, so TypeScript rejected the direct comparison as having no possible overlap (`TS2367`) once the cast that was hiding it came off. These now read through `AstHelpers.getNodeType`, which already exists in this package for exactly this reason: it returns a plain `string`, not the narrow ESTree-only union, so a TypeScript-specific type name compares cleanly. `domainPurity.ts`'s `callee` and `noThreadedVocabulary.ts`'s parameter binding are genuinely `unknown`-shaped values (not sourced from a `RuleListener` callback parameter) narrowed through `AstHelpers.isNode` before being passed to a function requiring `Rule.Node`.
