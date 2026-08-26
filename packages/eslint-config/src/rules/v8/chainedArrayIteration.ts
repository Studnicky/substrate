import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import type { AstNodeInterface } from '../shared/AstNodeInterface.js';

import { CallIdentity } from '../shared/CallIdentity.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  ITERATION_METHOD_NAMES, ITERATION_OWNERS, MESSAGE, RULE_NAME
} from './constants/ChainedArrayIterationConstants.js';

// A18 — RE-MEASURED AT 5M, SEVERITY CONFIRMED (NOT ~3.4%).
//
// The prior figure ("~3.4%") was measured at 1,000-3,000 elements — too small to trust
// per this rule set's own standing directive (small-N results do not reproduce at scale;
// see e.g. `memoize-array-length`, where a 1k measurement flipped sign entirely at 5M).
// Re-measured (Node v24, 5,000,000-element array, 3 warm-up calls, median of 7; command:
// `node scratchpad/bench.mjs`, see the `A18` section):
//
//   arr.map(x=>x*2).filter(x=>x%3===0)   (double pass, intermediate array)   54.09ms
//   arr.reduce(...)                       (single pass, no intermediate)     26.76ms
//   -> 2.02x  (102% slower)
//
// At scale the cost is a real 2x, not a rounding-error 3.4% — the rule is correctly
// enforced, not merely stylistic.
//
// IDENTITY IS RESOLVED, NOT NAME-MATCHED. See `shared/CallIdentity.ts`. The previous
// `IterationCall.matches` checked only `callee.property.name` against a name set, which
// falsely flags a same-named chain method on an unrelated fluent API (e.g. an
// Immutable.js `List.filter().map()`, or a custom builder with its own `.map()`) — the
// exact false-positive class documented there. `CallIdentity` resolves each call's
// signature declaration and requires it to originate from `Array`/`ReadonlyArray` in the
// standard library, so a same-named method on a different type no longer matches.
//
// Scope decision (unchanged from the prior implementation): generalized from "map/filter
// directly nested" to "2+ of these iteration methods appear anywhere along the same
// call-chain, regardless of what is interposed between them" (e.g.
// `arr.map(x=>x).slice(0).filter(x=>x)`). forEach/reduce/flatMap/some/every/find are
// included alongside map/filter because they share the same underlying cost this rule
// targets: each one is a full pass over the array, so two of them chained (with or
// without a non-iterating method spliced in) still means the array gets walked twice
// instead of once via reduce(). The risk of this generalization is over-flagging chains
// where the interposed call meaningfully changes the receiver (e.g.
// `.filter(...).slice(0, 10).map(...)` limits the second pass to 10 elements, so the
// "double full pass" cost argument is weaker) — accepted as a reasoned tradeoff: the
// rule's own fix suggestion (reduce()) still applies, and a real slice-then-map is rare
// enough in hot paths that this is judged worth the broader coverage.

class IterationCall {
  public static matches(node: unknown, context: Rule.RuleContext): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'CallExpression') {
      return false;
    }

    const result = CallIdentity.isBuiltinCall(node as unknown as Rule.Node, context, ITERATION_METHOD_NAMES, ITERATION_OWNERS);
    return result;
  }

  // Walks the receiver chain of `node` (a CallExpression) through any
  // number of intervening `.method(...)` calls, looking for an earlier
  // call in the same chain whose own property name is an iteration method.
  public static hasEarlierIterationCallInChain(node: AstNodeInterface, context: Rule.RuleContext): boolean {
    const callee = node.callee;

    if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression') {
      return false;
    }

    let current: unknown = callee.object;

    while (ObjectGuard.isObject(current) && current.type === 'CallExpression') {
      if (IterationCall.matches(current, context)) {
        return true;
      }

      const innerCallee = current.callee;

      if (!ObjectGuard.isObject(innerCallee) || innerCallee.type !== 'MemberExpression') {
        break;
      }
      current = innerCallee.object;
    }

    return false;
  }
}

namespace StatementIndexEntity {
  export const Schema = { 'type': 'integer' } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface StatementLocationInterface {
  readonly 'block': AstNodeInterface;
  readonly 'index': StatementIndexEntity.Type;
}

class StatementIndex {
  // Resolves the statement-list index of the nearest enclosing statement
  // that is a direct member of a `BlockStatement`/`Program` body array —
  // used to test that a temp variable's declaration and its (only) use are
  // adjacent statements in the same block.
  public static locate(node: Rule.Node): StatementLocationInterface | undefined {
    let current: Rule.Node = node;
    let parent: Rule.Node | null = node.parent;

    while (parent !== null) {
      const rawParent = parent as unknown as AstNodeInterface;

      if ((rawParent.type === 'BlockStatement' || rawParent.type === 'Program') && Array.isArray(rawParent.body)) {
        const body = rawParent.body as readonly unknown[];
        const index = body.indexOf(current);

        if (index !== -1) {
          return {
            'block': rawParent, 'index': index
          };
        }
      }
      current = parent;
      parent = parent.parent;
    }

    return undefined;
  }
}

interface TrackedTempVariableInterface {
  readonly 'declaratorNode': Rule.Node;
  readonly 'statementLocation': StatementLocationInterface;
}

export const chainedArrayIteration: Rule.RuleModule = {
  'create': (context) => {
    // `const tmp = arr.filter(...);` candidates, keyed by variable name,
    // awaiting a same-block, next-statement, single-use `tmp.map(...)` (or
    // `.filter(...)`) read to confirm the split-statement chain.
    const trackedTempVariables = new Map<string, TrackedTempVariableInterface>();

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      const declarationNode = node.parent as unknown as AstNodeInterface;

      if (!ObjectGuard.isObject(declarationNode) || declarationNode.type !== 'VariableDeclaration' || declarationNode.kind !== 'const') {
        return;
      }
      if (node.id.type !== 'Identifier') {
        return;
      }
      if (!IterationCall.matches(node.init, context)) {
        return;
      }

      const statementLocation = StatementIndex.locate(node.parent);

      if (statementLocation === undefined) {
        return;
      }

      trackedTempVariables.set(node.id.name, {
        'declaratorNode': node, 'statementLocation': statementLocation
      });
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!IterationCall.matches(node, context)) {
        return;
      }

      const rawNode = node as unknown as AstNodeInterface;

      if (IterationCall.hasEarlierIterationCallInChain(rawNode, context)) {
        context.report({
          'messageId': 'forbidden', 'node': node
        });

        return;
      }

      const callee = node.callee;

      if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') {
        return;
      }

      const tracked = trackedTempVariables.get(callee.object.name);

      if (tracked === undefined) {
        return;
      }

      const readStatementLocation = StatementIndex.locate(node);

      if (readStatementLocation === undefined) {
        return;
      }

      const isNextStatementInSameBlock = readStatementLocation.block === tracked.statementLocation.block
        && readStatementLocation.index === tracked.statementLocation.index + 1;

      if (!isNextStatementInSameBlock) {
        return;
      }

      // "used EXACTLY ONCE" — the declaring write plus this single read
      // must be the temp variable's only references anywhere.
      const [variable] = context.sourceCode.getDeclaredVariables(tracked.declaratorNode);

      if (variable?.references.length !== 2) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return {
      'CallExpression': onCallExpression,
      'VariableDeclarator': onVariableDeclarator
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
