import type { Rule } from 'eslint';
import type { Declaration } from 'typescript';

import {
  getCombinedModifierFlags, isFunctionLike, isSourceFile, ModifierFlags
} from 'typescript';

import { Predicates } from '#runtime';

import { AstHelpers } from './astHelpers.js';

class NodeExpressionAccess {
  public static getExpression(node: unknown): unknown {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    return node.expression;
  }
}

class ThisAccess {
  public static isRooted(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }
    const t = AstHelpers.getNodeType(node);

    if (t === 'ThisExpression') {
      return true;
    }
    if (t === 'MemberExpression') {
      const result = ThisAccess.isRooted(node.object);

      return result;
    }

    return false;
  }

  public static isMemberExpression(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }
    if (node.type !== 'MemberExpression') {
      return false;
    }

    const result = ThisAccess.isRooted(node.object);

    return result;
  }
}

class ArgumentInspection {
  /** True when any argument of a call expression reads `this` or a private (`#`) field. */
  public static referencesInstanceState(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    const argumentList: unknown = node.arguments;

    if (!Array.isArray(argumentList)) {
      return false;
    }

    const argumentCount = argumentList.length;

    for (let index = 0; index < argumentCount; index += 1) {
      if (ArgumentInspection.#readsInstanceState(argumentList.at(index), 0)) {
        return true;
      }
    }

    return false;
  }

  static #readsInstanceState(node: unknown, depth: number): boolean {
    if (depth > 6 || !Predicates.isRecord(node)) {
      return false;
    }

    const type = AstHelpers.getNodeType(node);

    if (type === 'ThisExpression' || type === 'PrivateIdentifier') {
      return true;
    }

    const values = Object.values(node);
    const valueCount = values.length;

    for (let index = 0; index < valueCount; index += 1) {
      const value = values.at(index);

      if (Array.isArray(value)) {
        const itemCount = value.length;

        for (let item = 0; item < itemCount; item += 1) {
          if (ArgumentInspection.#readsInstanceState(value.at(item), depth + 1)) {
            return true;
          }
        }
      } else if (ArgumentInspection.#readsInstanceState(value, depth + 1)) {
        return true;
      }
    }

    return false;
  }
}

// See docs/eslint/rules/inline-trivial-logic.md "Exemptions" for the accessibility rationale.
class InaccessibleReceiverGuard {
  /** True when `node` unwraps to a `CallExpression` whose callee has a non-public member in the chain: the method itself, or an intermediate receiver field. */
  public static hasInaccessibleReceiver(node: unknown, context: Rule.RuleContext): boolean {
    const call = InaccessibleReceiverGuard.unwrapToCallExpression(node);

    if (call === undefined) {
      return false;
    }

    const callee = call.callee;

    if (!Predicates.isRecord(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') {
      return false;
    }

    const target = InaccessibleReceiverGuard.#accessibilityTarget(callee);

    if (target === undefined) {
      return false;
    }
    if (InaccessibleReceiverGuard.#isPrivateIdentifierAccess(target)) {
      return true;
    }

    const result = InaccessibleReceiverGuard.#isNonPublicMember(target, context);

    return result;
  }

  /** The `this.<name>` access whose accessibility gates this call; `undefined` when the callee's object is not `this`-rooted. */
  static #accessibilityTarget(callee: unknown): unknown {
    if (!Predicates.isRecord(callee)) {
      return undefined;
    }

    const calleeObject = callee.object;

    if (AstHelpers.getNodeType(calleeObject) === 'ThisExpression') {
      return callee;
    }
    if (ThisAccess.isMemberExpression(calleeObject)) {
      return calleeObject;
    }

    return undefined;
  }

  static #isPrivateIdentifierAccess(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    const result = AstHelpers.getNodeType(node.property) === 'PrivateIdentifier';

    return result;
  }

  /** `private`/`protected` resolved through the checker — see the module comment above. */
  static #isNonPublicMember(node: unknown, context: Rule.RuleContext): boolean {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return false;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (tsNode === undefined) {
      return false;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(tsNode);
    const declarations = symbol?.getDeclarations() ?? [];
    const declarationCount = declarations.length;

    for (let index = 0; index < declarationCount; index += 1) {
      const declaration = declarations.at(index);

      if (declaration === undefined) {
        continue;
      }

      const flags = getCombinedModifierFlags(declaration);

      if ((flags & (ModifierFlags.Private | ModifierFlags.Protected)) !== 0) {
        return true;
      }
    }

    return false;
  }

  public static unwrapToCallExpression(node: unknown): { readonly 'arguments': unknown; readonly 'callee': unknown } | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    const type = AstHelpers.getNodeType(node);

    if (type === 'CallExpression') {
      return { 'arguments': node.arguments, 'callee': node.callee };
    }
    if (type === 'AwaitExpression') {
      const result = InaccessibleReceiverGuard.unwrapToCallExpression(node.argument);

      return result;
    }
    if (type === 'ChainExpression') {
      const result = InaccessibleReceiverGuard.unwrapToCallExpression(node.expression);

      return result;
    }

    return undefined;
  }
}

// See docs/eslint/rules/inline-trivial-logic.md "Exemptions" for the receiver-binding rationale.
class ReceiverBindingAdapterGuard {
  /** True when `node` calls `<receiver>.<method>` where `<receiver>` is a plain, locally-scoped Identifier (not `this`). */
  public static isReceiverBindingAdapter(node: unknown, context: Rule.RuleContext): boolean {
    if (!Predicates.isRecord(node) || AstHelpers.getNodeType(node) !== 'CallExpression') {
      return false;
    }

    const callee = node.callee;

    if (!Predicates.isRecord(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') {
      return false;
    }

    const receiver = callee.object;

    if (!Predicates.isRecord(receiver) || AstHelpers.getNodeType(receiver) !== 'Identifier') {
      return false;
    }

    const result = ReceiverBindingAdapterGuard.#isLocallyScopedReceiver(receiver, context);

    return result;
  }

  static #isLocallyScopedReceiver(receiver: unknown, context: Rule.RuleContext): boolean {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return false;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(receiver);

    if (tsNode === undefined) {
      return false;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(tsNode);
    const declarations = symbol?.getDeclarations() ?? [];
    const declarationCount = declarations.length;

    for (let index = 0; index < declarationCount; index += 1) {
      const declaration = declarations.at(index);

      if (declaration !== undefined && ReceiverBindingAdapterGuard.#crossesFunctionBoundary(declaration)) {
        return true;
      }
    }

    return false;
  }

  /** Walks a declaration's ancestors: a function-like node reached before the `SourceFile` root means it is locally scoped. */
  static #crossesFunctionBoundary(declaration: Declaration): boolean {
    let current = declaration.parent;

    while (current !== undefined) {
      if (isFunctionLike(current)) {
        return true;
      }
      if (isSourceFile(current)) {
        return false;
      }

      current = current.parent;
    }

    return false;
  }
}

// See docs/eslint/rules/inline-trivial-logic.md "Exemptions" for the argument-forwarding
// rationale: every argument must be a literal or a bare reference to the function's own parameter.
class CallArgumentForwarding {
  public static isPureForward(node: unknown, parameterNames: ReadonlySet<string>): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    const argumentList = node.arguments;

    if (!Array.isArray(argumentList)) {
      return false;
    }

    const argumentCount = argumentList.length;

    for (let index = 0; index < argumentCount; index += 1) {
      if (!CallArgumentForwarding.#isForwardedArgument(argumentList.at(index), parameterNames)) {
        return false;
      }
    }

    return true;
  }

  static #isForwardedArgument(node: unknown, parameterNames: ReadonlySet<string>): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    const type = AstHelpers.getNodeType(node);

    if (type === 'Literal' || type === 'TemplateLiteral') {
      return true;
    }
    if (type === 'Identifier') {
      const name = AstHelpers.getIdentifierName(node);
      const result = name !== undefined && parameterNames.has(name);

      return result;
    }

    return false;
  }
}

// See docs/eslint/rules/inline-trivial-logic.md "Exemptions" for the parameter-selection
// rationale: `parameterNames.size > 1` means one parameter is returned, the rest discarded.
class IdentifierSelection {
  public static isParameterSelection(node: unknown, parameterNames: ReadonlySet<string>): boolean {
    const name = AstHelpers.getIdentifierName(node);

    if (name === undefined || !parameterNames.has(name)) {
      return false;
    }

    const result = parameterNames.size > 1;

    return result;
  }
}

interface TrivialExpressionOptionsInterface {
  readonly 'allowLiterals': boolean;
  readonly 'allowMemberExpressions': boolean;
}

export class TrivialExpression {
  public static isTrivial(
    node: unknown,
    options: TrivialExpressionOptionsInterface,
    parameterNames: ReadonlySet<string>,
    context: Rule.RuleContext
  ): boolean {
    const type = AstHelpers.getNodeType(node);

    if (type === undefined) {
      return false;
    }

    const memberOrLiteral = TrivialExpression.#classifyMemberOrLiteral(node, type, options);

    if (memberOrLiteral !== undefined) {
      return memberOrLiteral;
    }

    const passThrough = TrivialExpression.#classifyPassThrough(node, type, parameterNames, context);

    if (passThrough !== undefined) {
      return passThrough;
    }

    const recursed = TrivialExpression.#classifyRecursive(node, type, options, parameterNames, context);
    const result = recursed ?? false;

    return result;
  }

  // Factories/constructors create new value, never a shim; member/literal access is opt-in via options.
  static #classifyMemberOrLiteral(
    node: unknown,
    type: string,
    options: TrivialExpressionOptionsInterface
  ): boolean | undefined {
    if (type === 'ObjectExpression' || type === 'ArrayExpression' || type === 'NewExpression') {
      return false;
    }

    // Accessor pattern: `return this.x` inside a method body. Not a shim — it exposes a field.
    if (type === 'MemberExpression') {
      if (ThisAccess.isMemberExpression(node)) {
        return false;
      }

      const result = !options.allowMemberExpressions;

      return result;
    }

    // Constant literals — inline at call site rather than wrapping.
    if (type === 'Literal' || type === 'TemplateLiteral') {
      const result = !options.allowLiterals;

      return result;
    }

    return undefined;
  }

  // Pure pass-through: forwarding an identifier, delegating a call, or chaining.
  static #classifyPassThrough(
    node: unknown,
    type: string,
    parameterNames: ReadonlySet<string>,
    context: Rule.RuleContext
  ): boolean | undefined {
    const isPassThroughType = type === 'Identifier'
      || type === 'CallExpression'
      || type === 'AwaitExpression'
      || type === 'ChainExpression';

    if (!isPassThroughType) {
      return undefined;
    }

    if (TrivialExpression.#hasNonForwardingReason(node, type, parameterNames, context)) {
      return false;
    }

    return true;
  }

  static #hasNonForwardingReason(
    node: unknown,
    type: string,
    parameterNames: ReadonlySet<string>,
    context: Rule.RuleContext
  ): boolean {
    // A bare identifier that SELECTS among several of the function's own parameters is not
    // identity forwarding — see the module comment above `IdentifierSelection`.
    if (type === 'Identifier' && IdentifierSelection.isParameterSelection(node, parameterNames)) {
      return true;
    }
    // A call passing instance state as an argument is doing work, not forwarding — see
    // docs/eslint/rules/inline-trivial-logic.md "Exemptions".
    if (ArgumentInspection.referencesInstanceState(node)) {
      return true;
    }
    // Forwarding to a non-public receiver is exactly as unfixable as passing `this`/`#field`
    // as an argument — see the module comment above `InaccessibleReceiverGuard`.
    if (InaccessibleReceiverGuard.hasInaccessibleReceiver(node, context)) {
      return true;
    }
    // A call preserving a runtime-injected receiver's binding is an adapter, not a shim —
    // see the module comment above `ReceiverBindingAdapterGuard`.
    if (type === 'CallExpression' && ReceiverBindingAdapterGuard.isReceiverBindingAdapter(node, context)) {
      return true;
    }
    // A call must additionally forward its OWN arguments 1:1 — including calls wrapped by
    // `await` or optional chaining. The shared unwrap preserves the call argument list.
    const call = InaccessibleReceiverGuard.unwrapToCallExpression(node);
    const result = call !== undefined && !CallArgumentForwarding.isPureForward(call, parameterNames);

    return result;
  }

  // TS wrapper stripping and sequence-expression tail recursion.
  static #classifyRecursive(
    node: unknown,
    type: string,
    options: TrivialExpressionOptionsInterface,
    parameterNames: ReadonlySet<string>,
    context: Rule.RuleContext
  ): boolean | undefined {
    // Strip TS wrappers and recurse.
    if (type === 'TSAsExpression' || type === 'TSNonNullExpression' || type === 'TSSatisfiesExpression') {
      const result = TrivialExpression.isTrivial(NodeExpressionAccess.getExpression(node), options, parameterNames, context);

      return result;
    }

    // `(0, trivialCall(x))` — only the LAST operand is the value; recurse into it.
    if (type === 'SequenceExpression') {
      const rawNode: unknown = node;
      const expressions: unknown = Predicates.isRecord(rawNode) ? rawNode.expressions : undefined;

      if (!Array.isArray(expressions) || expressions.length === 0) {
        return false;
      }

      const result = TrivialExpression.isTrivial(expressions.at(-1), options, parameterNames, context);

      return result;
    }

    return undefined;
  }
}
