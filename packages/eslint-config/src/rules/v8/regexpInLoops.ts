import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { LoopContext } from '../shared/LoopContext.js';
import {
  FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME
} from './constants/RegexpInLoopsConstants.js';

// A13 — GATED ON LOOP-INVARIANCE, NOT JUST LOOP-MEMBERSHIP.
//
// Measured (Node v24, 5,000,000-iteration loop calling `.test()` on the same string; 3
// warm-up calls, median of 7; command: `node scratchpad/bench.mjs`, see the `A13`
// section):
//
//   hoisted regex, .test() x N               62.39ms
//   new RegExp() per iteration, .test() x N  202.95ms   -> 3.25x
//
// The cost is real when the pattern CAN be hoisted. But the previous implementation
// flagged every `RegExp`/`new RegExp` construction inside a loop unconditionally,
// including loop-VARIANT patterns where hoisting is not merely inconvenient but
// IMPOSSIBLE:
//
//   for (let i = 0; i < patterns.length; i += 1) {
//     const re = new RegExp(patterns[i]);   // flagged - but `patterns[i]` changes every
//     ...                                    // iteration; there is nowhere outside the
//   }                                        // loop this value still exists to hoist to.
//
// The fix below proves, via scope analysis (`sourceCode.getScope`, walking `.variables`
// per scope — NOT name matching against a hardcoded pattern), whether the pattern/flags
// argument references any binding declared inside the nearest per-iteration boundary
// (the loop's own iteration variable, a loop-body-local `const`, or an iteration-callback
// parameter). If so, the construction is loop-variant and the rule reports nothing — its
// own prescribed remedy ("hoist to the outer scope") would be advice for something that
// cannot be done. A regex LITERAL (`/foo/g`) has no argument expression at all — it is
// always loop-invariant by construction — so this gate applies only to the two
// constructor forms.
//
// When a referenced identifier's declaration cannot be resolved at all (a global, an
// import, an unresolvable scope), the rule does NOT treat that as proof of loop-variance
// — the base claim (regex construction in a loop is costly when hoistable) still holds
// for the common case, and only a POSITIVELY PROVEN loop-scoped reference suppresses the
// report. This mirrors this file set's standing posture of "prove it before enforcing,
// prove it before EXEMPTING too."
//
// PER-ITERATION IS RESOLVED VIA `LoopContext`, NOT `FunctionScope.isInsideLoop` — a
// regex constructed inside a `.forEach()`/`.map()` callback allocates once per element,
// identically to one inside a loop keyword; `LoopContext.isPerIteration` sees that.

class BoundaryWalk {
  /**
   * The nearest ancestor that is either a loop keyword or a function boundary.
   * `LoopContext.isPerIteration` has already proven, by the time this runs, that
   * whichever one is found first IS a genuine per-iteration boundary (a real loop,
   * or a proven per-element iteration callback) — this walk does not re-verify that,
   * it only locates the node so its range can be used for the reference check below.
   */
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
  /**
   * Collects every `Identifier` node within `node`'s subtree that denotes a variable
   * READ — excluding non-computed member/property names, which are not variable
   * references (`obj.length` never reads a binding named `length`; `obj[key]` does,
   * via `key`, and computed member expressions are walked accordingly).
   */
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

      // A literal has no argument expression to test for loop-variance — it is always
      // hoistable by construction, so this listener reports directly rather than going
      // through `reportIfHoistable`'s argument walk.
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
