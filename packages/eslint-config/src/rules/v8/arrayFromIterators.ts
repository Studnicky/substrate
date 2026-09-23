import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from '../shared/astHelpers.js';
import { CallIdentity } from '../shared/CallIdentity.js';
import {
  MESSAGE, PUSH_METHODS, PUSH_OWNERS, RULE_NAME
} from './constants/ArrayFromIteratorsConstants.js';

// Flags only a hand-rolled iterator-drain into a fresh, empty, proven-non-array
// accumulator. Benchmark and scope: docs/eslint/rules/v8/array-from-iterators.md.

class ForOfBinding {
  /** The loop's own binding name — `for (const x of ...)` or `for (x of ...)`. */
  public static nameOf(left: unknown): string | undefined {
    if (!Predicates.isRecord(left)) {
      return undefined;
    }

    if (left.type === 'Identifier') {
      const result = typeof left.name === 'string' ? left.name : undefined;

      return result;
    }

    if (left.type === 'VariableDeclaration') {
      const declarations = left.declarations;

      if (!Predicates.isArray(declarations) || declarations.length !== 1) {
        return undefined;
      }
      const [declarator] = declarations;

      if (!Predicates.isRecord(declarator)) {
        return undefined;
      }
      const id = declarator.id;

      if (!Predicates.isRecord(id) || id.type !== 'Identifier') {
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
    if (!Predicates.isRecord(body)) {
      return undefined;
    }

    let statement: unknown = body;

    if (body.type === 'BlockStatement') {
      const statements = body.body;

      if (!Predicates.isArray(statements) || statements.length !== 1) {
        return undefined;
      }
      [statement] = statements;
    }

    if (!Predicates.isRecord(statement) || statement.type !== 'ExpressionStatement') {
      return undefined;
    }
    const { expression } = statement;

    if (!Predicates.isRecord(expression) || expression.type !== 'CallExpression') {
      return undefined;
    }

    return expression;
  }
}

class AccumulatorBinding {
  /** True when `const <name> = [];`/`let <name> = [];` is the statement immediately preceding `forOfNode`. */
  public static isFreshEmptyArrayDeclaredBefore(forOfNode: Rule.Node, name: string): boolean {
    // Cast through `unknown`: `Predicates.isRecord` doesn't erase `Rule.Node`'s declared
    // `.body` type. Same pattern as `StatementIndex.locate` in `chainedArrayIteration`.
    const block = forOfNode.parent as unknown;

    if (!Predicates.isRecord(block)) {
      return false;
    }
    if (block.type !== 'BlockStatement' && block.type !== 'Program') {
      return false;
    }

    const body = block.body;

    if (!Predicates.isArray(body)) {
      return false;
    }
    const index = body.indexOf(forOfNode);

    if (index <= 0) {
      return false;
    }

    const previous = body.at(index - 1);

    if (!Predicates.isRecord(previous) || previous.type !== 'VariableDeclaration') {
      return false;
    }
    const declarations = previous.declarations;

    if (!Predicates.isArray(declarations) || declarations.length !== 1) {
      return false;
    }

    const [declarator] = declarations;

    if (!Predicates.isRecord(declarator)) {
      return false;
    }
    const id = declarator.id;

    if (!Predicates.isRecord(id) || id.type !== 'Identifier' || id.name !== name) {
      return false;
    }

    const init = declarator.init;

    if (!Predicates.isRecord(init) || init.type !== 'ArrayExpression') {
      return false;
    }
    const elements = init.elements;

    const result = Predicates.isArray(elements) && elements.length === 0;

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

      if (!Predicates.isRecord(pushedValue) || pushedValue.type !== 'Identifier' || pushedValue.name !== bindingName) {
        return;
      }

      if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression') {
        return;
      }
      const accumulator = callee.object;

      if (!Predicates.isRecord(accumulator) || accumulator.type !== 'Identifier' || typeof accumulator.name !== 'string') {
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
