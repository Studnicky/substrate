import { Predicates } from '@studnicky/types';

import type { ProjectedNodeInterface } from '../interfaces/ProjectedNodeInterface.js';
import type { ProjectedValueInterface } from '../interfaces/ProjectedValueInterface.js';

import { CAUSE_CHAIN_DEPTH_LIMIT } from '../constants/CauseChainConstants.js';
import {
  PROBLEM_TITLE_AGGREGATE_ERROR,
  PROBLEM_TITLE_ERROR,
  PROBLEM_TITLE_THROWN_NULLISH,
  PROBLEM_TITLE_THROWN_OBJECT,
  PROBLEM_TITLE_THROWN_PRIMITIVE,
  PROBLEM_TITLE_THROWN_STRING,
  PROBLEM_TYPE_AGGREGATE_ERROR,
  PROBLEM_TYPE_ERROR,
  PROBLEM_TYPE_THROWN_NULLISH,
  PROBLEM_TYPE_THROWN_OBJECT,
  PROBLEM_TYPE_THROWN_PRIMITIVE,
  PROBLEM_TYPE_THROWN_STRING
} from '../constants/ProblemConstants.js';

/**
 * Projection of an arbitrary caught value into RFC 9457 members.
 *
 * This is a LEAF: it imports constants and predicates, and nothing else. `BaseError` needs
 * this projection to serialize a cause chain, and `BaseError` is the root every error class
 * extends — so anything it reaches at runtime must bottom out here. Putting the projection in
 * an entity instead would make the error classes depend on the entity layer while the entity
 * layer's intake boundaries throw error classes, and the import graph would stop being a DAG.
 *
 * `ThrownValueEntity` is the entity wrapper over this function, for consumers that want the
 * schema and the intake/create boundary.
 *
 * @module
 */

class Classifier {
  public static ofNullish(): ProjectedNodeInterface {
    return { 'detail': '', 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH };
  }

  public static ofString(value: string): ProjectedNodeInterface {
    return { 'detail': value, 'title': PROBLEM_TITLE_THROWN_STRING, 'type': PROBLEM_TYPE_THROWN_STRING };
  }

  public static ofError(error: Error): ProjectedNodeInterface {
    const node: ProjectedNodeInterface = {
      'detail': error.message,
      'name': error.name,
      'title': PROBLEM_TITLE_ERROR,
      'type': PROBLEM_TYPE_ERROR
    };
    const result = Predicates.isString(error.stack) ? { ...node, 'stack': error.stack } : node;
    return result;
  }

  public static ofAggregate(error: AggregateError): ProjectedNodeInterface {
    const asError = Classifier.ofError(error);
    const result: ProjectedNodeInterface = {
      ...asError,
      'title': PROBLEM_TITLE_AGGREGATE_ERROR,
      'type': PROBLEM_TYPE_AGGREGATE_ERROR
    };
    return result;
  }

  /** Reads `message`/`name` defensively — a thrown object may carry a throwing getter for either. */
  public static ofObject(value: object): ProjectedNodeInterface {
    let detail = '';
    try {
      const candidate: unknown = Reflect.get(value, 'message');
      if (Predicates.isString(candidate)) { detail = candidate; }
    } catch {
      detail = '';
    }
    let name: string | undefined;
    try {
      const candidate: unknown = Reflect.get(value, 'name');
      if (Predicates.isString(candidate)) { name = candidate; }
    } catch {
      name = undefined;
    }
    const node: ProjectedNodeInterface = {
      'detail': detail,
      'title': PROBLEM_TITLE_THROWN_OBJECT,
      'type': PROBLEM_TYPE_THROWN_OBJECT
    };
    const result: ProjectedNodeInterface = name === undefined ? node : { ...node, 'name': name };
    return result;
  }

  /** `String()` never throws for these types, unlike template-literal coercion. */
  public static ofPrimitive(value: bigint | boolean | number | symbol): ProjectedNodeInterface {
    return { 'detail': String(value), 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE };
  }
}


/**
 * Total projection: never throws, regardless of `input`. Walks the `cause` chain of an
 * `Error`/`AggregateError` iteratively (never recursively) up to `CAUSE_CHAIN_DEPTH_LIMIT`
 * hops, tracking visited objects in a `WeakSet` so a cyclic `cause` chain terminates
 * immediately rather than looping until the depth limit.
 */
export class ThrownValueProjection {
  public static project(input: unknown): ProjectedValueInterface {
    const nodes: ProjectedNodeInterface[] = [];
    const visited = new WeakSet<object>();
    let current: unknown = input;
    let hopCount = 0;

    while (hopCount < CAUSE_CHAIN_DEPTH_LIMIT) {
      if (current === null || current === undefined) {
        nodes.push(Classifier.ofNullish());
        break;
      }
      if (current instanceof AggregateError) {
        nodes.push(Classifier.ofAggregate(current));
      } else if (Predicates.isError(current)) {
        nodes.push(Classifier.ofError(current));
      } else if (Predicates.isString(current)) {
        nodes.push(Classifier.ofString(current));
      } else if (typeof current === 'object' || typeof current === 'function') {
        nodes.push(Classifier.ofObject(current));
      } else {
        nodes.push(Classifier.ofPrimitive(current as bigint | boolean | number | symbol));
      }

      if (!Predicates.isError(current)) { break; }
      if (visited.has(current)) { break; }
      visited.add(current);

      const nextCause: unknown = current.cause;
      if (nextCause === undefined || nextCause === null) { break; }
      if (typeof nextCause === 'object' && visited.has(nextCause)) { break; }

      current = nextCause;
      hopCount += 1;
    }

    const head = nodes.at(0) ?? Classifier.ofNullish();
    // Only the head keeps its stack: a cause node is a summary, and CauseNodeEntity
    // declares no `stack` member, so carrying one would emit an off-schema node.
    const causes = nodes.slice(1).map((node) => {
      const { 'stack': _stack, ...rest } = node;

      return rest;
    });
    const result: ProjectedValueInterface = causes.length === 0 ? head : { ...head, 'causes': causes };

    return result;
  }
}
