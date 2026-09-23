import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types/browser';

import type { AstNodeInterface } from '../shared/AstNodeInterface.js';

import { CallIdentity } from '../shared/CallIdentity.js';
import {
  ITERATION_METHOD_NAMES, ITERATION_OWNERS, MESSAGE, RULE_NAME
} from './constants/ChainedArrayIterationConstants.js';

// See docs/eslint/rules/v8/chained-array-iteration.md for the measured rationale.

class IterationCall {
  public static matches(node: unknown, context: Rule.RuleContext): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'CallExpression') {
      return false;
    }

    const result = CallIdentity.isBuiltinCall(node as unknown as Rule.Node, context, ITERATION_METHOD_NAMES, ITERATION_OWNERS);
    return result;
  }

  // Walks the receiver chain of `node` through intervening `.method(...)` calls, looking for
  // an earlier call in the same chain that is itself an iteration method.
  public static hasEarlierIterationCallInChain(node: AstNodeInterface, context: Rule.RuleContext): boolean {
    const callee = node.callee;

    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression') {
      return false;
    }

    let current: unknown = callee.object;

    while (Predicates.isRecord(current) && current.type === 'CallExpression') {
      if (IterationCall.matches(current, context)) {
        return true;
      }

      const innerCallee = current.callee;

      if (!Predicates.isRecord(innerCallee) || innerCallee.type !== 'MemberExpression') {
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
  // Resolves the statement-list index of the nearest enclosing statement that is a direct
  // member of a `BlockStatement`/`Program` body — for testing statement adjacency.
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
    // `const tmp = arr.filter(...);` candidates, keyed by variable name, awaiting a
    // same-block, next-statement, single-use read to confirm the split-statement chain.
    const trackedTempVariables = new Map<string, TrackedTempVariableInterface>();

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      const declarationNode = node.parent as unknown as AstNodeInterface;

      if (!Predicates.isRecord(declarationNode) || declarationNode.type !== 'VariableDeclaration' || declarationNode.kind !== 'const') {
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
