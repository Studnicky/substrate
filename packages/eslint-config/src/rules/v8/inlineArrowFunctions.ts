import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { DeclareThenReturnShape } from '../shared/DeclareThenReturnShape.js';
import { InlineCallablePosition } from './inlineCallablePosition.js';

// PROVEN (`npx eslint` probe against this repo's own `eslint.config.mjs:145`,
// `'arrow-body-style': ['error', 'always']`): every arrow function in this
// codebase is forced to a `{ ... }` block body BEFORE this rule ever sees
// it, including a trivial single-statement forwarding arrow like
// `key: () => { return doThing(); }`. The rule's own description ("Disallow
// inline MULTI-STATEMENT arrow functions...") implied `body.type !==
// 'BlockStatement'` was doing duty as a statement-count filter — that only
// works if trivial arrows stay expression-bodied, which `arrow-body-style`
// makes impossible. The result: the "multi-statement" exemption was
// UNREACHABLE, and every arrow in a flagged position was reported
// regardless of size. Fixed here with a real statement count, so a
// single-statement forwarding arrow (the idiomatic, cheap shape) is exempt
// exactly as the rule's description always claimed.
//
// SECOND CONTRADICTION: THIS RULE'S "2+ STATEMENTS" THRESHOLD FIGHTS `explicit-return-binding`.
//
// `explicit-return-binding` requires a returning arrow whose body does work to bind that
// work to a `const` first, on its own line, rather than return it inline:
//
//   () => { return this.onClamp(event); }                            <- violates it
//   () => { const hookResult = this.onClamp(event); return hookResult; }   <- satisfies it
//
// Satisfying that rule always produces exactly two statements. A raw statement count
// therefore re-flags EVERY compliant returning arrow the other rule mandates — the two
// rules become jointly unsatisfiable for any per-iteration arrow that returns a value, live
// right now at `packages/config/src/validation/clampedConfig.ts:88`, which regressed into
// THIS rule the moment it was brought into compliance with that one.
//
// A `const <name> = <expr>; return <name>;` pair is one logical operation, not two — the
// `return` line adds no work, it is a binding CONVENTION this codebase enforces everywhere.
// `ArrowBodyStatementCount` therefore counts EFFECTIVE statements: the trailing pair
// collapses into one when the `return` names exactly the `const` the immediately preceding
// statement declares. Only `const` collapses — a `let`-bound pair (which
// `explicit-return-binding` does not mandate, and which can be reassigned elsewhere in a
// larger body) still counts as two, so a genuinely multi-statement closure is unaffected:
// nothing here changes what this rule flags for actual per-iteration work, only what it
// mistook for work in the first place. `inline-trivial-logic`'s `ForwardedReturnReduction`
// already recognizes this exact declare-then-return shape for its own (kind-agnostic)
// purpose; `DeclareThenReturnShape` in `shared/` factors out the AST match both rules use so
// neither reimplements the other's walker — see that module's comment for the kind split.

class ArrowBodyStatementCount {
  /**
   * The number of EFFECTIVE statements in an arrow's block body — see the module header
   * above. A trailing `return <name>;` that returns exactly the `const <name>` the
   * IMMEDIATELY PRECEDING statement declares collapses with it into one effective
   * statement; every other shape (a `let`/`var` binding, an unrelated statement in
   * between, no preceding declaration at all) counts exactly as written.
   */
  public static of(body: Record<string, unknown>): number {
    const statements = body.body;

    if (!Predicates.isArray(statements)) {
      return 0;
    }

    const rawCount = statements.length;

    if (rawCount < 2) {
      return rawCount;
    }

    const shape = DeclareThenReturnShape.of(statements.at(-2), statements.at(-1));
    const result = shape?.declarationKind === 'const' ? rawCount - 1 : rawCount;

    return result;
  }
}

export const inlineArrowFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const body: unknown = rawNode.body;

      if (!Predicates.isRecord(body) || body.type !== 'BlockStatement') {
        return;
      }

      // Real statement-count check — see module header for why `body.type
      // === 'BlockStatement'` alone cannot serve as one in this codebase.
      if (ArrowBodyStatementCount.of(body) < 2) {
        return;
      }

      // Loop-callback arguments (`items.forEach(() => { ... })` inside a
      // loop), ternary-branched/default-parameter closures, and
      // dispatch-map property values (including via nested array-literal
      // construction, e.g. `Object.fromEntries([["a", () => {...}]])`) are
      // all provably-per-iteration allocation sites — not just the direct
      // `Property > ObjectExpression` shape.
      if (!InlineCallablePosition.isFlagged(node, context)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'ArrowFunctionExpression': onArrowFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline multi-statement (2+ statements) arrow functions in a position provably rebuilt on every call/iteration (dispatch map built inside a loop, loop-callback argument, or default-parameter closure whose owning function is called only from per-iteration sites). Single-statement arrows and pre-built (module-scope or one-shot) positions are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineArrowFunctions: Inline multi-statement arrow function in a position rebuilt on every call/iteration. Extract to a static class method or named function, or hoist to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
