import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ComputedObjectPropertiesConstants.js';

// Scope decisions (unchanged from the prior revision — re-verified below):
// - Narrowed `ObjectExpression Property[computed=true]` (a descendant combinator) to
//   `ObjectExpression > Property[computed=true]` (a direct child). The descendant form
//   also matched computed properties belonging to an unrelated, more deeply nested
//   `ObjectExpression`/`ObjectPattern` reached only via ancestor-descendant traversal
//   (e.g. a computed destructuring-pattern property inside a method/arrow body nested in
//   the object literal) — none of that concerns the enclosing object literal's own
//   hidden-class shape, so it was a false positive.
// - `Object.fromEntries([[key, 1]])` IS in scope: it produces the same dynamic-shape
//   object-literal-equivalent result via a different API surface, and its entire premise
//   is a runtime-built key list, so it is flagged unconditionally (no per-entry static-key
//   exemption attempted — there is no static entry list to inspect).
// - Post-creation bracket assignment (`const o = {}; o[key] = 1;`) is deliberately NOT
//   covered here — that is a computed MemberExpression write, `dynamicPropertyAccess`'s
//   territory now that its selector was widened to `MemberExpression[computed=true]`.
//   Covering it in both rules would double-report the same statement.
//
// RE-VERIFIED at 5,000,000 object-literal creations, median of 7, 3-call warm-up
// (scratchpad/bench_computedObject.js) — the prior "2.35x" figure did not reproduce; this
// is the measured replacement:
//
//   direct ({ a: 1, b: 2 })            2.01 ms
//   literal computed ({ ['a']: 1, ... })  26.52 ms   13.2x
//   symbol keyed ({ [Symbol.iterator]: 0, ... })  44.05 ms  21.9x
//   genuine variable key               43.92 ms   21.9x
//
// UNLIKE `dynamicPropertyAccess` (where a literal computed key folds to byte-identical
// `GetNamedProperty` bytecode — an ACCESS operation), object-literal CREATION does not
// collapse a literal computed key to the direct-key path: V8's fast object-literal
// boilerplate-clone requires every property to be statically known at compile time, and
// ANY `[...]` computed syntax opts out of that, regardless of whether the bracketed
// expression happens to be a literal. So — unlike `computedClassProperties`, which exempts
// literal computed keys — this rule keeps flagging them: the cost is real and measured,
// not folklore.
//
// WELL-KNOWN SYMBOLS ARE EXEMPT ANYWAY, DESPITE MEASURING THE SAME COST AS A GENUINE
// VARIABLE KEY (44.05ms vs 43.92ms — statistically indistinguishable). This is a
// deliberate, DOCUMENTED trade-off, not a claim that the cost disappears: `[Symbol.iterator]`
// has NO non-computed spelling in JavaScript, so a rule that flags it makes writing an
// iterable object literal impossible — the exact defect PROVEN on real production code
// (`packages/errors/src/errors/ValidationErrors.ts:140`, flagged by `computedClassProperties`
// and `dynamicPropertyAccess` before their own fixes). "Cannot enforce the impossible" wins
// over "the cost is real" here, same posture `dynamicPropertyAccess.ts` takes. If this
// pattern turns up in a genuinely hot path, that is a design smell (build the iterable as a
// class instead of re-creating an object literal per call) this rule cannot itself catch.
//
// PAIRED RULES: `computed-class-properties` (creation-time key instability, class-factory
// case) and `dynamic-property-access` (access-time, not creation-time — different hazard).

class KeyClassification {
  /** A well-known symbol computed key (`[Symbol.iterator]`, `[Symbol.asyncIterator]`, …) — a compile-time constant with no non-computed spelling. See module comment for the measured-but-exempt trade-off. */
  public static isWellKnownSymbol(keyNode: unknown): boolean {
    if (!ObjectGuard.isObject(keyNode) || keyNode.type !== 'MemberExpression') {
      return false;
    }

    const result = AstHelpers.getIdentifierName(keyNode.object) === 'Symbol';
    return result;
  }
}

class FromEntriesCallShape {
  /** `Object.fromEntries(...)` — resolved by direct callee shape, matching this file's existing convention (no `CallIdentity` dependency for a global static method with no realistic same-named user overload). */
  public static isObjectFromEntries(node: Rule.Node): boolean {
    const raw = node as unknown as { readonly 'callee': unknown };
    const callee = raw.callee;

    if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
      return false;
    }

    const objectNode = callee.object;
    const propertyNode = callee.property;

    if (!ObjectGuard.isObject(objectNode) || objectNode.type !== 'Identifier' || objectNode.name !== 'Object') {
      return false;
    }
    if (!ObjectGuard.isObject(propertyNode) || propertyNode.type !== 'Identifier' || propertyNode.name !== 'fromEntries') {
      return false;
    }

    return true;
  }
}

export const computedObjectProperties: Rule.RuleModule = {
  'create': (context) => {
    const onComputedProperty: (node: Rule.Node) => void = (node) => {
      const raw = node as unknown as { readonly 'key': unknown };

      if (KeyClassification.isWellKnownSymbol(raw.key)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!FromEntriesCallShape.isObjectFromEntries(node)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return {
      'CallExpression': onCallExpression,
      'ObjectExpression > Property[computed=true]': onComputedProperty
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
