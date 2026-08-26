import type { Rule } from 'eslint';

import { CallIdentity } from './CallIdentity.js';
import {
  FUNCTION_TYPES, ITERATION_METHODS, ITERATION_OWNERS, LOOP_TYPES
} from './constants/LoopContextConstants.js';
import { ObjectGuard } from './ObjectGuard.js';

// WHY "INSIDE A LOOP" IS A RESOLVED QUESTION, NOT A SYNTACTIC ONE.
//
// The predecessor (`FunctionScope.isInsideLoop`) walked up `node.parent` and returned
// `true` on a loop keyword, `false` on ANY function boundary. An arrow function passed
// to `.forEach()` is a function boundary, so the walk stopped there — and because the
// iteration-method call is not itself a loop-shaped AST node, per-element code written
// with an array method was invisible to every rule using the helper. Reproduced:
//
//   for (let i = 0; i < n; i += 1) { result = result.concat(chunks[i]); }
//     -> reported
//   chunks.forEach((chunk) => { result = result.concat(chunk); });
//     -> NOT reported                       (semantically identical, 7.3x measured)
//
// That silently un-enforced five rules at once: regexp-in-loops, try-catch-in-loops,
// array-concat-outside-loops, array-scan-outside-loops, array-spread-outside-loops.
// The gap was worse than incidental, because `for-of-arrays` actively pushes authors
// away from `for...of` and toward the callback forms that defeat the detection.
//
// A callback passed to a per-element iteration method IS a loop body. This module
// treats it as one — and identifies the iteration method through `CallIdentity`
// (resolved signature) rather than by callee name, so `values[FOR_EACH](cb)` and any
// other spelling resolve the same way. Matching `.forEach` by name here would rebuild
// the exact evasion this module exists to close, one layer up.
//
// A function boundary that is NOT such a callback still stops the walk, which is
// correct: a helper defined inside a loop but invoked elsewhere does not run
// per-iteration, and guessing otherwise would report code that has no hazard.

class IterationCallback {
  /**
   * True when `functionNode` is an argument to a built-in per-element iteration call,
   * i.e. the function body runs once per element and is a loop body in every sense
   * that matters to a performance rule.
   */
  public static isPerElement(functionNode: Rule.Node, context: Rule.RuleContext): boolean {
    const parent = functionNode.parent;

    if (parent === null || !ObjectGuard.isObject(parent)) {
      return false;
    }
    if (parent.type !== 'CallExpression') {
      return false;
    }
    // Identity comparison rather than `arguments.includes(functionNode)`: the
    // argument list is typed as `Expression | SpreadElement`, which does not admit the
    // broader `Rule.Node` the walk carries. Comparing references sidesteps the
    // narrowing without asserting a type.
    const argumentList: readonly unknown[] = parent.arguments;
    const argumentListLength = argumentList.length;
    let isArgument = false;

    for (let index = 0; index < argumentListLength; index += 1) {
      if (argumentList.at(index) === functionNode) {
        isArgument = true;
        break;
      }
    }

    if (!isArgument) {
      return false;
    }

    const result = CallIdentity.isBuiltinCall(parent, context, ITERATION_METHODS, ITERATION_OWNERS);

    return result;
  }
}

export class LoopContext {
  /**
   * True when `node` executes once per iteration of an enclosing loop — whether that
   * loop is written with a loop keyword or as a built-in per-element iteration call.
   *
   * Stops at a function boundary that is not an iteration callback, since such a
   * function's body does not run per-iteration of any enclosing loop.
   */
  public static isPerIteration(node: Rule.Node, context: Rule.RuleContext): boolean {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) {
        return true;
      }

      if (FUNCTION_TYPES.has(current.type)) {
        const result = IterationCallback.isPerElement(current, context);

        return result;
      }

      current = current.parent;
    }

    return false;
  }
}
