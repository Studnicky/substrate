import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { LoopContext } from '../shared/LoopContext.js';
import {
  FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME
} from './constants/RegexpInLoopsConstants.js';

// Gated on loop-invariance, not just loop-membership. Benchmark and proof method:
// docs/eslint/rules/v8/regexp-in-loops.md.

class BoundaryWalk {
  /** Nearest loop-keyword or function-boundary ancestor; per-iteration proof already done by the caller. */
  public static findEnclosing(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type) || FUNCTION_TYPES.has(current.type)) {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }
}

class ExpressionWalk {
  /** Every `Identifier` denoting a variable read; excludes non-computed member/property names. */
  public static collectVariableReferences(node: unknown, out: Rule.Node[] = []): Rule.Node[] {
    if (!Predicates.isRecord(node) || typeof node.type !== 'string') {
      return out;
    }

    if (node.type === 'Identifier') {
      out.push(node as unknown as Rule.Node);

      return out;
    }

    if (node.type === 'MemberExpression') {
      ExpressionWalk.collectVariableReferences(node.object, out);
      if (node.computed === true) {
        ExpressionWalk.collectVariableReferences(node.property, out);
      }

      return out;
    }

    if (node.type === 'Property') {
      if (node.computed === true) {
        ExpressionWalk.collectVariableReferences(node.key, out);
      }
      ExpressionWalk.collectVariableReferences(node.value, out);

      return out;
    }

    const entries = Object.entries(node);
    const entriesLength = entries.length;

    for (let entryIndex = 0; entryIndex < entriesLength; entryIndex += 1) {
      const entry = entries.at(entryIndex);

      if (entry === undefined) {
        continue;
      }
      const [
        key,
        value
      ] = entry;

      if (key === 'parent' || key === 'loc' || key === 'range') {
        continue;
      }

      if (Predicates.isArray(value)) {
        const valueLength = value.length;

        for (let itemIndex = 0; itemIndex < valueLength; itemIndex += 1) {
          ExpressionWalk.collectVariableReferences(value.at(itemIndex), out);
        }
      } else if (Predicates.isRecord(value)) {
        ExpressionWalk.collectVariableReferences(value, out);
      }
    }

    return out;
  }
}

class PatternInvariance {
  /** True when `argNode`'s subtree references at least one variable declared inside `boundaryNode` — proving the pattern is loop-variant and cannot be hoisted outside it. */
  public static referencesLoopScopedBinding(argNode: unknown, boundaryNode: Rule.Node, context: Rule.RuleContext): boolean {
    const identifiers = ExpressionWalk.collectVariableReferences(argNode);
    const identifiersLength = identifiers.length;

    for (let index = 0; index < identifiersLength; index += 1) {
      const identifier = identifiers.at(index);

      if (identifier !== undefined && PatternInvariance.#isDeclaredWithin(identifier, boundaryNode, context)) {
        return true;
      }
    }

    return false;
  }

  static #isDeclaredWithin(identifierNode: Rule.Node, boundaryNode: Rule.Node, context: Rule.RuleContext): boolean {
    const name = (identifierNode as unknown as { readonly 'name': string }).name;
    let scope = context.sourceCode.getScope(identifierNode) as { readonly 'upper': typeof scope | null; readonly 'variables': readonly { readonly 'defs': readonly { readonly 'node': unknown }[]; readonly 'name': string }[] } | null;

    while (scope !== null) {
      const { variables } = scope;
      const variablesLength = variables.length;

      for (let index = 0; index < variablesLength; index += 1) {
        const candidate = variables.at(index);

        if (candidate?.name !== name) {
          continue;
        }

        const declarationNode = candidate.defs.at(0)?.node;

        if (!Predicates.isRecord(declarationNode)) {
          return false;
        }

        const declRange = declarationNode.range as readonly [number, number] | undefined;
        const boundaryRange = (boundaryNode as unknown as { readonly 'range': readonly [number, number] }).range;

        if (declRange === undefined) {
          return false;
        }

        const result = declRange[0] >= boundaryRange[0] && declRange[1] <= boundaryRange[1];

        return result;
      }
      scope = scope.upper;
    }

    return false;
  }
}

class RegExpConstruction {
  public static hasRegExpCallee(node: Rule.Node): boolean {
    if (node.type !== 'NewExpression' && node.type !== 'CallExpression') {
      return false;
    }

    const raw: unknown = node;

    if (!Predicates.isRecord(raw)) {
      return false;
    }

    const callee = raw.callee;

    if (!Predicates.isRecord(callee)) {
      return false;
    }

    const result = callee.type === 'Identifier' && callee.name === 'RegExp';

    return result;
  }

  // A regex literal (`/foo/g`) allocates a fresh RegExp object on every evaluation,
  // identically to the `new RegExp(...)`/`RegExp(...)` constructor forms above.
  public static isRegExpLiteral(node: Rule.Node): boolean {
    if (node.type !== 'Literal') {
      return false;
    }

    const raw: unknown = node;

    if (!Predicates.isRecord(raw)) {
      return false;
    }

    const result = 'regex' in raw && Predicates.isRecord(raw.regex);

    return result;
  }
}

export const regexpInLoops: Rule.RuleModule = {
  'create': (context) => {
    const reportIfHoistable = (node: Rule.Node): void => {
      if (!LoopContext.isPerIteration(node, context)) {
        return;
      }

      const boundary = BoundaryWalk.findEnclosing(node);

      if (boundary !== undefined) {
        const rawArgumentList = (node as unknown as { readonly 'arguments'?: readonly unknown[] }).arguments;
        const argumentList = rawArgumentList ?? [];
        const argumentListLength = argumentList.length;
        let isLoopVariant = false;

        for (let index = 0; index < argumentListLength; index += 1) {
          if (PatternInvariance.referencesLoopScopedBinding(argumentList.at(index), boundary, context)) {
            isLoopVariant = true;
            break;
          }
        }

        if (isLoopVariant) {
          return;
        }
      }

      context.report({
        'messageId': 'regexpInLoop', 'node': node
      });
    };

    const onExpression = (node: Rule.Node): void => {
      if (!RegExpConstruction.hasRegExpCallee(node)) {
        return;
      }

      reportIfHoistable(node);
    };

    const onLiteral = (node: Rule.Node): void => {
      if (!RegExpConstruction.isRegExpLiteral(node)) {
        return;
      }

      // No argument expression to test for loop-variance, so this reports directly.
      if (!LoopContext.isPerIteration(node, context)) {
        return;
      }

      context.report({
        'messageId': 'regexpInLoop', 'node': node
      });
    };

    return {
      'CallExpression': onExpression,
      'Literal[regex]': onLiteral,
      'NewExpression': onExpression
    };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'regexpInLoop': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
