import { Predicates } from '@studnicky/types/browser';

import {
  BUILTIN_COLLECTION_CONSTRUCTOR_NAMES,
  FUNCTION_LIKE_INIT_TYPES,
  PRIMITIVE_WRAPPER_CONSTRUCTOR_NAMES,
  TS_WRAPPER_EXPRESSION_TYPES
} from '../constants/EntityFileShapeConstants.js';

export class DeclaratorName {
  static collectPatternNames(patternNode: unknown, names: string[]): void {
    if (!Predicates.isRecord(patternNode)) {
      return;
    }

    const nodeType: unknown = patternNode.type;

    if (nodeType === 'Identifier') {
      DeclaratorName.collectIdentifierPatternName(patternNode, names);

      return;
    }

    if (nodeType === 'AssignmentPattern') {
      DeclaratorName.collectPatternNames(patternNode.left, names);

      return;
    }

    if (nodeType === 'RestElement') {
      DeclaratorName.collectPatternNames(patternNode.argument, names);

      return;
    }

    if (nodeType === 'ObjectPattern') {
      DeclaratorName.collectObjectPatternNames(patternNode, names);

      return;
    }

    if (nodeType === 'ArrayPattern') {
      DeclaratorName.collectArrayPatternNames(patternNode, names);
    }
  }

  static collectIdentifierPatternName(patternNode: Record<string, unknown>, names: string[]): void {
    const name: unknown = patternNode.name;

    if (typeof name === 'string') {
      names.push(name);
    }
  }

  static collectObjectPatternNames(patternNode: Record<string, unknown>, names: string[]): void {
    const properties: unknown = patternNode.properties;

    if (!Array.isArray(properties)) {
      return;
    }

    const propertiesLength = properties.length;

    for (let index = 0; index < propertiesLength; index += 1) {
      const property: unknown = properties.at(index);

      if (!Predicates.isRecord(property)) {
        continue;
      }

      if (property.type === 'RestElement') {
        DeclaratorName.collectPatternNames(property.argument, names);
        continue;
      }

      DeclaratorName.collectPatternNames(property.value, names);
    }
  }

  static collectArrayPatternNames(patternNode: Record<string, unknown>, names: string[]): void {
    const elements: unknown = patternNode.elements;

    if (!Array.isArray(elements)) {
      return;
    }

    const elementsLength = elements.length;

    for (let index = 0; index < elementsLength; index += 1) {
      const element: unknown = elements.at(index);

      if (element === null || element === undefined) {
        continue;
      }
      DeclaratorName.collectPatternNames(element, names);
    }
  }

  static getAll(declarator: unknown): string[] {
    if (!Predicates.isRecord(declarator)) {
      return [];
    }

    const names: string[] = [];

    DeclaratorName.collectPatternNames(declarator.id, names);

    return names;
  }

  // TS wrapper expressions (`as`, `satisfies`, `!`, `<T>x`) carry no data
  // shape of their own — unwrap to the expression underneath before
  // classifying it as function/reference-like or as data.
  static unwrapTsExpression(node: unknown): unknown {
    let current = node;

    while (Predicates.isRecord(current) && typeof current.type === 'string' && TS_WRAPPER_EXPRESSION_TYPES.has(current.type)) {
      current = current.expression;
    }

    return current;
  }

  // A call to a primitive-wrapper builtin (`Number(...)`, `String(...)`, `Boolean(...)`) with a
  // single literal argument produces a plain primitive value, not a function/reference — a magic
  // constant spelled `Number(3)` is still the magic constant `3`, not a factory or dispatch map.
  static isPrimitiveWrapperLiteralCall(node: unknown): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'CallExpression') {
      return false;
    }

    const callee: unknown = node.callee;

    if (!Predicates.isRecord(callee) || callee.type !== 'Identifier') {
      return false;
    }

    const { name } = callee;

    if (typeof name !== 'string' || !PRIMITIVE_WRAPPER_CONSTRUCTOR_NAMES.has(name)) {
      return false;
    }

    const argumentList: unknown = node.arguments;

    if (!Array.isArray(argumentList) || argumentList.length !== 1) {
      return false;
    }

    const argument: unknown = argumentList.at(0);
    const result = Predicates.isRecord(argument) && argument.type === 'Literal';

    return result;
  }

  // `Object.freeze(<ObjectExpression|ArrayExpression>)` produces a frozen data constant, not
  // a reference — the same reasoning as isPrimitiveWrapperLiteralCall, just for a
  // MemberExpression callee instead of a bare-Identifier one. Frozen object and array
  // literals keep function-valued members out of the data-constant category.
  static isFrozenDataLiteralCall(node: unknown): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'CallExpression') {
      return false;
    }

    if (!DeclaratorName.isObjectFreezeCallee(node.callee)) {
      return false;
    }

    const argumentList: unknown = node.arguments;

    if (!Array.isArray(argumentList) || argumentList.length !== 1) {
      return false;
    }

    const argument: unknown = argumentList.at(0);
    const result = DeclaratorName.isFrozenDataLiteralArgument(argument);

    return result;
  }

  static isObjectFreezeCallee(callee: unknown): boolean {
    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression') {
      return false;
    }

    const calleeObject: unknown = callee.object;
    const calleeProperty: unknown = callee.property;
    const result = Predicates.isRecord(calleeObject) && calleeObject.type === 'Identifier'
      && calleeObject.name === 'Object'
      && Predicates.isRecord(calleeProperty) && calleeProperty.type === 'Identifier'
      && calleeProperty.name === 'freeze';

    return result;
  }

  static isFrozenDataLiteralArgument(argument: unknown): boolean {
    if (!Predicates.isRecord(argument)) {
      return false;
    }
    if (argument.type === 'ArrayExpression') {
      const result = !DeclaratorName.isFunctionValuedArrayExpression(argument);

      return result;
    }
    if (argument.type === 'ObjectExpression') {
      const result = !DeclaratorName.isFunctionValuedObjectExpression(argument);

      return result;
    }

    return false;
  }

  // A value counts as function/reference-like — and therefore not inline
  // data — when it is a function literal, a call result, a member-access
  // reference (e.g. `Ns.method`, an interop-shim `.default` access), or a
  // `??`/`||`/`&&` fallback chain composed of such values (e.g. the
  // `(Mod as ...).default ?? (Mod as ...)` CJS/ESM interop pattern).
  //
  // A `CallExpression` is function/reference-like only when it is NOT a primitive-wrapper
  // builtin call with a literal argument — `Number(3)`/`String("x")`/`Boolean(true)` construct a
  // plain data value, not a reference, so they stay counted as data constants like any other
  // literal. Every other call (a factory, a schema-builder, an arbitrary function invocation) is
  // still treated as a reference/function-like value, unchanged.
  static isFunctionOrReferenceValue(node: unknown): boolean {
    const unwrapped = DeclaratorName.unwrapTsExpression(node);

    if (!Predicates.isRecord(unwrapped)) {
      return false;
    }

    const nodeType: unknown = unwrapped.type;

    if (typeof nodeType !== 'string') {
      return false;
    }

    if (FUNCTION_LIKE_INIT_TYPES.has(nodeType)) {
      return true;
    }
    if (nodeType === 'MemberExpression') {
      return true;
    }
    if (nodeType === 'CallExpression') {
      const result = !DeclaratorName.isPrimitiveWrapperLiteralCall(unwrapped) && !DeclaratorName.isFrozenDataLiteralCall(unwrapped);

      return result;
    }

    if (nodeType === 'LogicalExpression') {
      const result = DeclaratorName.isFunctionOrReferenceValue(unwrapped.left) || DeclaratorName.isFunctionOrReferenceValue(unwrapped.right);

      return result;
    }

    return false;
  }

  // A frozen array of functions is a callback collection, not data.
  static isFunctionValuedArrayExpression(node: unknown): boolean {
    if (!Predicates.isRecord(node) || !Array.isArray(node.elements)) {
      return false;
    }

    const result = node.elements.some((element) => {
      const isFunctionOrReference = DeclaratorName.isFunctionOrReferenceValue(element);

      return isFunctionOrReference;
    });

    return result;
  }

  // An object literal is a function namespace (dispatch map / matcher set),
  // not a data constant, when at least one of its properties is itself
  // function- or reference-valued. An object literal with zero such
  // properties is pure data and still counts as a data constant.
  static isFunctionValuedObjectExpression(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    const properties: unknown = node.properties;

    if (!Array.isArray(properties)) {
      return false;
    }

    const propertyList: readonly unknown[] = properties;
    const result = propertyList.some((property) => {
      if (!Predicates.isRecord(property) || property.type !== 'Property') {
        return false;
      }

      const isFunctionValued = DeclaratorName.isFunctionOrReferenceValue(property.value);

      return isFunctionValued;
    });

    return result;
  }

  // `new Set(...)` / `new Map(...)` / `new WeakSet(...)` / `new WeakMap(...)`
  // (unqualified global identifier callee) are conventional data-constant
  // forms and remain data constants. Any other `new` expression (e.g.
  // `new AjvClass(...)`) constructs a stateful instance, not data.
  static isBuiltinCollectionConstructor(calleeNode: unknown): boolean {
    if (!Predicates.isRecord(calleeNode) || calleeNode.type !== 'Identifier') {
      return false;
    }
    const { name } = calleeNode;
    const result = typeof name === 'string' && BUILTIN_COLLECTION_CONSTRUCTOR_NAMES.has(name);

    return result;
  }

  static isNonDataConstantInit(declarator: unknown): boolean {
    if (!Predicates.isRecord(declarator)) {
      return false;
    }

    const initNode: unknown = declarator.init;

    if (!Predicates.isRecord(initNode)) {
      return false;
    }

    if (DeclaratorName.isFunctionOrReferenceValue(initNode)) {
      return true;
    }

    const initType: unknown = initNode.type;

    if (typeof initType !== 'string') {
      return false;
    }

    if (initType === 'ObjectExpression') {
      const result = DeclaratorName.isFunctionValuedObjectExpression(initNode);

      return result;
    }

    if (initType === 'NewExpression') {
      const result = !DeclaratorName.isBuiltinCollectionConstructor(initNode.callee);

      return result;
    }

    return false;
  }
}
