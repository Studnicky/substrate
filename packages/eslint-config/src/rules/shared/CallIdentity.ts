import type { Rule } from 'eslint';
import type ts from 'typescript';

import { Predicates } from '@studnicky/types';

import { AstHelpers } from './astHelpers.js';

// WHY CALL IDENTITY IS RESOLVED, NEVER MATCHED BY NAME.
//
// A rule that asks "is this `concat`?" by reading `callee.property.name` is really
// asking "is this SPELLED concat?" — and that question is wrong in both directions.
// Both failure modes were reproduced against the previous name-matching
// implementation of `array-concat-outside-loops`:
//
//   FALSE NEGATIVE — the hazard, invisible:
//     const CONCAT = 'concat' as const;
//     for (...) { result = result[CONCAT](chunk); }     // 0 errors reported
//
//   FALSE POSITIVE — safe code, reported:
//     class Rope { concat(other: Rope): Rope { ... } }
//     for (...) { acc = acc.concat(ropes[i]); }         // reported as an Array
//                                                       // allocation. None occurs.
//
// The old implementation spent ~195 lines chasing spellings — a `.call`/`.apply`
// indirection check, a hand-rolled scope-chain walk that matched variables BY NAME,
// const-alias resolution, and same-file helper reachability — and a two-line computed
// access defeated all of it. Enumerating evasions cannot work: the set is unbounded,
// and every miss fails silently, which is indistinguishable from "no violations."
//
// `checker.getResolvedSignature()` answers the real question once. Verified:
//
//   "result.concat(other)"     -> Array.concat  from lib.es5.d.ts
//   "result['concat'](other)"  -> Array.concat  from lib.es5.d.ts
//   "result[CONCAT](other)"    -> Array.concat  from lib.es5.d.ts
//   "rec['whatever']()"        -> (no declaration)  from src.ts
//
// All three spellings collapse to one signature; the user-defined method does not.
//
// NOTE — `getSymbolAtLocation` does NOT work for this. It returns `undefined` for an
// ElementAccessExpression, so `result['concat']` and `result[CONCAT]` both resolve to
// nothing. That was tried first and measured to fail. Use `getResolvedSignature` on
// the CALL, not a symbol lookup on the callee.
//
// THE `lib.*.d.ts` ORIGIN CHECK IS LOAD-BEARING. It is what distinguishes
// `Array.prototype.concat` from a user type that happens to declare `concat`.
// Without it this module would reproduce the false positive it exists to remove.
//
// COST, ACCEPTED DELIBERATELY: consumers require type services. Without
// `projectService` they resolve nothing and their rules go silent — the same posture
// as `forOfArrays` and `dynamicPropertyAccess`. A rule that is evadable by renaming a
// variable is not enforcing anything, so silence-without-types beats
// confidence-without-truth.

// The match target is passed as two plain parameters (method name, owning interfaces)
// rather than bundled into a `{ method, owners }` shape. A bundle would need to be
// either an interface — which `single-export` forbids alongside the class, and which
// `interfaces-compose-named-types` rejects for carrying bare `string` members — or a
// schema-derived entity, which cannot express `ReadonlySet<string>` in JSON Schema.
// Two parameters need no such contortion and read the same at every call site.

class DeclarationNames {
  /** Reads a TypeScript node's `.name` as source text, when it has one. */
  public static of(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    const name = node.name;

    if (!Predicates.isRecord(name) || typeof name.getText !== 'function') {
      return undefined;
    }

    const text: unknown = name.getText();
    const result = typeof text === 'string' ? text : undefined;

    return result;
  }

  /**
   * True when the declaration comes from a TypeScript lib file (`lib.es5.d.ts`,
   * `lib.dom.d.ts`, …) rather than from project or dependency source. This is the
   * check that separates a genuine built-in from a same-named user method.
   */
  public static isFromStandardLibrary(declaration: ts.Declaration): boolean {
    const fileName = declaration.getSourceFile().fileName;
    const basename = fileName.slice(fileName.lastIndexOf('/') + 1);

    const result = basename.startsWith('lib.') && basename.endsWith('.d.ts');

    return result;
  }
}

export class CallIdentity {
  /**
   * True when `node` resolves to one of `methods` declared on one of `owners` in the
   * standard library — independent of how the callee was spelled. Dot access,
   * computed literal, and computed const binding all resolve identically.
   *
   * Returns `false` when type services are unavailable, so consumers go silent rather
   * than guessing. See the module comment for why that trade is deliberate.
   */
  public static isBuiltinCall(
    node: Rule.Node,
    context: Rule.RuleContext,
    methods: ReadonlySet<string>,
    owners: ReadonlySet<string>
  ): boolean {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return false;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (tsNode === undefined) {
      return false;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const signature = checker.getResolvedSignature(tsNode as ts.CallLikeExpression);

    const declaration = signature?.declaration;

    if (declaration === undefined) {
      return false;
    }
    if (!DeclarationNames.isFromStandardLibrary(declaration)) {
      return false;
    }
    const resolvedMethod = DeclarationNames.of(declaration);

    if (resolvedMethod === undefined || !methods.has(resolvedMethod)) {
      return false;
    }

    const owner = DeclarationNames.of(declaration.parent);

    if (owner === undefined) {
      return false;
    }

    const result = owners.has(owner);

    return result;
  }
}
