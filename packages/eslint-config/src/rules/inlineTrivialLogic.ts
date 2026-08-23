import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { AstHelpers } from './shared/astHelpers.js';
import { DeclareThenReturnShape } from './shared/DeclareThenReturnShape.js';
import { ObjectGuard } from './shared/ObjectGuard.js';
import { ParameterNames } from './shared/ParameterNames.js';
import { TrivialExpression } from './shared/TrivialExpression.js';

// THREE DEFECTS FOUND AND FIXED HERE, EACH VERIFIED BEFORE AND AFTER THE FIX.
//
// (a) DETECTION WAS SYNTACTIC, SO THE HOUSE STYLE SUPPRESSED IT.
//
// The old detector matched only a single-statement `return <expr>;` body. The
// repo's own deliberate return-binding style (`explicitReturnBinding.ts` — bind
// a call's result to a `const`, then `return` it on its own line) turns a
// single-statement body into a two-statement one, which the old check never
// looked at. Verified directly:
//
//   class X {
//     wrap(v) { return Math.abs(v); }                            // 1 statement
//     wrapPadded(v) { const r = Math.abs(v); return r; }          // 2 statements
//   }
//   npx eslint --no-eslintrc --rulesets ... (old rule)
//   -> `wrap` reported, `wrapPadded` NOT reported.
//
// Both are the same shim: a value passed straight through to another call with
// zero added logic. Padding it with a throwaway binding must not change that.
// Detection is now SEMANTIC: `ForwardedReturnReduction.reduce` reduces a
// function body to "the expression it ultimately returns" whether that
// expression appears directly (`return <expr>;`, 1 statement) or is bound once
// and returned unchanged (`const x = <expr>; return x;`, 2 statements, the
// declared name and the returned name matching exactly) — and then hands that
// SAME reduced expression to the unchanged `TrivialExpression.isTrivial` check.
// A body of any other shape (extra statements, a declarator whose returned name
// doesn't match, a reassignment) does not reduce, and is left alone — this is
// not "flag every 2-statement function", only the exact declare-once-and-
// return-unchanged shape that the 1-statement check already flagged before
// padding.
//
// (b) DOUBLE-REPORTING.
//
// The old listener map registered handlers on BOTH a function's own node type
// (`FunctionExpression`/`ArrowFunctionExpression`) AND every container that can
// hold one (`MethodDefinition`, `Property`) — but a `MethodDefinition`'s
// `value` and a `Property`'s `value` ARE `FunctionExpression`/
// `ArrowFunctionExpression` nodes in the AST, and ESLint's traversal visits
// every node by its own type regardless of its parent. Both listeners fired
// for the same body. Verified:
//
//   export class X { static wrap(v){ return Math.abs(v); } }
//   -> 2 `inline-trivial-logic` messages for 1 violation (one from
//      `MethodDefinition`, one from the child `FunctionExpression`).
//
// The same double-visit applies to `Property` (object methods and object
// arrow-valued properties are visited independently as
// `FunctionExpression`/`ArrowFunctionExpression` nodes too). This inflated
// every trivial-shim count in the repo by up to 2x. FIXED by removing the
// `MethodDefinition` and `Property` listeners entirely — their body checks
// were fully redundant with the `FunctionExpression`/`ArrowFunctionExpression`
// listeners, which already fire on the same child node regardless of what
// contains it (a class method, an object method, an object arrow-valued
// property, or nothing at all). Each function-bearing node in the AST now has
// exactly one listener whose type matches it, so it is visited, and reported,
// exactly once. `FunctionDeclaration` was never double-visited (it has no
// separate container node) and is unaffected.
//
// (c) THE AUTOFIXER CONTRADICTED ITS OWN MESSAGE.
//
// The message says "Inline the logic at the call site" — i.e. delete the shim
// and have callers invoke the target directly. The old fixer instead REWROTE
// `return <expr>;` into `const result = <expr>; return result;`, which is not
// an inlining — it is exactly the padding shape that defect (a) shows defeats
// this rule's own detector. Shipping that fixer meant `eslint --fix` actively
// broke the rule it was attached to.
//
// "Inline the logic at the call site" is a cross-file, semantics-changing
// rewrite: every call site of the shim must be found and rewritten to call the
// target directly, which may be impossible for an exported/externally-consumed
// method and is unsafe for an autofixer to attempt from a single-file AST
// pass. `fixable: 'code'` is dropped rather than shipping a fixer that risks
// producing wrong code (or, as before, one that contradicts the rule). This
// finding must be resolved by a human, same posture as `staticMethodVerbs.ts`
// for its own non-mechanical remedy.
//
// PAIRED RULE: `explicitReturnBinding.ts` (E1) mandates the exact binding shape
// that used to hide these shims from this rule. See that file's "COMPOSITION"
// section for why the two rules deliberately overlap in what they report
// without contradicting each other.

// (d) BLIND TO TYPE PREDICATES: A FORWARDED VALUE CAN STILL NARROW A DIFFERENT TYPE.
//
// This rule reasons about VALUE-level forwarding only -- "does the body just hand back what it
// called?" -- and that question is blind to a function's declared TYPE-level contract. A function
// whose return type is a `TSTypePredicate` (`value is Foo`) is not just forwarding a boolean; it
// is asserting a narrowing that belongs to ITS signature, not the callee's. Concretely:
//
//   // lib.es5.d.ts: isArray(arg: any): arg is any[]  -- narrows to `any[]`, leaks `any`.
//   public static isArray(value: unknown): value is readonly unknown[] {
//     const result = Array.isArray(value);
//     return result;
//   }
//
// `Array.isArray` narrows to `any[]`; this wrapper re-declares the same runtime check under the
// `readonly unknown[]` predicate the codebase's `no any` policy requires. Deleting it and calling
// `Array.isArray` directly at each of its call sites reintroduces `any` everywhere it is used.
// The predicate IS the function's contract, and it is not the callee's -- so a declared
// `TSTypePredicate` return type exempts the function from this rule, checked syntactically off
// the return-type annotation (no type-checker/parser services required). This slightly
// over-exempts a guard that forwards to another guard asserting the IDENTICAL predicate type;
// that false negative is accepted, since the alternative -- flagging every narrowing wrapper as a
// "trivial shim" -- deletes real type-safety boundaries.

namespace InlineTrivialLogicOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'allowLiterals': {
        'default': true,
        'description': 'Allow functions that return a constant literal or template literal (string, number, boolean). Default true — such a function is the value, not a forward to one. Set false for the stricter posture of also flagging literal returns.',
        'type': 'boolean'
      },
      'allowMemberExpressions': {
        'default': false,
        'description': 'Allow functions that return a non-this member expression (e.g. obj.prop).',
        'type': 'boolean'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

/**
 * Reduces a function body to the single expression it ultimately returns —
 * whether that expression is returned directly (`return <expr>;`) or is bound
 * once and returned unchanged (`const x = <expr>; return x;`). Any other body
 * shape (more statements, a mismatched name, a reassignment) does not reduce,
 * and `undefined` is returned so the caller leaves it alone. See defect (a)
 * above for why the two-statement, declare-once-and-return-unchanged shape
 * must reduce to exactly the same expression the one-statement shape already
 * matched.
 *
 * A leading `EmptyStatement` (a stray `;`) is stripped before dispatching on
 * length — it is a no-op, not a second statement, so `{ ; return bar(x); }`
 * still reduces exactly like `{ return bar(x); }`.
 */
/**
 * True when `node`'s declared return type is a `TSTypePredicate` (`x is Foo`). See defect (d)
 * above: such a function re-declares a TYPE-level narrowing contract even when its VALUE-level
 * body is a pure forward, so it is exempt from this rule regardless of body shape.
 */
// A CALLBACK PASSED AS AN ARGUMENT IS NOT A SHIM. DO NOT REMOVE THIS EXEMPTION.
//
// This rule's remedy is "inline the logic at the call site". That presupposes a NAMED
// binding with call sites to inline into. An inline function passed as an argument has
// neither — it IS the argument, and it is a DEFERRED computation whose whole purpose is
// that the callee decides whether and when to run it:
//
//   this.hooks.invoke('onContended', () => {
//     const result = this.onContended(key, queue.size);
//     return result;
//   });
//
// `hooks.invoke` runs the thunk only when that hook is enabled. "Inlining" it would
// evaluate `this.onContended(...)` eagerly at every call — a SEMANTIC change from lazy
// to eager, not a refactor. There is no compliant rewrite, which is the signature of a
// false positive rather than a finding.
//
// Before this exemption the rule reported 469 of these across the hook-invoking
// primitives (Mutex, Throttle, Retry, RealTimeScheduler, VirtualScheduler, EventBus,
// SampleBuffer), every one unfixable. Two independent cleanup agents stopped and
// escalated rather than force them, correctly.
//
// PAIRED RULE: `v8/inline-arrow-functions` already owns the performance concern for an
// inline function in a position rebuilt per call or iteration. That rule decides whether
// a callback should be hoisted; this rule stays on named forwarding bindings. Neither is
// weakened — they cover different questions, and duplicating the callback case here only
// produced diagnostics with no remedy.
class CallbackArgumentGuard {
  /**
   * True when `node` is an inline function that reaches a call argument — directly, or as
   * a property value inside an object/array literal that is itself an argument:
   *
   *   runIfEnabled('hook', () => { ... })                          direct
   *   DomainErrorArgs.build(fields, { 'message': (f) => `...` })    via a property value
   *
   * The second shape is just as undeliverable to a "call site": the `message` slot REQUIRES
   * a function value, so there is nothing to inline it into. Only LITERAL containers are
   * walked through — an arrow bound to a `const`, or stored on a class field, is not a
   * required callback and stays reportable, which keeps `v8/inline-functions` as the owner
   * of the dispatch-map question.
   */
  public static isCallArgument(node: Rule.Node): boolean {
    let current: Rule.Node = node;
    let walker = current.parent;

    while (walker !== null && ObjectGuard.isObject(walker)
      && (walker.type === 'Property' || walker.type === 'ObjectExpression' || walker.type === 'ArrayExpression')) {
      current = walker;
      walker = current.parent;
    }

    const parent = walker;

    if (parent === null || !ObjectGuard.isObject(parent)) {
      return false;
    }
    if (parent.type !== 'CallExpression' && parent.type !== 'NewExpression') {
      return false;
    }

    const argumentList: readonly unknown[] = Array.isArray(parent.arguments) ? parent.arguments : [];
    const argumentCount = argumentList.length;

    for (let index = 0; index < argumentCount; index += 1) {
      if (argumentList.at(index) === current) {
        return true;
      }
    }

    return false;
  }
}

class TypePredicateGuard {
  public static hasTypePredicateReturn(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) {
      return false;
    }

    const returnType: unknown = (node as { readonly 'returnType'?: unknown }).returnType;

    if (!ObjectGuard.isObject(returnType)) {
      return false;
    }

    const typeAnnotation: unknown = (returnType as { readonly 'typeAnnotation'?: unknown }).typeAnnotation;

    if (!ObjectGuard.isObject(typeAnnotation)) {
      return false;
    }

    const result = typeAnnotation.type === 'TSTypePredicate';

    return result;
  }
}

// (e) A MEMBER DECLARED BY A TYPE CONTRACT HAS NO CALL SITE TO INLINE INTO.
//
// This rule's message is "inline the logic at the call site" -- a fix that presupposes a
// NAMED binding whose call sites can be found and rewritten. That presupposition fails for
// a class member whose signature is DICTATED, not chosen, by a type the class declares
// conformance to:
//
//   export class SystemProvider implements SystemProviderInterface {
//     arch(): string {
//       const result = os.arch();
//       return result;
//     }
//   }
//
// (`packages/system/src/providers/SystemProvider.ts`.) Callers never call `SystemProvider`
// directly -- they hold a `SystemProviderInterface` and dispatch through it, and a SECOND
// implementation (`packages/system/src/providers/browser/SystemProvider.ts`) supplies a
// different body for the same member. There is no single call site to inline into: deleting
// the method removes the class's conformance to `implements SystemProviderInterface`, and
// "inlining" would require rewriting every caller everywhere the interface is used, which
// changes virtual dispatch into a compile-time choice of implementation -- not a refactor.
//
// The same absence of a call site applies to a `protected` template-method hook a base class
// declares for its subclasses to override:
//
//   /** Pass-through default -- override to pre-process the initial context. */
//   protected onRunStart(context: T): T {
//     const result = context;
//     return result;
//   }
//
// (`packages/pipeline/src/pipeline/Pipeline.ts`.) Deleting it removes a documented extension
// seam AND breaks the base class's own internal call sites that invoke it polymorphically --
// there is no "the call site", there are as many call sites as subclasses, present and future.
//
// Both shapes share the same root cause: the method exists because a TYPE says it must, not
// because the author chose to factor it out. `TypeContractGuard` recognizes exactly that --
// a class member whose declaring class has a heritage clause (`implements`/`extends`) whose
// resolved type already declares a member of the same name, or a member marked `protected` or
// `override` -- and exempts it. A COMPUTED method name (`[dynamicKey]() { ... }`) is
// deliberately NOT exempt: the static name is unknowable, so neither the heritage-resolution
// question nor the override-seam question can be answered, and the rule stays strict rather
// than guess.
class TypeContractGuard {
  /**
   * True when `node` is the function value of a class method (or a class-field function
   * value) whose declaration is mandated by a type contract rather than chosen freely --
   * see the block comment above. Uses the TypeScript checker to resolve heritage members
   * rather than matching identifiers by name (this package's standing convention; see
   * `CallIdentity.ts`), so a same-named unrelated method on an unrelated interface never
   * produces a false exemption.
   */
  public static isTypeContractMember(node: Rule.Node, context: Rule.RuleContext): boolean {
    const container = TypeContractGuard.#findMethodContainer(node);

    if (container === undefined) {
      return false;
    }

    const computed = (container as { readonly 'computed'?: unknown }).computed;

    if (computed !== false) {
      return false;
    }

    const methodName = TypeContractGuard.#getStaticKeyName((container as { readonly 'key'?: unknown }).key);

    if (methodName === undefined) {
      return false;
    }
    if (TypeContractGuard.#hasLocalContractModifier(container)) {
      return true;
    }

    const classNode = TypeContractGuard.#findContainingClass(container);

    if (classNode === undefined) {
      return false;
    }

    const result = TypeContractGuard.#heritageDeclaresMember(classNode, methodName, context);

    return result;
  }

  /** Walks up to the `MethodDefinition`/`PropertyDefinition` that owns `node` as its value. */
  static #findMethodContainer(node: Rule.Node): Rule.Node | undefined {
    const parent = node.parent;

    if (parent === null || !ObjectGuard.isObject(parent)) {
      return undefined;
    }
    if (parent.type !== 'MethodDefinition' && parent.type !== 'PropertyDefinition') {
      return undefined;
    }
    if (parent.value !== node) {
      return undefined;
    }

    return parent;
  }

  /** Reads a statically-known member name off a non-computed key; `undefined` otherwise. */
  static #getStaticKeyName(key: unknown): string | undefined {
    if (!ObjectGuard.isObject(key)) {
      return undefined;
    }
    if (key.type === 'Identifier' && typeof key.name === 'string') {
      return key.name;
    }
    if (key.type === 'Literal' && typeof key.value === 'string') {
      return key.value;
    }

    return undefined;
  }

  /** `protected` accessibility or an explicit `override` modifier -- a declared override seam. */
  static #hasLocalContractModifier(container: Rule.Node): boolean {
    const accessibility = (container as { readonly 'accessibility'?: unknown }).accessibility;

    if (accessibility === 'protected') {
      return true;
    }

    const overrideModifier = (container as { readonly 'override'?: unknown }).override;
    const result = overrideModifier === true;

    return result;
  }

  static #findContainingClass(container: Rule.Node): Rule.Node | undefined {
    const classBody = container.parent;

    if (classBody === null || !ObjectGuard.isObject(classBody)) {
      return undefined;
    }

    const classNode = (classBody as { readonly 'parent'?: unknown }).parent;

    if (!ObjectGuard.isObject(classNode)) {
      return undefined;
    }
    if (classNode.type !== 'ClassDeclaration' && classNode.type !== 'ClassExpression') {
      return undefined;
    }

    return classNode as unknown as Rule.Node;
  }

  /** Every heritage expression (`extends` target, each `implements` entry) on `classNode`. */
  static #collectHeritageExpressions(classNode: Rule.Node): readonly Rule.Node[] {
    const result: Rule.Node[] = [];
    const superClass = (classNode as { readonly 'superClass'?: unknown }).superClass;

    if (ObjectGuard.isObject(superClass)) {
      result.push(superClass as unknown as Rule.Node);
    }

    const implementsClauses = (classNode as { readonly 'implements'?: unknown }).implements;

    if (ObjectGuard.isArray(implementsClauses)) {
      const clauseCount = implementsClauses.length;

      for (let index = 0; index < clauseCount; index += 1) {
        const clause = implementsClauses.at(index);

        if (!ObjectGuard.isObject(clause)) {
          continue;
        }

        const expression = clause.expression;

        if (ObjectGuard.isObject(expression)) {
          result.push(expression as unknown as Rule.Node);
        }
      }
    }

    return result;
  }

  /**
   * True when any `extends`/`implements` heritage expression resolves (via the checker, not
   * name-matching -- see `CallIdentity.ts`) to a type that already declares `methodName`. This
   * single check covers both an interface member (case a) and an inherited/abstract base-class
   * member (also case a, and the source of case b's "abstract anywhere in the heritage chain":
   * `checker.getTypeAtLocation` flattens abstract members into the resolved type identically to
   * concrete ones, so an abstract ancestor member surfaces here with no separate walk needed).
   * Silent (`false`) when type services are unavailable, matching this package's standing
   * posture of going quiet rather than guessing without types.
   */
  static #heritageDeclaresMember(classNode: Rule.Node, methodName: string, context: Rule.RuleContext): boolean {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return false;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const heritageExpressions = TypeContractGuard.#collectHeritageExpressions(classNode);
    const heritageCount = heritageExpressions.length;

    for (let index = 0; index < heritageCount; index += 1) {
      const expression = heritageExpressions.at(index);

      if (expression === undefined) {
        continue;
      }

      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(expression);

      if (tsNode === undefined) {
        continue;
      }

      const type = checker.getTypeAtLocation(tsNode);
      const property = checker.getPropertyOfType(type, methodName);

      if (property !== undefined) {
        return true;
      }
    }

    return false;
  }
}

// (f) A BODY THAT IS A VALUE IS NOT A SHIM. ONLY DELEGATION IS.
//
// Three sites reduce to a literal, a bare identifier, or a template literal — not to a call:
//
//   packages/types/src/guards/Empty.ts             static string(): string { return ''; }
//   packages/retry/.../BackoffStrategy.ts          static constant(_a, baseDelayMs) { return baseDelayMs; }
//   packages/logger/src/modules/LogEventName.ts    static create(c, o) { return `${c}.${o}`; }
//
// This rule's message names an indirection to remove: "inline the logic at the call site."
// A SHIM is by definition an indirection layer — it forwards to something else and adds
// nothing. None of these forwards to anything else; each one IS the value it produces. There
// is no callee to inline, no hidden delegation these three could be replaced by calling
// directly instead. `Empty.string()` and `LogEventName.create()` are the general case:
// The schema's `allowLiterals` default is `true`, so
// a body that reduces to a `Literal`/`TemplateLiteral` is exempt by default — a changed
// default rather than a new branch, since the option already existed for exactly this
// question and only its DEFAULT value was wrong. `BackoffStrategy.constant` needs one more
// step: its reduced body is a bare parameter reference, not a literal, and `TrivialExpression`
// handles that case separately — see `IdentifierSelection`'s own module comment in
// `TrivialExpression.ts` for why a function selecting among several of its own parameters
// (discarding the rest) is exempt the same way, while a single-parameter identity function
// (`passThrough(x) { return x; }`) stays reported. A genuine 1:1 forward to another call —
// `wrap(a, b) { return Other.compute(a, b); }` — is unaffected by any of these exemptions: it
// reduces to a `CallExpression`, the one shape this rule still reports unconditionally.

class ForwardedReturnReduction {
  public static reduce(body: readonly unknown[]): unknown {
    const meaningful = ForwardedReturnReduction.#dropLeadingEmptyStatements(body);

    if (meaningful.length === 1) {
      const result = ForwardedReturnReduction.#fromBareReturn(meaningful.at(0));

      return result;
    }
    if (meaningful.length === 2) {
      // Accepts any declaration kind (`var`/`let`/`const`) — see `DeclareThenReturnShape`'s
      // own module comment for why this rule's value-forwarding question is kind-agnostic
      // while `v8/inline-arrow-functions`'s house-style question is not.
      const result = DeclareThenReturnShape.of(meaningful.at(0), meaningful.at(1))?.initializer;

      return result;
    }

    return undefined;
  }

  static #dropLeadingEmptyStatements(body: readonly unknown[]): readonly unknown[] {
    let start = 0;
    const bodyLength = body.length;

    while (start < bodyLength && AstHelpers.getNodeType(body.at(start)) === 'EmptyStatement') {
      start += 1;
    }

    const result = start === 0 ? body : body.slice(start);

    return result;
  }

  static #fromBareReturn(statement: unknown): unknown {
    if (AstHelpers.getNodeType(statement) !== 'ReturnStatement') {
      return undefined;
    }

    const result = ObjectGuard.isObject(statement) ? statement.argument : undefined;

    return result;
  }
}

export const inlineTrivialLogic: Rule.RuleModule = {
  'create': (context) => {
    const options = InlineTrivialLogicOptionsEntity.intake(context.options.at(0) ?? {});

    const reportIfTrivial = (node: Rule.Node, expression: unknown): void => {
      const type = AstHelpers.getNodeType(expression);

      if (type === undefined) {
        return;
      }
      if (type === 'ThisExpression') {
        return;
      }
      if (!TrivialExpression.isTrivial(expression, options, ParameterNames.of(node), context)) {
        return;
      }

      context.report({
        'messageId': 'trivial', 'node': node
      });
    };

    const reportBodyIfTrivial = (node: Rule.Node, body: readonly unknown[]): void => {
      const argument = ForwardedReturnReduction.reduce(body);

      if (argument === undefined) {
        return;
      }
      reportIfTrivial(node, argument);
    };

    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      if (CallbackArgumentGuard.isCallArgument(node)) {
        return;
      }
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
        return;
      }
      if (TypeContractGuard.isTypeContractMember(node, context)) {
        return;
      }
      if (node.body.type === 'BlockStatement') {
        reportBodyIfTrivial(node, node.body.body);

        return;
      }
      reportIfTrivial(node, node.body);
    };

    const onFunctionDeclaration: NonNullable<Rule.RuleListener['FunctionDeclaration']> = (node) => {
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
        return;
      }
      reportBodyIfTrivial(node, node.body.body);
    };

    const onFunctionExpression: NonNullable<Rule.RuleListener['FunctionExpression']> = (node) => {
      if (CallbackArgumentGuard.isCallArgument(node)) {
        return;
      }
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
        return;
      }
      if (TypeContractGuard.isTypeContractMember(node, context)) {
        return;
      }
      reportBodyIfTrivial(node, node.body.body);
    };

    return {
      'ArrowFunctionExpression': onArrowFunctionExpression,
      'FunctionDeclaration': onFunctionDeclaration,
      'FunctionExpression': onFunctionExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow trivial shim functions that only forward/delegate a value without adding logic.',
      'recommended': false
    },
    'messages': { 'trivial': 'Trivial shim functions are forbidden. Inline the logic at the call site.' },
    'schema': [InlineTrivialLogicOptionsEntity.Schema],
    'type': 'problem'
  }
};
