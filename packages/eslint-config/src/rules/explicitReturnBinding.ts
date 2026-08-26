import type { Rule } from 'eslint';

import {
  REQUIRES_BINDING_TYPES, TS_WRAPPER_EXPRESSION_TYPES
} from './constants/ExplicitReturnBindingConstants.js';
import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';

// WHAT THIS RULE ENFORCES, AND WHY IT DID NOT EXIST BEFORE.
//
// The deliberate house style is: a return that does WORK names its result before
// handing it back.
//
//   public toUserMessage(): string {
//     const result = this.formatUserMessage();
//     return result;
//   }
//                                              — packages/errors/src/errors/BaseError.ts:252-255
//
// No existing rule enforces this. Before writing this rule, all 97 `@stylistic` rules
// and all 146 rules configured in `eslint.config.mjs` were checked for a match — zero.
// The closest existing rule, `sonarjs/prefer-immediate-return`, enforces the OPPOSITE:
// it flags `const result = f(); return result;` and suggests inlining to `return f();`.
// That rule is not enabled in this config; this one supersedes it for the scope below.
//
// SURVEY: WHAT THE 109 FILES THAT ALREADY FOLLOW THIS STYLE ACTUALLY DO.
//
//   grep -rl 'const result = ' packages/*/src --include='*.ts' | wc -l    -> 107 files
//   grep -rn 'const result = ' packages/*/src --include='*.ts' | wc -l    -> 586 sites
//
// Sampling those 586 sites by the kind of expression bound shows a single, consistent
// shape: the bound expression is almost always a CALL — a method invocation
// (`this.onX(...)`, `DispatcherValidator.nonNegativeNumber(...)`), a static factory
// call, or similar. `BaseError.ts` itself demonstrates the boundary directly — three
// adjacent methods, three different return shapes:
//
//   toJSON()            return { ...base, ...extra };            <- unbound (ObjectExpression)
//   toSerializedError()  const result = BaseError.serializeCause(this, 0); return result;  <- bound (CallExpression)
//   toUserMessage()      const result = this.formatUserMessage(); return result;            <- bound (CallExpression)
//
// Three categories were checked SPECIFICALLY because they looked like plausible
// candidates for "also requires binding" and were each disproven by direct counts:
//
//   grep -rnE '^\s*return await ' packages/*/src --include='*.ts' | wc -l          -> 26
//   grep -rn 'const result = await ' packages/*/src --include='*.ts' | wc -l       -> 0
//   -> `return await x;` is NEVER bound, 26/26. Exempt AwaitExpression entirely —
//      the `await` keyword already marks the suspension point; naming it adds nothing
//      `await` doesn't already say, and zero examples do it. (`YieldExpression` gets
//      the same treatment on the same reasoning — a suspension point, not a computation.)
//
//   grep -rnE '^\s*return new [A-Za-z]' packages/*/src --include='*.ts' | wc -l    -> 37 unbound
//   grep -rn 'const result = new ' packages/*/src --include='*.ts' | wc -l         -> 8 bound
//   -> `NewExpression` is mixed but dominated by unbound (`return new ModuleError(...)`,
//      `return new Agent(options)`, `return new DOMException(...)`), and it is
//      "constructing a value", not "delegating a computation" — exactly how
//      `TrivialExpression.isTrivial` in `inline-trivial-logic` already treats it
//      ("factories and constructors are never a shim"). Exempt, for the same reason.
//
//   grep -rnE '^\s*return \{ \.\.\..*\};\s*$' packages/*/src --include='*.ts' | wc -l -> 5, all unbound
//   -> Object/array construction reads the same way — `return { ...base, ...extra };`
//      in `BaseError.toJSON` sits one method above two bound calls in the same file.
//      Exempt `ObjectExpression`/`ArrayExpression` and, by the same construction-not-
//      delegation logic, function/class expressions returned as closures.
//
//   grep -rnE '^\s*return [a-zA-Z_][a-zA-Z0-9_.]*\.[a-zA-Z_][a-zA-Z0-9_]*;\s*$' \
//     packages/*/src --include='*.ts' | grep -v 'return this\.' | wc -l -> 30, all unbound
//   -> Plain field reads (`return result.value;`, `return this.count;`,
//      `return ExportShape.Other;`) are never bound, at any chain depth. Exempt every
//      `MemberExpression` — it is a read, not an operation.
//
// WHAT THIS RULE THEREFORE FLAGS: a `return` whose argument is a CALL (a plain call, an
// optional-chained call, or a tagged template) or an OPERATOR expression (binary,
// logical, ternary, unary, assignment, update, comma) — the set in
// `REQUIRES_BINDING_TYPES`. Everything else — no argument, `this`, a bare identifier
// (already a binding; re-binding it is pointless churn), a literal, a member read at any
// depth, a `new`/object/array/closure construction, and `await`/`yield` — is exempt, on
// the evidence above. A `TSAsExpression`/`TSNonNullExpression`/`TSSatisfiesExpression`/
// `TSTypeAssertion` wrapper is stripped and the expression underneath is reclassified;
// the cast changes nothing about whether the return does work.
//
// COMPOSITION WITH `inline-trivial-logic` (E2) — THEY DO NOT FIGHT.
//
// `inline-trivial-logic` now detects semantically: a function body that reduces to a
// single forwarded call — `const x = f(); return x;` — is flagged as a trivial shim
// WHETHER OR NOT the return is bound (that was the bug being fixed there: binding used
// to suppress detection). This rule and that one can therefore both report on the same
// function, and that is correct, not a conflict: this rule governs the STRUCTURE of a
// return that does work ("name it before you hand it back"); `inline-trivial-logic`
// governs whether the function should exist as a wrapper AT ALL. `toUserMessage()` above
// satisfies this rule (the call is bound) and may separately be a candidate for
// `inline-trivial-logic` if it turns out to add no value beyond forwarding — that is a
// judgment `inline-trivial-logic` makes, not this rule. "Must not fight" means this rule
// never structurally SUPPRESSES the other's detection, which was the old failure mode;
// it is not a requirement that the two rules agree on every function.
//
// NO FIXER — DELIBERATELY, AND PERMANENTLY, NOT AN OVERSIGHT.
//
// Standing policy: an autofixer may exist only for a transformation that is GUARANTEED
// safe. Any residual risk means no fixer at all — "safer" is not the bar, "cannot break
// the build" is.
//
// A first version of this rule shipped a fixer rewriting `return <expr>;` to
// `const result = <expr>; return result;`. `npx eslint --fix` across
// `packages/eslint-config/src` applied 325 such fixes and broke `tsc`:
//
//   private classifyInterface(...): InterfaceClassificationResultInterface {
//     return evidence === undefined
//       ? { 'classification': 'pureData', ... }
//       : { 'classification': 'contract', ... };
//   }
//
// became `const result = <the conditional>; return result;`. In return position, each
// object literal is CONTEXTUALLY TYPED by the function's declared return type, so
// `'pureData'`/`'contract'` stay the literal-type members
// `InterfaceClassificationResultInterface['classification']` expects. Bound to an
// un-annotated `const`, that contextual typing is gone and the property widens to
// `string` — `TypeContractClassification.ts(1983,5): TS2322`.
//
// The obvious repair — copy the enclosing function's declared return-type annotation
// onto the new `const` (`const result: <declared type> = <expr>; return result;`), so
// the initializer is contextually typed exactly the way the `return` was — was built,
// and it does close the specific bug above (an annotated, non-generic, non-async,
// non-generator, non-predicate return type copies across verbatim without incident).
// It was DELETED rather than shipped, because "closes the reported bug" and
// "guaranteed safe" are different bars, and this transformation cannot clear the
// second one:
//
//   - a return type mentioning the function's own generic type parameters carries
//     across textually fine, but a conditional or mapped return type, an overload
//     signature picking a different return type per call site, or a type nameable
//     only in the declaration's scope (a type parameter from an enclosing generic
//     class, for instance) can each fail silently in ways no AST shape-check catches
//     for every case;
//   - binding a contextually-typed expression to a variable changes how TypeScript
//     infers it — that is inherent to the transformation itself, not an
//     implementation gap this rule's author failed to close.
//
// The evidence for the ORIGINAL failure mode was a single reproduction, not an
// exhaustive one; "no more counterexamples found" is not "none exist" for a rule that
// runs `eslint --fix` unattended across a whole repository. `inline-trivial-logic`
// dropped its fixer for the identical reason (see that file's defect (c)) — this
// rule now matches. Detection is unaffected and stays `error`; every violation is
// reported and left for a human to fix by hand. 754 manual edits is the correct cost;
// a fixer that silently corrupts types at some unknown fraction of them is not a
// labour saving, it is a defect generator whose failures surface far from the edit.

class ReturnArgumentClassification {
  public static unwrap(node: unknown): unknown {
    let current = node;

    while (
      ObjectGuard.isObject(current)
      && typeof current.type === 'string'
      && TS_WRAPPER_EXPRESSION_TYPES.has(current.type)
    ) {
      current = current.expression;
    }

    return current;
  }

  public static requiresBinding(argument: unknown): boolean {
    const unwrapped = ReturnArgumentClassification.unwrap(argument);
    const type = AstHelpers.getNodeType(unwrapped);

    if (type === undefined) {
      return false;
    }

    const result = REQUIRES_BINDING_TYPES.has(type);

    return result;
  }
}

export const explicitReturnBinding: Rule.RuleModule = {
  'create': (context) => {
    const onReturnStatement: NonNullable<Rule.RuleListener['ReturnStatement']> = (node) => {
      const { argument } = node;

      if (argument === null || argument === undefined) {
        return;
      }
      if (!ReturnArgumentClassification.requiresBinding(argument)) {
        return;
      }

      context.report({
        'messageId': 'unbound',
        'node': node
      });
    };

    return { 'ReturnStatement': onReturnStatement };
  },
  'meta': {
    'docs': {
      'description': 'Require a `return` that does work (a call or an operator expression) to bind its result to a `const` first, on its own line, rather than returning the computation inline.',
      'recommended': false
    },
    'messages': { 'unbound': 'Bind the result of this expression to a `const` before returning it — e.g. `const result = <expr>; return result;` — instead of returning it inline.' },
    'schema': [],
    'type': 'problem'
  }
};
