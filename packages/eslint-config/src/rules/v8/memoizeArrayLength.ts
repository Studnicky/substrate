import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from '../shared/astHelpers.js';
import {
  COMPARISON_OPERATORS, FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME
} from './constants/MemoizeArrayLengthConstants.js';

// See docs/eslint/rules/v8/memoize-array-length.md for the measured rationale. Only the
// reassigned-memo pattern is a bug; TurboFan already hoists an unmemoized `.length` read.

class LengthAstHelpers {
  /** `arr.length` or `arr["length"]` — both equivalent re-reads of the array's length. */
  public static isLengthAccess(node: unknown): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'MemberExpression') {
      return false;
    }

    const property = node.property;

    if (!Predicates.isRecord(property)) {
      return false;
    }

    if (node.computed === true) {
      const result = property.type === 'Literal' && property.value === 'length';

      return result;
    }

    const result = property.type === 'Identifier' && property.name === 'length';

    return result;
  }

  public static isIdentifier(node: unknown): boolean {
    const result = Predicates.isRecord(node) && node.type === 'Identifier';

    return result;
  }

  /** Nearest enclosing `for`/`while` loop, without crossing a function-scope boundary. */
  public static nearestEnclosingLoop(node: Rule.Node): Rule.Node | null {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) {
        return current;
      }
      if (FUNCTION_TYPES.has(current.type)) {
        return null;
      }
      current = current.parent;
    }

    return null;
  }
}

class LoopTestClassifier {
  /** Recognizes only the "memoized" test shape (`i < len`), seeding candidate memo-variable names to watch for reassignment. */
  public static classify(test: unknown): { 'names': string[] } | null {
    if (!Predicates.isRecord(test) || test.type !== 'BinaryExpression') {
      return null;
    }

    const operator = test.operator;

    if (typeof operator !== 'string' || !COMPARISON_OPERATORS.has(operator)) {
      return null;
    }

    const left = test.left;
    const right = test.right;

    if (!LengthAstHelpers.isIdentifier(left) || !LengthAstHelpers.isIdentifier(right)) {
      return null;
    }

    const leftName = AstHelpers.getIdentifierName(left);
    const rightName = AstHelpers.getIdentifierName(right);
    const names = [
      leftName,
      rightName
    ].filter((name): name is string => {
      const result = typeof name === 'string';

      return result;
    });

    return { 'names': names };
  }
}

export const memoizeArrayLength: Rule.RuleModule = {
  'create': (context) => {
    // Loops with a "memoized" test are held pending until the body is fully walked, so a
    // reassignment back to `.length` anywhere in the body can defeat the memoization.
    const pendingLoops = new Map<Rule.Node, string[]>();
    const reassignedNames = new Map<Rule.Node, Set<string>>();

    const recordReassignment = (loop: Rule.Node, name: string): void => {
      const existing = reassignedNames.get(loop);

      if (existing === undefined) {
        reassignedNames.set(loop, new Set([name]));

        return;
      }
      existing.add(name);
    };

    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      if (node.operator !== '=') {
        return;
      }

      const left = node.left;
      const right = node.right;

      if (!LengthAstHelpers.isIdentifier(left) || !LengthAstHelpers.isLengthAccess(right)) {
        return;
      }

      const loop = LengthAstHelpers.nearestEnclosingLoop(node);

      if (loop === null) {
        return;
      }

      const name = AstHelpers.getIdentifierName(left);

      if (typeof name === 'string') {
        recordReassignment(loop, name);
      }
    };

    const onLoop: (node: Rule.Node) => void = (node) => {
      const test = AstHelpers.getNodeProperty(node, 'test');
      const match = LoopTestClassifier.classify(test);

      if (match === null) {
        return;
      }

      pendingLoops.set(node, match.names);
    };

    const onLoopExit: (node: Rule.Node) => void = (node) => {
      const names = pendingLoops.get(node);

      pendingLoops.delete(node);
      if (names === undefined) {
        return;
      }

      const reassigned = reassignedNames.get(node);

      reassignedNames.delete(node);
      if (reassigned === undefined) {
        return;
      }

      const namesLength = names.length;
      let anyReassigned = false;

      for (let index = 0; index < namesLength; index += 1) {
        const name = names.at(index);

        if (name !== undefined && reassigned.has(name)) {
          anyReassigned = true;
          break;
        }
      }

      if (anyReassigned) {
        context.report({
          'messageId': 'reassignedMemo', 'node': node
        });
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'ForStatement': onLoop,
      'ForStatement:exit': onLoopExit,
      'WhileStatement': onLoop,
      'WhileStatement:exit': onLoopExit
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow reassigning a memoized loop-length variable back to `.length` inside the loop body — a self-defeating pattern that reintroduces the per-iteration read the memoization was meant to avoid. Does NOT require memoizing `.length` in the first place: memoizing measures 1.4x SLOWER than an unmemoized `i < arr.length` test at 5,000,000 iterations (TurboFan already hoists the read via LICM), so that primary check was removed.',
      'recommended': false
    },
    'messages': { 'reassignedMemo': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
