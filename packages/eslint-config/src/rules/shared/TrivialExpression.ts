import type { Rule } from 'eslint';
import type { Declaration } from 'typescript';

import {
  getCombinedModifierFlags, isFunctionLike, isSourceFile, ModifierFlags
} from 'typescript';

import { AstHelpers } from './astHelpers.js';
import { ObjectGuard } from './ObjectGuard.js';

class NodeExpressionAccess {
  public static getExpression(node: unknown): unknown {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    return node.expression;
  }
}

class ThisAccess {
  public static isRooted(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) {
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
    if (!ObjectGuard.isObject(node)) {
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
    if (!ObjectGuard.isObject(node)) {
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
    if (depth > 6 || !ObjectGuard.isObject(node)) {
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

// A FORWARDED CALL TO A NON-PUBLIC RECEIVER HAS NO CALL SITE TO INLINE INTO EITHER.
//
// `ArgumentInspection` above covers `this`/`#field` passed as an ARGUMENT to a call. The same
// unfixability applies on the other side of the call — the RECEIVER:
//
//   public getHookErrors(): readonly HookInvocationError[] {
//     const result = this.hooks.getHookErrors();     // `hooks` is `protected`
//     return result;
//   }
//   public toUserMessage(): string {
//     const result = this.formatUserMessage();        // `formatUserMessage` is `protected`
//     return result;
//   }
//
// The boundary is ACCESSIBILITY, not the `#` sigil specifically. A `protected` member is
// exactly as unreachable from an external call site as a `#private` one — TypeScript rejects
// `external.hooks` outside the class and its subclasses (TS2445) the same way it rejects
// `external.#field` everywhere (a syntax error, not even a type error). `private` sits between
// them, reachable only inside the declaring class. In all three cases "inline the logic at the
// call site" names a rewrite with no valid target: there is no external expression that
// resolves to the receiver. Only a `public` receiver keeps the remedy the message names
// actually available, so `this.publicField.method()` and a bare `this.method()` calling a
// public method stay reported.
//
// Detection is two-layered. `#field` is checked syntactically (a `PrivateIdentifier` property
// name) — ECMAScript private fields are inherently unresolvable outside the class by the
// language itself, no type information needed. `private`/`protected` are TypeScript-only
// modifiers with no distinct AST node shape (a `private` field and a `public` one are both
// plain `Identifier` property names), so those require resolving the accessed member's
// declaration through the checker and reading its combined modifier flags.
class InaccessibleReceiverGuard {
  /**
   * True when `node` is (or unwraps, through `await`/optional-chaining, to) a `CallExpression`
   * whose callee is a `this`-rooted member access with a non-public member somewhere in the
   * chain a caller would need to rewrite: either the called method itself (`this.method()`,
   * `method` non-public) or an intermediate receiver field (`this.field.method()`, `field`
   * non-public — `method` may be public on `field`'s own type and it would not matter).
   */
  public static hasInaccessibleReceiver(node: unknown, context: Rule.RuleContext): boolean {
    const call = InaccessibleReceiverGuard.#unwrapToCallExpression(node);

    if (call === undefined) {
      return false;
    }

    const callee = call.callee;

    if (!ObjectGuard.isObject(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') {
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

  /**
   * The single `this.<name>` member access whose accessibility gates rewriting this call to an
   * external call site — `callee` itself for a direct `this.method(...)` call, or `callee`'s
   * object for a `this.field.method(...)` call. `undefined` when the callee's object is
   * neither `this` itself nor a member-access chain rooted at `this`.
   */
  static #accessibilityTarget(callee: unknown): unknown {
    if (!ObjectGuard.isObject(callee)) {
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
    if (!ObjectGuard.isObject(node)) {
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

  static #unwrapToCallExpression(node: unknown): { readonly 'callee': unknown } | undefined {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    const type = AstHelpers.getNodeType(node);

    if (type === 'CallExpression') {
      return node as { readonly 'callee': unknown };
    }
    if (type === 'AwaitExpression') {
      const result = InaccessibleReceiverGuard.#unwrapToCallExpression(node.argument);

      return result;
    }
    if (type === 'ChainExpression') {
      const result = InaccessibleReceiverGuard.#unwrapToCallExpression(node.expression);

      return result;
    }

    return undefined;
  }
}

// A CALL THAT PRESERVES A RUNTIME RECEIVER'S BINDING IS AN ADAPTER, NOT A SHIM.
//
//   } else {
//     const classifier = validated.errorClassifier;
//     classifierCallback = (error, attemptNumber) => { const result = classifier.classify(error, attemptNumber); return result; };
//   }
//
// (`packages/retry/src/retry/Retry.ts`.) `classifier` holds a RUNTIME-INJECTED,
// CONSUMER-SUPPLIED value — validated only to possess a `classify` method, its
// implementation unknown to this codebase. The arrow is not a redundant wrapper around
// `classifier.classify`; it IS the receiver binding. Deleting it and writing
// `classifierCallback = classifier.classify;` instead DETACHES the method from `classifier` —
// any implementation of `classify` that reads `this` internally breaks silently the next time
// `classifierCallback` runs, because `this` would then be `undefined` rather than `classifier`.
// "Inline the logic at the call site" cannot mean "reference the bare method", because that
// is not the same program. The neighbouring branch in the SAME `if`/`else` chain is the direct
// proof: `classifierCallback = validated.errorClassifier;` (no wrapper at all) is exactly
// right ONE case earlier, because that branch's value is already a bare function with no
// receiver to lose.
//
// The boundary that keeps this from swallowing every `receiver.method()` forward: the
// RECEIVER'S OWN DECLARATION must be locally scoped — nested inside some enclosing function,
// rather than declared at module top level or resolved from a standard-library `lib.*.d.ts`
// file. `Math.abs(v)` and `DataType.deepEqual(value, constantValue)` (see
// `CallArgumentForwarding`'s own comment, and `inline-trivial-logic`'s pinned "static method
// exact ticket shape" test) both reduce to the identical AST shape — `receiver.method(args)` —
// and both MUST stay reported: `Math` resolves to a `lib.es5.d.ts` global, `DataType` resolves
// to a module-level `import` declared at this file's top level. Neither is runtime-injected;
// both are statically known machinery any caller could reference directly, so there is
// nothing to detach and no `.bind()`-equivalent lost by inlining. Verified directly against
// this repo's own checker: `classifier`'s declaration crosses a function boundary before
// reaching its `SourceFile` (it is a `const` inside the constructor body); `Math`'s and
// `DataType`'s declarations do not (a global and a top-level import, respectively).
class ReceiverBindingAdapterGuard {
  /**
   * True when `node` is a `CallExpression` whose callee is `<receiver>.<method>`, `<receiver>`
   * is a plain `Identifier` (not `this` — that case belongs to `InaccessibleReceiverGuard`),
   * and `<receiver>`'s declaration is locally scoped. See the module comment above.
   */
  public static isReceiverBindingAdapter(node: unknown, context: Rule.RuleContext): boolean {
    if (!ObjectGuard.isObject(node) || AstHelpers.getNodeType(node) !== 'CallExpression') {
      return false;
    }

    const callee = node.callee;

    if (!ObjectGuard.isObject(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') {
      return false;
    }

    const receiver = callee.object;

    if (!ObjectGuard.isObject(receiver) || AstHelpers.getNodeType(receiver) !== 'Identifier') {
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

// A CALL FORWARDS ONLY WHEN ITS ARGUMENTS ARE A GENUINE 1:1 RELAY.
//
//   static withCeiling(strategy: BackoffStrategyInterface, ceilingMs: number): BackoffStrategyInterface {
//     return (attempt, base) => { const result = Math.min(ceilingMs, strategy(attempt, base)); return result; };
//   }
//
// The returned arrow's body IS a `CallExpression`, so the old check — "is the body one call
// wrapping a return?" — classified it as a trivial forward. It is not: `Math.min` is called
// with a CLOSED-OVER outer variable (`ceilingMs`, not one of THIS arrow's own parameters) and
// the RESULT of another call (`strategy(attempt, base)`). Nothing here is a pass-through of
// the enclosing function's own inputs; this is a decorator that caps a strategy's output.
//
// A genuine forward passes its OWN parameters straight through, unmodified, possibly
// alongside literals:
//
//   satisfiesConstant(value, constantValue) { return DataType.deepEqual(value, constantValue); }
//
// Both arguments are bare references to the method's own parameters — that call stays
// reported. The boundary: every argument must be either a literal or a bare `Identifier`
// naming one of the enclosing function's own declared parameters. A nested call, a
// binary/conditional/other computed expression, or a reference to a variable the enclosing
// function did not itself declare as a parameter (a closed-over outer binding) means the
// function is doing WORK — combining, capping, deriving — and must not be reported.
class CallArgumentForwarding {
  public static isPureForward(node: unknown, parameterNames: ReadonlySet<string>): boolean {
    if (!ObjectGuard.isObject(node)) {
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
    if (!ObjectGuard.isObject(node)) {
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

// A BARE-IDENTIFIER RETURN THAT SELECTS AMONG SEVERAL OF ITS OWN PARAMETERS IS NOT A SHIM.
//
//   static constant(_attemptNumber: number, baseDelayMs: number): number {
//     const result = baseDelayMs;
//     return result;
//   }
//
// This function reduces to a bare `Identifier` naming one of its own parameters, the same
// reduced shape as the textbook identity shim this rule exists to catch:
//
//   function passThrough(x: number): number { return x; }     <- 1 own parameter, still reported
//
// The difference is what the function DISCARDS. `passThrough` has exactly one parameter and
// returns exactly it — pure identity, nothing to select, no computation of any kind.
// `constant` has TWO parameters and returns only ONE of them, ignoring `_attemptNumber`
// entirely (the leading underscore is this codebase's own "deliberately unused" convention) —
// that IS the constant-backoff ALGORITHM: always answer with the base delay, regardless of
// attempt number. A single-parameter identity function has nothing to discard, so this
// distinction is invisible there — it only shows up once a second declared parameter exists
// and goes unused by the return. `DEFAULT_OPTIONS.allowLiterals` in `inline-trivial-logic`
// makes the same point from a different angle for a body that reduces to a literal instead of
// a parameter reference: a body that IS the value forwards to nothing, so "inline the logic at
// the call site" names a rewrite that does not apply. `parameterNames.size > 1` is the check
// here: more than one parameter declared, one of them returned unchanged, the rest silently
// dropped.
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

export class TrivialExpression {
  public static isTrivial(
    node: unknown,
    options: { 'allowLiterals': boolean; 'allowMemberExpressions': boolean },
    parameterNames: ReadonlySet<string>,
    context: Rule.RuleContext
  ): boolean {
    const type = AstHelpers.getNodeType(node);

    if (type === undefined) {
      return false;
    }

    // Factories and constructors — creating new value, not forwarding one. Never a shim.
    if (
      type === 'ObjectExpression'
      || type === 'ArrayExpression'
      || type === 'NewExpression'
    ) {
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

    // Pure pass-through: forwarding an identifier, delegating a call, or chaining.
    if (
      type === 'Identifier'
      || type === 'CallExpression'
      || type === 'AwaitExpression'
      || type === 'ChainExpression'
    ) {
      // A bare identifier that SELECTS among several of the function's own parameters is not
      // identity forwarding — see the module comment above `IdentifierSelection`.
      if (type === 'Identifier' && IdentifierSelection.isParameterSelection(node, parameterNames)) {
        return false;
      }
      // A call that passes INSTANCE STATE as an argument is doing work, not forwarding.
      //
      //   getIds() { return Array.from(this.#entities.keys()); }
      //
      // That materialises a defensive copy out of a private field. "Inline the logic at
      // the call site" is not merely undesirable here, it is impossible: an external
      // caller cannot reach `#entities`, so there is no call site the body could move to.
      // A rule whose remedy cannot be performed is reporting a false positive.
      //
      // A genuine forward passes its OWN PARAMETERS through and adds nothing:
      //
      //   wrap(value) { return compute(value); }                 <- forward, reported
      //   dispatch() { return this.publicHandler(); }             <- forward, reported (public)
      //
      // A zero-argument call on `this` is a pure delegation, and the padded
      // `const result = …; return result;` spelling must not hide it — that was the whole
      // point of making detection semantic. It stays reported only when the called member is
      // PUBLIC, though — see `InaccessibleReceiverGuard` immediately below for the
      // `protected`/`private`/`#field` case, which is not a shim regardless of argument count.
      if (ArgumentInspection.referencesInstanceState(node)) {
        return false;
      }
      // Forwarding to a non-public receiver is exactly as unfixable as passing `this`/`#field`
      // as an argument — see the module comment above `InaccessibleReceiverGuard`.
      if (InaccessibleReceiverGuard.hasInaccessibleReceiver(node, context)) {
        return false;
      }
      // A call preserving a runtime-injected receiver's binding is an adapter, not a shim —
      // see the module comment above `ReceiverBindingAdapterGuard`.
      if (type === 'CallExpression' && ReceiverBindingAdapterGuard.isReceiverBindingAdapter(node, context)) {
        return false;
      }
      // A direct CallExpression must additionally forward its OWN arguments 1:1 — see the
      // module comment above `CallArgumentForwarding`. `Identifier`/`AwaitExpression`/
      // `ChainExpression` have no `arguments` list of their own to check here.
      if (type === 'CallExpression' && !CallArgumentForwarding.isPureForward(node, parameterNames)) {
        return false;
      }

      return true;
    }

    // Strip TS wrappers and recurse.
    if (type === 'TSAsExpression' || type === 'TSNonNullExpression' || type === 'TSSatisfiesExpression') {
      const result = TrivialExpression.isTrivial(NodeExpressionAccess.getExpression(node), options, parameterNames, context);

      return result;
    }

    // `(0, trivialCall(x))` — a comma-sequence-expression whose leading operands are throwaway
    // noise. Only the LAST expression is the value the sequence evaluates to; recurse into it
    // against the same triviality rules.
    if (type === 'SequenceExpression') {
      const rawNode: unknown = node;
      const expressions: unknown = ObjectGuard.isObject(rawNode) ? rawNode.expressions : undefined;

      if (!Array.isArray(expressions) || expressions.length === 0) {
        return false;
      }

      const result = TrivialExpression.isTrivial(expressions.at(-1), options, parameterNames, context);

      return result;
    }

    return false;
  }
}
