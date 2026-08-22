import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { DEFAULT_OPTIONS } from './constants/InlineTrivialLogicConstants.js';
import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';
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
        'default': false,
        'description': 'Allow functions that return a constant literal (string, number, boolean).',
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

class ForwardedReturnReduction {
  public static reduce(body: readonly unknown[]): unknown {
    const meaningful = ForwardedReturnReduction.#dropLeadingEmptyStatements(body);

    if (meaningful.length === 1) {
      const result = ForwardedReturnReduction.#fromBareReturn(meaningful.at(0));

      return result;
    }
    if (meaningful.length === 2) {
      const result = ForwardedReturnReduction.#fromDeclareThenReturn(meaningful.at(0), meaningful.at(1));

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

  static #fromDeclareThenReturn(first: unknown, second: unknown): unknown {
    if (AstHelpers.getNodeType(first) !== 'VariableDeclaration') {
      return undefined;
    }
    if (AstHelpers.getNodeType(second) !== 'ReturnStatement') {
      return undefined;
    }
    if (!ObjectGuard.isObject(first) || !ObjectGuard.isObject(second)) {
      return undefined;
    }

    const declarations = first.declarations;

    if (!ObjectGuard.isArray(declarations) || declarations.length !== 1) {
      return undefined;
    }

    const declarator = declarations.at(0);

    if (!ObjectGuard.isObject(declarator)) {
      return undefined;
    }

    const declaredName = AstHelpers.getIdentifierName(declarator.id);
    const returnedName = AstHelpers.getIdentifierName(second.argument);

    if (declaredName === undefined || returnedName === undefined) {
      return undefined;
    }
    if (declaredName !== returnedName) {
      return undefined;
    }

    return declarator.init;
  }
}

export const inlineTrivialLogic: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    const options: Required<InlineTrivialLogicOptionsEntity.Type> = {
      'allowLiterals': ObjectGuard.isObject(rawOptions) && typeof rawOptions.allowLiterals === 'boolean'
        ? rawOptions.allowLiterals
        : DEFAULT_OPTIONS.allowLiterals,
      'allowMemberExpressions': ObjectGuard.isObject(rawOptions) && typeof rawOptions.allowMemberExpressions === 'boolean'
        ? rawOptions.allowMemberExpressions
        : DEFAULT_OPTIONS.allowMemberExpressions
    };

    const reportIfTrivial = (node: Rule.Node, expression: unknown): void => {
      const type = AstHelpers.getNodeType(expression);

      if (type === undefined) {
        return;
      }
      if (type === 'ThisExpression') {
        return;
      }
      if (!TrivialExpression.isTrivial(expression, options)) {
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
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
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
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
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
