import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { REFLECT_KEYED_METHODS } from '../constants/OpaqueValueShapeConstants.js';
import { AstHelpers } from '../shared/astHelpers.js';

// AN UNTOUCHED SHAPE ISN'T A TRUST DECISION.
//
// `intake-parse-only` exists to stop code from trusting an assumed shape it never validated.
// Plenty of `unknown`/`any` parameters never make that trust decision at all: a lifecycle hook
// that stores a value for later, a generic logger that stringifies whatever it's given, a
// structural clone that walks `Object.keys(value)` and recurses uniformly — none of these assume
// `value` has a `status` field or a `headers` object, so there's no shape for `intake` to check.
//
// This is decidable from the parameter alone: a value is OPAQUE — exempt from the boundary —
// when the function body never accesses it through a LITERAL key (`.foo`, `['foo']`,
// `Reflect.get(x, 'foo')`), never checks a literal key's presence with `in`, and never asserts it
// to a named type. Storing it, forwarding it, comparing it by `===`/`instanceof`, or accessing it
// through a VARIABLE key (`Reflect.get(x, key)` where `key` came from `Object.keys(x)`) all stay
// legal — none of those trust a NAMED field.
//
// `instanceof` deliberately isn't a trust signal by itself: `BoundaryCycleGuard.hasCycle` checks
// `value instanceof Map` / `value instanceof Set` purely to pick a traversal strategy, the same
// role `Array.isArray(value)` already plays without tripping this. A predicate that narrows a
// NAMED field still trips this rule through that field access — `isErrorWithStatus` checks
// `'status' in error` and reads `error.status`, both literal-keyed. A predicate that narrows on
// nothing but `instanceof`/`typeof` and never reads a named field, like a generic
// `Error.isError(value)` wrapper, was never trusting a specific shape in the first place.
//
// A member access that's immediately CALLED (`value.map(...)`, `value.entries()`, `value.at(i)`)
// isn't a trust signal either, unlike one that's READ as a data value (`value.status`). `intake`
// validates DATA SHAPE — the fields a schema declares — never behavior, so a schema-backed
// boundary has nothing to say about whether `value` exposes a callable `.map`. This is what lets
// `SchemaValidator.stripUndefinedProperties` call `value.map(...)`/`DataType.walkForCycle` call
// `value.at(index)` and stay opaque without hand-listing every `Array`/`Map`/`Set` method name.
//
// NON-CALLED structural reads (`.length`, `.size`, `.buffer`) can't be told apart from a domain
// field by name alone — `length` is exactly as plausible a schema property as `status` is. What
// makes them safe here isn't the name; it's that they belong to a fixed, well-known JS/DOM
// built-in surface (`Array`/`Map`/`Set`/`ArrayBufferView`/thenable) rather than an
// application-defined shape. That surface differs by consumer — a codebase working with `Blob`,
// `FormData`, or a domain library has its own such names — so this is NOT a hardcoded rule
// constant. It's the `structuralProperties` rule option: a configurable set, with this
// package's own built-in vocabulary shipped as the default so `@studnicky/eslint-config` works
// out of the box, extendable per consumer exactly like `exemptPackages` already is.
//
// This walk doesn't track lexical shadowing: a nested function that redeclares the same
// parameter name is walked anyway. That can only make the OUTER parameter look "trusted" when a
// same-named inner binding is the one actually accessed — the safe direction to be wrong in,
// since it means staying flagged rather than wrongly exempting.

export class OpaqueValueShape {
  /** Reports whether `parameterName` is never trusted for a specific shape inside `functionNode`. */
  public static isOpaque(functionNode: Rule.Node, parameterName: string, structuralProperties: ReadonlySet<string>): boolean {
    const calledCallees = OpaqueValueShape.#collectCalledCallees(functionNode);
    let trusted = false;

    AstHelpers.forEachDescendant(functionNode, (descendant) => {
      if (trusted) { return; }

      const isTrustSignal = OpaqueValueShape.#isLiteralMemberAccess(descendant, parameterName, calledCallees, structuralProperties)
        || OpaqueValueShape.#isLiteralReflectAccess(descendant, parameterName)
        || OpaqueValueShape.#isLiteralInCheck(descendant, parameterName, structuralProperties)
        || OpaqueValueShape.#isNamedAssertion(descendant, parameterName);

      if (isTrustSignal) { trusted = true; }
    });

    const result = !trusted;
    return result;
  }

  /** Every `MemberExpression` that appears in callee position somewhere under `functionNode`. */
  static #collectCalledCallees(functionNode: Rule.Node): ReadonlySet<unknown> {
    const calledCallees = new Set<unknown>();

    AstHelpers.forEachDescendant(functionNode, (descendant) => {
      if (descendant.type !== 'CallExpression') { return; }
      calledCallees.add(descendant.callee);
    });

    return calledCallees;
  }

  static #referencesParameter(node: unknown, parameterName: string): boolean {
    const result = AstHelpers.getNodeType(node) === 'Identifier' && AstHelpers.getIdentifierName(node) === parameterName;
    return result;
  }

  static #isLiteral(node: unknown): boolean {
    const result = AstHelpers.getNodeType(node) === 'Literal';
    return result;
  }

  static #isLiteralMemberAccess(
    node: Record<string, unknown>,
    parameterName: string,
    calledCallees: ReadonlySet<unknown>,
    structuralProperties: ReadonlySet<string>
  ): boolean {
    if (node.type !== 'MemberExpression') { return false; }
    if (!OpaqueValueShape.#referencesParameter(node.object, parameterName)) { return false; }
    if (calledCallees.has(node)) { return false; }
    if (OpaqueValueShape.#isConfiguredStructuralProperty(node, structuralProperties)) { return false; }
    if (node.computed !== true) { return true; }

    const result = OpaqueValueShape.#isLiteral(node.property);
    return result;
  }

  /**
   * Non-called structural reads named in the `structuralProperties` option — every CALLED generic
   * traversal member (`.map`, `.entries`, `.at`, `.getTime`) is caught by the called-callee check
   * above instead, so this only needs to name the ones read as plain data (`.length`, `.buffer`).
   */
  static #isConfiguredStructuralProperty(node: Record<string, unknown>, structuralProperties: ReadonlySet<string>): boolean {
    if (node.computed === true) { return false; }

    const propertyName = AstHelpers.getIdentifierName(node.property);
    const result = propertyName !== undefined && structuralProperties.has(propertyName);
    return result;
  }

  /** Same configured-property allowance as member access, applied to a literal `in` check's key. */
  static #isConfiguredStructuralInCheck(node: Record<string, unknown>, structuralProperties: ReadonlySet<string>): boolean {
    const key = node.left;
    const propertyName = Predicates.isRecord(key) ? key.value : undefined;
    const result = typeof propertyName === 'string' && structuralProperties.has(propertyName);
    return result;
  }

  static #isLiteralReflectAccess(node: Record<string, unknown>, parameterName: string): boolean {
    if (node.type !== 'CallExpression') { return false; }
    const callee = node.callee;
    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression') { return false; }

    const isReflectMethod = AstHelpers.getIdentifierName(callee.object) === 'Reflect'
      && REFLECT_KEYED_METHODS.has(AstHelpers.getIdentifierName(callee.property) ?? '');
    if (!isReflectMethod) { return false; }

    const argumentList: unknown = node.arguments;
    if (!Predicates.isArray(argumentList) || argumentList.length < 2) { return false; }
    if (!OpaqueValueShape.#referencesParameter(argumentList[0], parameterName)) { return false; }

    const result = OpaqueValueShape.#isLiteral(argumentList[1]);
    return result;
  }

  static #isLiteralInCheck(node: Record<string, unknown>, parameterName: string, structuralProperties: ReadonlySet<string>): boolean {
    if (node.type !== 'BinaryExpression' || node.operator !== 'in') { return false; }
    if (!OpaqueValueShape.#referencesParameter(node.right, parameterName)) { return false; }
    if (OpaqueValueShape.#isConfiguredStructuralInCheck(node, structuralProperties)) { return false; }

    const result = OpaqueValueShape.#isLiteral(node.left);
    return result;
  }

  static #isNamedAssertion(node: Record<string, unknown>, parameterName: string): boolean {
    if (node.type !== 'TSAsExpression' && node.type !== 'TSTypeAssertion') { return false; }

    const typeAnnotation = node.typeAnnotation;
    const hasNamedTarget = Predicates.isRecord(typeAnnotation) && typeAnnotation.type === 'TSTypeReference';
    if (!hasNamedTarget) { return false; }

    const result = OpaqueValueShape.#referencesParameter(node.expression, parameterName);
    return result;
  }
}
