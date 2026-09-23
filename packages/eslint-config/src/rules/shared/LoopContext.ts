import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { CallIdentity } from './CallIdentity.js';
import {
  FUNCTION_TYPES, ITERATION_METHODS, ITERATION_OWNERS, LOOP_TYPES
} from './constants/LoopContextConstants.js';

// A callback passed to a per-element iteration method IS a loop body — matched via
// CallIdentity's resolved signature, not callee name, so any call spelling resolves.

class IterationCallback {
  // True when `functionNode` runs once per element as an argument to a built-in
  // per-element iteration call — a loop body in every sense a performance rule cares about.
  public static isPerElement(functionNode: Rule.Node, context: Rule.RuleContext): boolean {
    const parent = functionNode.parent;

    if (parent === null || !Predicates.isRecord(parent)) {
      return false;
    }
    if (parent.type !== 'CallExpression') {
      return false;
    }
    // Identity comparison, not `arguments.includes`: the argument list's declared
    // element type does not admit the broader `Rule.Node` the walk carries.
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
  // True when `node` runs once per iteration of an enclosing loop keyword or
  // per-element iteration call; a non-callback function boundary stops the walk.
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
