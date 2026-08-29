import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { AstHelpers } from '../shared/astHelpers.js';
import {
  COMPARISON_OPERATORS, FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME
} from './constants/MemoizeArrayLengthConstants.js';

// MEASURED, Node v24, N = 5,000,000, 3 warm-up calls + median of 7 timed calls
// (packages/eslint-config reproduction: scratchpad bench, `for (i=0;i<a.length;i++)`
// vs `const len=a.length; for (i=0;i<len;i++)`, both summing `a[i]`):
//
//   unmemoized (`i < a.length`)          2.327 ms
//   memoized   (`const len = a.length`)  3.256 ms   -> 1.399x SLOWER
//
// The rule's original primary check — "re-reading `.length` every iteration
// prevents V8 optimization, memoize it" — is FALSE. TurboFan hoists the
// `.length` read out of the loop via LICM (loop-invariant code motion) once
// the array is proven not to be resized in the loop body; the "memoized"
// form pays for an extra variable and a slightly worse register-allocation
// shape for no return. That primary check has been REMOVED, not merely
// disabled: flagging `for (let i = 0; i < arr.length; i++)` would be
// recommending a pessimization.
//
// What remains is a real bug class: an author who DOES write the
// (unnecessary, but harmless on its own) memoized-length form, then
// undermines their own intent by reassigning the memo variable back to
// `.length` somewhere in the loop body. That reintroduces the exact
// per-iteration read the pattern was meant to avoid, while keeping the
// extra variable's indirection — strictly worse than either doing nothing
// or memoizing correctly. This is a self-defeating-code smell, not a V8
// mechanism claim, which is why the message below carries no
// `v8Optimization/` performance framing.
//
// Paired rule: none — `switch-statements` (v8/switchStatements.ts) is the
// other rule in this package that was demoted from a performance claim to a
// pure code-clarity constraint after its underlying V8 premise was disproven.

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
  /**
   * Recognizes only the "memoized" test shape (`i < len` — two bare
   * identifiers being compared). This is the sole shape the rule still
   * cares about: it seeds the candidate memo-variable names to watch for a
   * later reassignment back to `.length` in the loop body. The unmemoized
   * `i < arr.length` shape is deliberately NOT classified — see the module
   * header for why that check was removed rather than merely left unused.
   */
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
    // Loops whose test compares two identifiers (the "memoized" shape) are
    // held pending until the loop's body has been fully walked, so a
    // reassignment of the memoized variable back to `.length` anywhere in
    // the body can defeat the memoization.
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

      if (rawNode.operator !== '=') {
        return;
      }

      const left = rawNode.left;
      const right = rawNode.right;

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
      const rawNode = node as unknown as Record<string, unknown>;
      const match = LoopTestClassifier.classify(rawNode.test);

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
