import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { AstHelpers } from '../shared/astHelpers.js';
import {
  FUNCTION_TYPES, LOOP_TYPES
} from '../shared/constants/LoopContextConstants.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ComputedClassPropertiesConstants.js';

// WHY "BREAKS HIDDEN CLASSES" WAS FALSE, AND WHAT IS TRUE INSTEAD.
//
// The selector inherited from an earlier revision (`ClassExpression Property[computed=true]`)
// matched NOTHING: `Property` nodes never occur in a class body — class members parse as
// `MethodDefinition`/`PropertyDefinition`. The rule enforced nothing while enabled at
// `error`. That is fixed here (`ClassBody > PropertyDefinition[computed=true]` /
// `ClassBody > MethodDefinition[computed=true]`, direct-child so a NESTED class's own
// members are not double-matched through the outer class's descendant selector — the same
// fix `computedObjectProperties` already made for its own selector).
//
// With the selector actually firing, the underlying "breaks hidden classes" claim is ALSO
// false for the common case. A class body's computed keys are evaluated exactly ONCE, at
// class-definition time (spec-guaranteed) — every instance of that one class shares
// whatever shape resulted. There is no per-instance divergence to guard against:
//
//   node --allow-natives-syntax
//   class WithComputedField { [KEY_CONST] = 1; a = 2; }
//   class WithSymbolIterator { a = 1; *[Symbol.iterator]() { yield this.a; } }
//   class WithRandomKey { a = 1; [`f_${Math.random() > -1 ? 'x' : 'y'}`] = 2; }
//   %HaveSameMap(new WithComputedField(), new WithComputedField())    -> true
//   %HaveSameMap(new WithSymbolIterator(), new WithSymbolIterator())  -> true
//   %HaveSameMap(new WithRandomKey(), new WithRandomKey())            -> true
//   %HasFastProperties(new WithComputedField())                       -> true
//
// Every one of those stays fast and uniform, REGARDLESS of what the key expression is —
// even a "random" one — because the class only ever runs its body once.
//
// The one place a computed class member key IS provably risky: a class DECLARATION or
// EXPRESSION nested inside a function or loop, where it re-evaluates on every call/iteration
// and the key is not a compile-time constant. Each call can then mint a genuinely different
// runtime class, and if those instances end up pooled and read together (a common pattern:
// building several small classes from a factory, then treating them uniformly), the access
// site goes megamorphic. Benchmarked at 5,000,000 reads across an 8-instance pool, median of
// 7, 3-call warm-up (scratchpad/bench_computedClassFactory.js):
//
//   monomorphic pool (class declared once, fixed key)        5.33 ms
//   polymorphic pool (class factory, key varies per call)   16.01 ms   3.0x
//
// So the rule now flags a computed member key ONLY when BOTH hold:
//   1. The key is not a literal and not a well-known symbol (`Symbol.iterator`, etc.) — see
//      below for well-known symbols specifically.
//   2. The class is lexically nested inside a function or loop (so it can be re-evaluated
//      with a different key across separate calls/iterations). A class declared once at
//      module top-level (or inside another class body evaluated once) is exempt outright —
//      proven safe above, regardless of what the key expression is.
//
// WELL-KNOWN SYMBOLS ARE EXEMPT UNCONDITIONALLY, EVEN INSIDE A RECURRING SCOPE.
// `[Symbol.iterator]` has NO non-computed spelling in JavaScript. Flagging it made
// implementing an iterable impossible — PROVEN on real production code:
// `packages/errors/src/errors/ValidationErrors.ts:140` was reported by this rule (and by
// `dynamic-property-access`) before this fix, for exactly this pattern. A well-known symbol
// is a compile-time constant, not a dynamic key. Matches `dynamicPropertyAccess.ts`'s
// `KeyClassification.isStaticKey` well-known-symbol branch — see that file for the same
// reasoning applied to member access instead of a class member key.
//
// PAIRED RULES:
//   * `computed-object-properties` — the equivalent hazard for object-literal creation
//     (variable key, not class-factory key). Both rules exempt well-known symbols for the
//     same "unimplementable otherwise" reason, and both target CREATION-time key instability
//     rather than access.
//   * `conditional-property-assignment` — a DIFFERENT mechanism (branch-dependent
//     `this.x = ...`/`defineProperty`) reaching the same kind of per-instance shape
//     divergence this rule targets for the class-factory case.

class KeyClassification {
  /** A well-known symbol computed key (`[Symbol.iterator]`, `[Symbol.asyncIterator]`, …) — a compile-time constant with no non-computed spelling. */
  public static isWellKnownSymbol(keyNode: unknown): boolean {
    if (!Predicates.isRecord(keyNode) || keyNode.type !== 'MemberExpression') {
      return false;
    }

    const result = AstHelpers.getIdentifierName(keyNode.object) === 'Symbol';
    return result;
  }

  /** A literal computed key (`['fixedName']`) — resolved once, identical every time the enclosing class evaluates. */
  public static isLiteral(keyNode: unknown): boolean {
    const result = AstHelpers.getNodeType(keyNode) === 'Literal';
    return result;
  }
}

class RecurringScope {
  /** True when `classNode` is lexically nested inside a function or loop — i.e. it can be re-evaluated, minting a distinct runtime class each time. */
  public static wraps(classNode: Rule.Node): boolean {
    let current: Rule.Node | null = classNode.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type) || LOOP_TYPES.has(current.type)) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }
}

class ClassMemberScope {
  /** Nearest enclosing `ClassDeclaration`/`ClassExpression` of a class member node. */
  public static findEnclosingClass(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (current.type === 'ClassDeclaration' || current.type === 'ClassExpression') {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }
}

export const computedClassProperties: Rule.RuleModule = {
  'create': (context) => {
    const checkMember: (node: Rule.Node) => void = (node) => {
      const raw = node as unknown as { readonly 'key': unknown };

      if (KeyClassification.isWellKnownSymbol(raw.key) || KeyClassification.isLiteral(raw.key)) {
        return;
      }

      const classNode = ClassMemberScope.findEnclosingClass(node);

      if (classNode === undefined || !RecurringScope.wraps(classNode)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return {
      'ClassBody > MethodDefinition[computed=true]': checkMember,
      'ClassBody > PropertyDefinition[computed=true]': checkMember
    };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
