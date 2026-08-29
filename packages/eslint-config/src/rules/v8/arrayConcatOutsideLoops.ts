import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { CallIdentity } from '../shared/CallIdentity.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  CONCAT_METHODS, CONCAT_OWNERS, MESSAGE, RULE_NAME
} from './constants/ArrayConcatOutsideLoopsConstants.js';

// Measured cost of the pattern this rule forbids, 200-element chunks:
//   result = result.concat(chunk)  in a loop   150.3 ms
//   result.push(...chunk)          in a loop    20.6 ms   -> 7.3x
//
// IDENTITY IS RESOLVED, NOT NAME-MATCHED. See `shared/CallIdentity.ts` for why; the
// short version is that the previous name-matching implementation both missed
// `result[CONCAT](chunk)` and falsely reported a user-defined `Rope.concat`. Roughly
// 150 lines of alias/indirection chasing collapsed into one resolved-signature check
// that no spelling can evade.
//
// `.call`/`.apply` indirection is deliberately NOT handled here. `arr.concat.call(...)`
// resolves to `CallableFunction.call`, not `Array.concat`, so it would need its own
// special case — but `direct-invocation-only` already forbids `.call`/`.apply`
// outright, so the pattern is unreachable in compliant code. The two rules cover the
// surface together rather than each half-implementing the other's job.

class HelperReachability {
  /**
   * A concat call that is not itself per-iteration still runs per-iteration when it
   * lives in a helper whose every call site is per-iteration. Only two helper shapes
   * are provable without whole-program call-graph analysis: a named
   * `function helper() {}`, or `const helper = () => {}` / `= function () {}`. Both
   * expose exactly one binding whose references are the call sites.
   */
  public static isReachedOnlyPerIteration(node: Rule.Node, context: Rule.RuleContext): boolean {
    const enclosing = HelperReachability.#findEnclosingFunction(node);

    if (enclosing === undefined) {
      return false;
    }

    // `getDeclaredVariables` resolves the binding the declaration actually creates.
    // The predecessor walked the scope chain comparing variable NAMES, which a shadowed
    // binding defeats; this cannot be shadowed because it starts from the declaration.
    //
    // Which node OWNS the binding differs by helper shape, and getting this wrong fails
    // silently rather than loudly:
    //   function helper() {}      -> the FunctionDeclaration declares `helper`
    //   const helper = () => {}   -> the VariableDeclarator declares `helper`; the arrow
    //                                itself declares NOTHING, so asking it returns []
    // Ask the declarator in the second case, or every `const`-assigned helper silently
    // reports zero call sites and is never flagged.
    const owner = HelperReachability.#bindingOwner(enclosing);
    const declared = context.sourceCode.getDeclaredVariables(owner);
    const variable = declared.at(0);

    if (variable === undefined || declared.length !== 1) {
      return false;
    }

    const callSites: Rule.Node[] = [];
    const references = variable.references;
    const length = references.length;

    for (let index = 0; index < length; index += 1) {
      const reference = references.at(index);

      if (reference === undefined) {
        continue;
      }
      if (reference.init === true) {
        continue;
      }

      const identifier = reference.identifier as unknown as Rule.Node;
      const parent = identifier.parent;

      // A reference that is not a callee means the helper is passed around as a
      // value; where it ultimately runs is unprovable, so report nothing.
      if (parent === null || !Predicates.isRecord(parent)) {
        return false;
      }
      if (parent.type !== 'CallExpression' || parent.callee !== identifier) {
        return false;
      }

      callSites.push(identifier);
    }

    if (callSites.length === 0) {
      return false;
    }

    const siteCount = callSites.length;

    for (let siteIndex = 0; siteIndex < siteCount; siteIndex += 1) {
      const site = callSites.at(siteIndex);

      if (site === undefined || !LoopContext.isPerIteration(site, context)) {
        return false;
      }
    }

    return true;
  }

  /** The node that declares the helper's name — the declarator for `const f = () => {}`. */
  static #bindingOwner(functionNode: Rule.Node): Rule.Node {
    const parent = functionNode.parent;

    if (parent !== null && Predicates.isRecord(parent) && parent.type === 'VariableDeclarator' && parent.init === functionNode) {
      return parent;
    }

    return functionNode;
  }

  static #findEnclosingFunction(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      const isFunction = current.type === 'ArrowFunctionExpression'
        || current.type === 'FunctionDeclaration'
        || current.type === 'FunctionExpression';

      if (isFunction) {
        return current;
      }

      current = current.parent;
    }

    return undefined;
  }
}

export const arrayConcatOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!CallIdentity.isBuiltinCall(node, context, CONCAT_METHODS, CONCAT_OWNERS)) {
        return;
      }

      const perIteration = LoopContext.isPerIteration(node, context)
        || HelperReachability.isReachedOnlyPerIteration(node, context);

      if (!perIteration) {
        return;
      }

      context.report({
        'messageId': 'forbidden',
        'node': node
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
