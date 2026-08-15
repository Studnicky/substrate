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

  // `{ length: n }` — a plain object literal whose only member is a non-computed `length`
  // property — is the idiomatic array-LIKE shape used to preallocate a fixed-size array
  // (`Array.from({ length: n })`). It has no `Symbol.iterator`, so consuming it is not the
  // iterator-allocation anti-pattern this rule targets; it is structurally certain regardless
  // of type-checker availability, so this check applies on both the typed and untyped paths.
  public static isLengthOnlyArrayLikeLiteral(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'ObjectExpression') { return false; }
    const properties = node.properties;
    if (!Array.isArray(properties) || properties.length !== 1) { return false; }
    const [property] = properties as readonly unknown[];
    if (!ObjectGuard.isObject(property) || property.type !== 'Property') { return false; }
    if (property.computed === true) { return false; }
    const key = property.key;
    if (!ObjectGuard.isObject(key)) { return false; }
    if (key.type === 'Identifier') { return key.name === 'length'; }
    if (key.type === 'Literal') { return key.value === 'length'; }
    return false;
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

      // `Array.from({ length: n })` — the idiomatic array-LIKE preallocation shape — has no
      // `Symbol.iterator` and is not iterator consumption at all, so it's exempt regardless of
      // type-service availability.
      if (ArrayIteratorDetection.isLengthOnlyArrayLikeLiteral(firstArg)) { return; }

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
