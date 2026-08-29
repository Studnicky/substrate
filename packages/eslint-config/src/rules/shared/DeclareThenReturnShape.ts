import { Predicates } from '@studnicky/types';

import { AstHelpers } from './astHelpers.js';

interface DeclareThenReturnShapeInterface {
  readonly 'declarationKind': string;
  readonly 'initializer': unknown;
}

/**
 * Extracts the shape of a two-statement `<kind> <name> = <expr>; return <name>;` pair — a
 * single-declarator `VariableDeclaration` immediately followed by a `ReturnStatement` that
 * returns exactly the name just declared, unchanged. Returns `undefined` for any other shape
 * (a different name, more than one declarator, a non-`VariableDeclaration` first statement, a
 * non-`ReturnStatement` second one).
 *
 * This is a pure AST-shape extractor with no opinion about which binding keyword qualifies —
 * `declarationKind` reports the literal `var`/`let`/`const` so each caller applies its OWN
 * policy. `inline-trivial-logic`'s `ForwardedReturnReduction` accepts any kind: it is asking a
 * VALUE-forwarding question ("does this body just hand back what it called?"), which does not
 * depend on how the intermediate value was spelled. `v8/inline-arrow-functions`'s
 * `ArrowBodyStatementCount` accepts `const` only: it is asking whether the pair is
 * specifically `explicit-return-binding`'s mandated house style, which that rule's own module
 * comment demonstrates exclusively as `const`. Sharing this extractor keeps both callers using
 * the identical AST match instead of two near-duplicate declare-then-return walkers, while
 * leaving each rule's own acceptance policy where it belongs — with the rule, not the shape.
 */
export class DeclareThenReturnShape {
  public static of(first: unknown, second: unknown): DeclareThenReturnShapeInterface | undefined {
    if (AstHelpers.getNodeType(first) !== 'VariableDeclaration') {
      return undefined;
    }
    if (AstHelpers.getNodeType(second) !== 'ReturnStatement') {
      return undefined;
    }
    if (!Predicates.isRecord(first) || !Predicates.isRecord(second)) {
      return undefined;
    }

    const declarations = first.declarations;

    if (!Predicates.isArray(declarations) || declarations.length !== 1) {
      return undefined;
    }

    const declarator = declarations.at(0);

    if (!Predicates.isRecord(declarator)) {
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

    const kind = first.kind;

    if (typeof kind !== 'string') {
      return undefined;
    }

    return {
      'declarationKind': kind,
      'initializer': declarator.init
    };
  }
}
