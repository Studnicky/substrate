
import { Predicates } from '#runtime';

import { AstHelpers } from './astHelpers.js';

// Names a function's own directly-bound parameters; feeds TrivialExpression's
// argument-forwarding check — see inline-trivial-logic.md.
export class ParameterNames {
  // Only a plain Identifier, or the Identifier LHS of a default-valued one, contributes
  // a name — a destructured/rest parameter never matches as a forwarded argument anyway.
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
