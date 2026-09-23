import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from './astHelpers.js';

interface DeclareThenReturnShapeInterface {
  readonly 'declarationKind': string;
  readonly 'initializer': unknown;
}

// Extracts a two-statement `<kind> <name> = <expr>; return <name>;` shape, reporting
// `declarationKind` verbatim so each caller applies its own binding-keyword policy.
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
