import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

class ArrayIteratorDetection {
  public static isArrayFromCall(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }
    if (node.type !== 'CallExpression') { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    if (callee.type !== 'MemberExpression') { return false; }
    const obj = callee.object;
    if (!ObjectGuard.isObject(obj) || obj.type !== 'Identifier' || obj.name !== 'Array') { return false; }
    const prop = callee.property;
    if (!ObjectGuard.isObject(prop) || prop.type !== 'Identifier' || prop.name !== 'from') { return false; }
    return true;
  }

  // Returns true only for the two zero-ambiguity structurally-certain constructors:
  // new Map(...) and new Set(...)
  public static isMapOrSetConstruction(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }
    if (node.type !== 'NewExpression') { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    if (callee.type !== 'Identifier') { return false; }
    const name = callee.name;
    return name === 'Map' || name === 'Set';
  }
}

class FirstArg {
  static get(args: readonly unknown[]): unknown {
    const [first] = args;
    return first;
  }
}

export const arrayFromIterators: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!ArrayIteratorDetection.isArrayFromCall(node)) { return; }

      const rawNode = node as unknown as Record<string, unknown>;
      const args = rawNode.arguments;
      if (!Array.isArray(args) || args.length === 0) { return; }
      const firstArg = FirstArg.get(args as readonly unknown[]);

      const servicesUnknown: unknown = context.sourceCode.parserServices;

      if (AstHelpers.hasTypeServices(servicesUnknown)) {
        // Type-checker path: flag when the first argument's return type is iterable but not an array.
        const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(firstArg);
        if (tsNode === undefined) { return; }
        const checker = servicesUnknown.program.getTypeChecker();
        const type = checker.getTypeAtLocation(tsNode);

        const isArray = 'isArrayType' in checker && typeof checker.isArrayType === 'function'
          && checker.isArrayType(type);

        // Only flag when not already an array (Array.from on an array is a different anti-pattern).
        // Flag any iterable that is not an array: Map, Set, generator returns, custom iterables.
        if (!isArray) {
          context.report({ 'messageId': 'forbidden', 'node': node });
        }
        return;
      }

      // No type services: only flag structurally-certain cases — new Map(...) or new Set(...).
      // Any other expression (identifiers, arbitrary calls) could be an array — do not guess.
      if (ArrayIteratorDetection.isMapOrSetConstruction(firstArg)) {
        context.report({ 'messageId': 'forbidden', 'node': node });
      }
    };

    return { 'CallExpression': onCallExpression };
  },
  'meta': {
    'docs': {
      'description': 'Avoid Array.from on iterators in hot paths.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/arrayFromIterators: Avoid Array.from on iterators in hot paths.' },
    'schema': [],
    'type': 'problem'
  }
};
