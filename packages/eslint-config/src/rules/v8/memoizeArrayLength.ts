import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import { COMPARISON_OPERATORS, FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME } from './constants/MemoizeArrayLengthConstants.js';

class LengthAstHelpers {
  /** `arr.length` or `arr["length"]` — both equivalent re-reads of the array's length. */
  public static isLengthAccess(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'MemberExpression') { return false; }

    const property = node.property;
    if (!ObjectGuard.isObject(property)) { return false; }

    if (node.computed === true) {
      return property.type === 'Literal' && property.value === 'length';
    }

    return property.type === 'Identifier' && property.name === 'length';
  }

  public static isIdentifier(node: unknown): boolean {
    return ObjectGuard.isObject(node) && node.type === 'Identifier';
  }

  /** Nearest enclosing `for`/`while` loop, without crossing a function-scope boundary. */
  public static nearestEnclosingLoop(node: Rule.Node): Rule.Node | null {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) { return current; }
      if (FUNCTION_TYPES.has(current.type)) { return null; }
      current = current.parent;
    }

    return null;
  }
}

class LoopTestClassifier {
  /**
   * Classifies a loop `test` expression:
   *   - `direct`: the test compares a loop variable directly against a
   *     `.length` re-read (`i < arr.length`, `arr.length > i`, `arr["length"] <= i`, ...)
   *     — always the anti-pattern, regardless of operand order or comparison operator.
   *   - `memoized`: the test compares two identifiers (`i < len`) — the
   *     accepted "good" shape, UNLESS the loop body reassigns one of those
   *     identifiers back to a `.length` re-read (checked separately).
   *   - `null`: the test doesn't match either recognized shape.
   */
  public static classify(test: unknown): { 'kind': 'direct' } | { 'kind': 'memoized'; 'names': string[] } | null {
    if (!ObjectGuard.isObject(test) || test.type !== 'BinaryExpression') { return null; }

    const operator = test.operator;
    if (typeof operator !== 'string' || !COMPARISON_OPERATORS.has(operator)) { return null; }

    const left = test.left;
    const right = test.right;

    const leftIsId = LengthAstHelpers.isIdentifier(left);
    const rightIsId = LengthAstHelpers.isIdentifier(right);
    const leftIsLength = LengthAstHelpers.isLengthAccess(left);
    const rightIsLength = LengthAstHelpers.isLengthAccess(right);

    if (leftIsId && rightIsLength) { return { 'kind': 'direct' }; }
    if (leftIsLength && rightIsId) { return { 'kind': 'direct' }; }

    if (leftIsId && rightIsId) {
      const leftName = AstHelpers.getIdentifierName(left);
      const rightName = AstHelpers.getIdentifierName(right);
      const names = [leftName, rightName].filter((name): name is string => {return typeof name === 'string';});
      return { 'kind': 'memoized', 'names': names };
    }

    return null;
  }
}

export const memoizeArrayLength: Rule.RuleModule = {
  'create': (context) => {
    // Loops whose test compares two identifiers (the accepted "memoized"
    // shape) are held pending until the loop's body has been fully walked,
    // so a reassignment of the memoized variable back to `.length` anywhere
    // in the body can defeat the memoization.
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
      const rawNode = node as unknown as Record<string, unknown>;
      if (rawNode.operator !== '=') { return; }

      const left = rawNode.left;
      const right = rawNode.right;
      if (!LengthAstHelpers.isIdentifier(left) || !LengthAstHelpers.isLengthAccess(right)) { return; }

      const loop = LengthAstHelpers.nearestEnclosingLoop(node);
      if (loop === null) { return; }

      const name = AstHelpers.getIdentifierName(left);
      if (typeof name === 'string') { recordReassignment(loop, name); }
    };

    const onLoop: (node: Rule.Node) => void = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const match = LoopTestClassifier.classify(rawNode.test);
      if (match === null) { return; }

      if (match.kind === 'direct') {
        context.report({ 'messageId': 'unmemoized', 'node': node });
        return;
      }

      pendingLoops.set(node, match.names);
    };

    const onLoopExit: (node: Rule.Node) => void = (node) => {
      const names = pendingLoops.get(node);
      pendingLoops.delete(node);
      if (names === undefined) { return; }

      const reassigned = reassignedNames.get(node);
      reassignedNames.delete(node);
      if (reassigned === undefined) { return; }

      if (names.some((name) => { const result = reassigned.has(name); return result; })) {
        context.report({ 'messageId': 'reassignedMemo', 'node': node });
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
      'description': MESSAGE,
      'recommended': false
    },
    'messages': {
      'reassignedMemo': `${RULE_NAME}: loop bound variable is reassigned to array.length inside the loop body, defeating the memoization — .length is re-read every iteration exactly as if it were never memoized.`,
      'unmemoized': `${RULE_NAME}: ${MESSAGE}`
    },
    'schema': [],
    'type': 'problem'
  }
};
