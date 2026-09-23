import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { CallIdentity } from '../shared/CallIdentity.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  CONCAT_METHODS, CONCAT_OWNERS, MESSAGE, RULE_NAME
} from './constants/ArrayConcatOutsideLoopsConstants.js';

// See docs/eslint/rules/v8/array-concat-outside-loops.md for the measured rationale.
// `.call`/`.apply` indirection resolves to `CallableFunction.call`, not `Array.concat`.

class HelperReachability {
  /** Provable only for a named `function helper() {}` or `const helper = () => {}`/`= function () {}`. */
  public static isReachedOnlyPerIteration(node: Rule.Node, context: Rule.RuleContext): boolean {
    const enclosing = HelperReachability.#findEnclosingFunction(node);

    if (enclosing === undefined) {
      return false;
    }

    // Resolves the binding from its declaration, so it cannot be shadowed by name.
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
