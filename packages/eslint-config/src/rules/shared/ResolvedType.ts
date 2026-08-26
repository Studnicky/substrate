import type { Rule } from 'eslint';

import { type Node, type Program, TypeFlags } from 'typescript';

import { ObjectGuard } from './ObjectGuard.js';

// WHY THE TYPE, AND NOT THE SYNTAX.
//
// `intake-parse-only` and `no-unparsed-assertion` both hinge on one question: is this value
// unparsed — that is, is its type `unknown` or `any`? Asking that question SYNTACTICALLY, by
// matching `TSUnknownKeyword` / `TSAnyKeyword` annotations, makes the boundary bypassable without
// a suppression. Two bypasses were found in this repository, both of which produced a green lint
// run while changing nothing:
//
//   static value(value: unknown extends unknown ? unknown : never): unknown
//
//     A conditional type that resolves to exactly `unknown`, but parses as `TSConditionalType`.
//     Eight of these were written across `errors` and `json` purely to silence the rule.
//
//   type Anything = unknown;
//   static value(value: Anything): string
//
//     A one-line alias defeats the same check.
//
// Resolving the parameter's TYPE through the TypeScript checker answers the real question, so
// none of those forms escape. A boundary that can be stepped over by renaming a type is not a
// boundary.
//
// NOT HANDLED HERE, DELIBERATELY: the phantom generic, `static value<T>(value: T): string`, where
// a type parameter is used once in a parameter position and never flows into the return type. It
// is semantically identical to `unknown`, but its resolved type is a type PARAMETER, not `unknown`,
// so this check cannot see it — and widening the check to cover unconstrained type parameters would
// also condemn `Clone.deep<T>(value: T): T`, where the generic genuinely preserves the caller's
// type. `@typescript-eslint/no-unnecessary-type-parameters` identifies exactly the single-use case
// and is enabled repo-wide for that reason. The two checks are complementary; neither alone closes
// the hole.

interface TypeScriptNodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface TypeScriptServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': TypeScriptNodeMapInterface;
  readonly 'program': Program;
}

/** Resolves an ESTree node's TypeScript type to answer whether it is unparsed (`unknown`/`any`). */
export class ResolvedType {
  /**
   * Reports whether `node`'s RESOLVED type is `unknown` or `any`, regardless of how it was
   * written. Returns `false` when type information is unavailable, so a rule degrades to silence
   * rather than to false positives on a project without a type-aware parser.
   */
  public static isUnparsed(context: Rule.RuleContext, node: unknown): boolean {
    const services: unknown = context.sourceCode.parserServices;

    if (!ResolvedType.hasTypeInformation(services)) {
      return false;
    }

    const typeScriptNode = services.esTreeNodeToTSNodeMap.get(node);

    if (typeScriptNode === undefined) {
      return false;
    }

    const checker = services.program.getTypeChecker();
    const resolved = checker.getTypeAtLocation(typeScriptNode);
    const result = (resolved.flags & (TypeFlags.Any | TypeFlags.Unknown)) !== 0;

    return result;
  }

  /** Reports whether the parser exposed a TypeScript program and node map. */
  public static hasTypeInformation(value: unknown): value is TypeScriptServicesInterface {
    if (!ObjectGuard.isObject(value)) {
      return false;
    }

    const nodeMap = value.esTreeNodeToTSNodeMap;
    const program = value.program;
    const result = ObjectGuard.isObject(nodeMap)
      && typeof nodeMap.get === 'function'
      && ObjectGuard.isObject(program)
      && typeof program.getTypeChecker === 'function';

    return result;
  }
}
