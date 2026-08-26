import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { CallIdentity } from '../shared/CallIdentity.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  MESSAGE, PUSH_METHODS, PUSH_OWNERS, RULE_NAME
} from './constants/ArrayFromIteratorsConstants.js';

// A8 — PREMISE DISPROVEN, RULE RETARGETED, NOT DELETED.
//
// The previous implementation flagged `Array.from(iterable)` itself, on the theory that
// avoiding it was faster. Measured (Node v24, Set with 5,000,000 entries; 3 warm-up
// calls, median of 7; command: `node scratchpad/bench.mjs`, see the `A8` section):
//
//   Array.from(set)             5.64ms
//   [...set]                    5.57ms   -> 0.99x vs Array.from  (performance-neutral)
//   for-of + push                42.50ms  -> 7.53x SLOWER than Array.from
//   preallocate + index-fill    30.01ms  -> 5.32x SLOWER than Array.from
//
// The implied remedy (a manual loop) is not faster — it is the SLOWEST option measured,
// by a wide margin, because `Array.from`/spread over a built-in `Set`/`Map` hit an
// internal fast path that a `for...of` loop's iterator-protocol calls do not. Flagging
// `Array.from(iterable)` was therefore steering code toward something slower.
//
// RETARGETED to what the rule was actually reaching for: converting an iterable to an
// array efficiently. The genuine anti-pattern, proven above, is the hand-rolled
// `for (const x of iterable) { acc.push(x); }` drain — so THAT is now what this rule
// flags, recommending `Array.from(iterable)` or `[...iterable]` (tied for fastest)
// instead. `Array.from(iterable, mapFn)` — the two-argument mapped form — is a distinct
// concern with its own distinct cost, covered by the sibling rule `array-from-map-callback`.
//
// SCOPE: only a *fresh, empty* accumulator (`const out = []; for (...) { out.push(x); }`,
// declared as the statement immediately before the loop) is flagged — not accumulation
// onto a pre-existing or non-empty array, which `Array.from`/spread cannot reproduce as
// a drop-in replacement. And only when the iterable is PROVEN not already an array (via
// the type checker): pushing from an array in a loop is a copy/filter operation with its
// own idioms, not the iterator-drain this rule targets. Without type services, this
// proof is unavailable and the rule reports nothing — "if we cannot prove it, we do not
// enforce it," the same posture as every type-aware rule in this file set.

class ForOfBinding {
  /** The loop's own binding name — `for (const x of ...)` or `for (x of ...)`. */
  public static nameOf(left: unknown): string | undefined {
    if (!ObjectGuard.isObject(left)) {
      return undefined;
    }

    if (left.type === 'Identifier') {
      const result = typeof left.name === 'string' ? left.name : undefined;

      return result;
    }

    if (left.type === 'VariableDeclaration') {
      const declarations = left.declarations;

      if (!ObjectGuard.isArray(declarations) || declarations.length !== 1) {
        return undefined;
      }
      const [declarator] = declarations;

      if (!ObjectGuard.isObject(declarator)) {
        return undefined;
      }
      const id = declarator.id;

      if (!ObjectGuard.isObject(id) || id.type !== 'Identifier') {
        return undefined;
      }

      const result = typeof id.name === 'string' ? id.name : undefined;

      return result;
    }

    return undefined;
  }
}

class SoleBodyPushCall {
  /** The single `acc.push(x)` CallExpression when `body` reduces to exactly that statement — a bare `ExpressionStatement`, or a `BlockStatement` with exactly one statement. Any other body shape (multiple statements, a condition, a second push) is not the pure drain pattern this rule targets. */
  public static find(body: unknown): unknown {
    if (!ObjectGuard.isObject(body)) {
      return undefined;
    }

    let statement: unknown = body;

    if (body.type === 'BlockStatement') {
      const statements = body.body;

      if (!ObjectGuard.isArray(statements) || statements.length !== 1) {
        return undefined;
      }
      [statement] = statements;
    }

    if (!ObjectGuard.isObject(statement) || statement.type !== 'ExpressionStatement') {
      return undefined;
    }
    const { expression } = statement;

    if (!ObjectGuard.isObject(expression) || expression.type !== 'CallExpression') {
      return undefined;
    }

    return expression;
  }
}

class AccumulatorBinding {
  /**
   * True when the statement immediately preceding `forOfNode` in the same block is
   * `const <name> = [];` / `let <name> = [];` — a *fresh, empty* array, which is what
   * makes `Array.from(iterable)` / `[...iterable]` an exact drop-in replacement rather
   * than a behavior change.
   */
  public static isFreshEmptyArrayDeclaredBefore(forOfNode: Rule.Node, name: string): boolean {
    // Cast through `unknown` before the generic AST walk: `forOfNode.parent`'s declared
    // type (`Rule.Node`) intersects with `ObjectGuard.isObject`'s `Record<string,
    // unknown>` predicate rather than being erased by it, so `.body` would otherwise
    // keep its original `Statement[]` element type and reject a bare `Rule.Node` search
    // target below. Same pattern as `StatementIndex.locate` in `chainedArrayIteration`.
    const block = forOfNode.parent as unknown;

    if (!ObjectGuard.isObject(block)) {
      return false;
    }
    if (block.type !== 'BlockStatement' && block.type !== 'Program') {
      return false;
    }

    const body = block.body;

    if (!ObjectGuard.isArray(body)) {
      return false;
    }
    const index = body.indexOf(forOfNode);

    if (index <= 0) {
      return false;
    }

    const previous = body.at(index - 1);

    if (!ObjectGuard.isObject(previous) || previous.type !== 'VariableDeclaration') {
      return false;
    }
    const declarations = previous.declarations;

    if (!ObjectGuard.isArray(declarations) || declarations.length !== 1) {
      return false;
    }

    const [declarator] = declarations;

    if (!ObjectGuard.isObject(declarator)) {
      return false;
    }
    const id = declarator.id;

    if (!ObjectGuard.isObject(id) || id.type !== 'Identifier' || id.name !== name) {
      return false;
    }

    const init = declarator.init;

    if (!ObjectGuard.isObject(init) || init.type !== 'ArrayExpression') {
      return false;
    }
    const elements = init.elements;

    const result = ObjectGuard.isArray(elements) && elements.length === 0;

    return result;
  }
}

class IterableProof {
  /** True when the type checker proves `node` is NOT already an array/tuple. Without type services this cannot be proven, so the caller does not flag — pushing from an array is a copy/filter idiom, not the iterator-drain this rule targets. */
  public static isProvenNonArray(node: unknown, context: Rule.RuleContext): boolean {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return false;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (tsNode === undefined) {
      return false;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const type = checker.getTypeAtLocation(tsNode);

    const result = !checker.isArrayType(type) && !checker.isTupleType(type);

    return result;
  }
}

export const arrayFromIterators: Rule.RuleModule = {
  'create': (context) => {
    const onForOfStatement: NonNullable<Rule.RuleListener['ForOfStatement']> = (node) => {
      const bindingName = ForOfBinding.nameOf(node.left);

      if (bindingName === undefined) {
        return;
      }

      const pushCall = SoleBodyPushCall.find(node.body);

      if (pushCall === undefined) {
        return;
      }
      if (!CallIdentity.isBuiltinCall(pushCall as Rule.Node, context, PUSH_METHODS, PUSH_OWNERS)) {
        return;
      }

      const rawPushCall = pushCall as unknown as { readonly 'arguments': readonly unknown[]; readonly 'callee': unknown };
      const {
        'arguments': pushArgumentList, callee
      } = rawPushCall;

      if (pushArgumentList.length !== 1) {
        return;
      }
      const [pushedValue] = pushArgumentList;

      if (!ObjectGuard.isObject(pushedValue) || pushedValue.type !== 'Identifier' || pushedValue.name !== bindingName) {
        return;
      }

      if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression') {
        return;
      }
      const accumulator = callee.object;

      if (!ObjectGuard.isObject(accumulator) || accumulator.type !== 'Identifier' || typeof accumulator.name !== 'string') {
        return;
      }

      if (!AccumulatorBinding.isFreshEmptyArrayDeclaredBefore(node, accumulator.name)) {
        return;
      }
      if (!IterableProof.isProvenNonArray(node.right, context)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'ForOfStatement': onForOfStatement };
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
