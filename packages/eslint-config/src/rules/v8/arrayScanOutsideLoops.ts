import type { Rule } from 'eslint';

import { CallIdentity } from '../shared/CallIdentity.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME, SCAN_METHODS, SCAN_OWNERS
} from './constants/ArrayScanOutsideLoopsConstants.js';

// IDENTITY IS RESOLVED, NOT NAME-MATCHED. See `shared/CallIdentity.ts` for the full
// reasoning; the short version applies here identically to `arrayConcatOutsideLoops`:
// `indexOf`/`includes`/`find`/`filter`/`some`/`every` all exist as unrelated methods on
// other types (a custom `Rope.indexOf`, a `Map`-like class with its own `.find`), and a
// computed/const-aliased call (`arr[SCAN_METHOD](x)`) must still resolve. Matching
// `callee.property.name` against a name set (the previous implementation) is wrong in
// both directions for exactly the reasons documented there.
//
// PER-ITERATION IS RESOLVED VIA `LoopContext`, NOT `FunctionScope.isInsideLoop`. A scan
// method called from inside a `.forEach()`/`.map()` callback runs once per element and
// is a loop body in every sense that matters to this rule — `LoopContext.isPerIteration`
// sees that; the old `FunctionScope.isInsideLoop` walk stopped at the callback's function
// boundary and missed it entirely.

class ReceiverOrigin {
  // Walks a (possibly chained) MemberExpression down to its root Identifier —
  // `entry.variable.references` resolves to `entry`. Any other root shape
  // (ThisExpression, CallExpression, ...) returns undefined: such receivers are not
  // lexical variables the rule can prove are loop-local, so the caller's default is to
  // keep flagging rather than guess.
  public static findRootIdentifier(node: unknown): Rule.Node | undefined {
    let current = node;

    while (current !== null && typeof current === 'object') {
      const raw = current as Record<string, unknown>;

      if (raw.type === 'Identifier') {
        return current as Rule.Node;
      }
      if (raw.type !== 'MemberExpression') {
        return undefined;
      }
      current = raw.object;
    }

    return undefined;
  }

  // Resolves `identifierNode` to its declaring AST node by walking up the lexical scope
  // chain by name — the standard identifier-resolution algorithm.
  public static findDeclarationNode(identifierNode: Rule.Node, context: Rule.RuleContext): Rule.Node | undefined {
    const name = (identifierNode as unknown as { readonly 'name': string }).name;
    let scope = context.sourceCode.getScope(identifierNode) as { readonly 'upper': typeof scope | null; readonly 'variables': readonly { readonly 'defs': readonly { readonly 'node': unknown }[]; readonly 'name': string }[] } | null;

    while (scope !== null) {
      const { variables } = scope;
      const variablesLength = variables.length;

      for (let index = 0; index < variablesLength; index += 1) {
        const candidate = variables.at(index);

        if (candidate?.name === name) {
          const result = candidate.defs.at(0)?.node as Rule.Node | undefined;
          return result;
        }
      }
      scope = scope.upper;
    }

    return undefined;
  }

  // A receiver is proven loop-local when its root identifier's declaration site falls
  // within the enclosing loop's own AST range — e.g. a for-of loop's own binding, or a
  // `const` declared in the loop body. Such a value is freshly derived every iteration,
  // not the same stable collection re-scanned each time, so it is not the anti-pattern
  // this rule targets.
  public static isProvenLoopLocal(receiverObject: unknown, loopNode: Rule.Node, context: Rule.RuleContext): boolean {
    const rootIdentifier = ReceiverOrigin.findRootIdentifier(receiverObject);

    if (rootIdentifier === undefined) {
      return false;
    }

    const declarationNode = ReceiverOrigin.findDeclarationNode(rootIdentifier, context);

    if (declarationNode === undefined) {
      return false;
    }

    const declRange = (declarationNode as unknown as { readonly 'range': readonly [number, number] }).range;
    const loopRange = (loopNode as unknown as { readonly 'range': readonly [number, number] }).range;
    const declStart = declRange.at(0);
    const declEnd = declRange.at(1);
    const loopStart = loopRange.at(0);
    const loopEnd = loopRange.at(1);

    if (declStart === undefined || declEnd === undefined || loopStart === undefined || loopEnd === undefined) {
      return false;
    }

    const result = declStart >= loopStart && declEnd <= loopEnd;
    return result;
  }
}

class LoopRange {
  // Finds the nearest enclosing REAL loop keyword — distinct from `LoopContext`'s
  // boolean `isPerIteration`, because the loop-local receiver check above needs an
  // actual node range to compare a declaration site against. Stops (returns undefined)
  // at a function boundary, including an iteration-callback boundary: when the
  // per-iteration context is a `.forEach()`/`.map()` callback rather than a loop
  // keyword, there is no loop-node range to compare against, so the receiver-locality
  // exemption is skipped and the call is conservatively still flagged.
  public static findEnclosingLoop(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) {
        return current;
      }
      if (FUNCTION_TYPES.has(current.type)) {
        return undefined;
      }
      current = current.parent;
    }

    return undefined;
  }
}

export const arrayScanOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!CallIdentity.isBuiltinCall(node, context, SCAN_METHODS, SCAN_OWNERS)) {
        return;
      }
      if (!LoopContext.isPerIteration(node, context)) {
        return;
      }

      const loopNode = LoopRange.findEnclosingLoop(node);

      if (loopNode !== undefined) {
        const { callee } = node;

        if (callee.type === 'MemberExpression' && ReceiverOrigin.isProvenLoopLocal(callee.object, loopNode, context)) {
          return;
        }
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'CallExpression': onCallExpression };
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
