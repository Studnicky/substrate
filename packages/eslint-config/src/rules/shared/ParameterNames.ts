import { Predicates } from '@studnicky/types';

import { AstHelpers } from './astHelpers.js';

/**
 * Extracts the set of names a function-like node's own parameter list binds directly. Consumed
 * by `TrivialExpression`'s `CallArgumentForwarding` (see that module's comment) to decide
 * whether a call's arguments are a genuine 1:1 relay of the enclosing function's own inputs,
 * rather than a closed-over outer binding or the result of further computation.
 */
export class ParameterNames {
  /**
   * A plain `Identifier` parameter, or the `Identifier` left-hand side of a default-valued one
   * (`x = 1`), contributes its name. A destructured (`{ a }`, `[a]`) or rest (`...rest`)
   * parameter contributes none: an argument built from one of those bindings is never a bare
   * `Identifier` reference to the parameter itself anyway, so it would not match as a
   * forwarded argument regardless of whether its name were tracked here.
   */
  public static of(node: unknown): ReadonlySet<string> {
    const result = new Set<string>();
    const parameterNodes: unknown = Predicates.isRecord(node) ? node.params : undefined;

    if (!Predicates.isArray(parameterNodes)) {
      return result;
    }

    const parameterCount = parameterNodes.length;

    for (let index = 0; index < parameterCount; index += 1) {
      const parameterNode = parameterNodes.at(index);
      const name = ParameterNames.#boundName(parameterNode);

      if (name !== undefined) {
        result.add(name);
      }
    }

    return result;
  }

  static #boundName(parameterNode: unknown): string | undefined {
    if (!Predicates.isRecord(parameterNode)) {
      return undefined;
    }
    if (parameterNode.type === 'Identifier') {
      const result = AstHelpers.getIdentifierName(parameterNode);

      return result;
    }
    if (parameterNode.type === 'AssignmentPattern') {
      const result = ParameterNames.#boundName(parameterNode.left);

      return result;
    }

    return undefined;
  }
}
