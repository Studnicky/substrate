import { Predicates } from '@studnicky/types/node';

import type { ThrownValueEntity } from '../entities/ThrownValueEntity.js';

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

interface MemberReadResultInterface {
  readonly 'readable': boolean;
  readonly 'value': unknown;
}

/** Reads arbitrary object members without allowing hostile accessors to escape the projection boundary. */
class MemberReader {
  public static read(source: object, key: string): MemberReadResultInterface {
    try {
      const value: unknown = Reflect.get(source, key);
      const result = { 'readable': true, 'value': value };
      return result;
    } catch {
      return { 'readable': false, 'value': undefined };
    }
  }
}

class Classifier {
  public static ofNullish(): ThrownValueEntity.Type {
    return { 'detail': '', 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH };
  }

  public static ofString(value: string): ThrownValueEntity.Type {
    return { 'detail': value, 'title': PROBLEM_TITLE_THROWN_STRING, 'type': PROBLEM_TYPE_THROWN_STRING };
  }

  public static ofError(error: Error): ThrownValueEntity.Type {
    const message = MemberReader.read(error, 'message').value;
    const name = MemberReader.read(error, 'name').value;
    const stack = MemberReader.read(error, 'stack').value;
    const node: ThrownValueEntity.Type = {
      'detail': Predicates.isString(message) ? message : '',
      'title': PROBLEM_TITLE_ERROR,
      'type': PROBLEM_TYPE_ERROR
    };
    const namedNode = Predicates.isString(name) ? { ...node, 'name': name } : node;
    const result = Predicates.isString(stack) ? { ...namedNode, 'stack': stack } : namedNode;
    return result;
  }

  public static ofAggregate(error: AggregateError): ThrownValueEntity.Type {
    const asError = Classifier.ofError(error);
    const result: ThrownValueEntity.Type = {
      ...asError,
      'title': PROBLEM_TITLE_AGGREGATE_ERROR,
      'type': PROBLEM_TYPE_AGGREGATE_ERROR
    };
    return result;
  }

  /** Classifies non-Error objects using the same defensive member reader as native errors. */
  public static ofObject(value: object): ThrownValueEntity.Type {
    const message = MemberReader.read(value, 'message').value;
    const name = MemberReader.read(value, 'name').value;
    const node: ThrownValueEntity.Type = {
      'detail': Predicates.isString(message) ? message : '',
      'title': PROBLEM_TITLE_THROWN_OBJECT,
      'type': PROBLEM_TYPE_THROWN_OBJECT
    };
    const result: ThrownValueEntity.Type = Predicates.isString(name) ? { ...node, 'name': name } : node;
    return result;
  }

  /** `String()` never throws for these types, unlike template-literal coercion. */
  public static ofPrimitive(value: bigint | boolean | number | symbol): ThrownValueEntity.Type {
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
  public static project(input: unknown): ThrownValueEntity.Type {
    try {
      const result = ThrownValueProjection.projectKnown(input);
      return result;
    } catch {
      const result = Classifier.ofNullish();
      return result;
    }
  }

  private static projectKnown(input: unknown): ThrownValueEntity.Type {
    const nodes: ThrownValueEntity.Type[] = [];
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
      } else if (typeof current === 'bigint' || typeof current === 'boolean' || typeof current === 'number' || typeof current === 'symbol') {
        nodes.push(Classifier.ofPrimitive(current));
      }

      if (!Predicates.isError(current)) { break; }
      if (visited.has(current)) { break; }
      visited.add(current);

      const causeRead = MemberReader.read(current, 'cause');
      if (!causeRead.readable) { break; }
      const nextCause = causeRead.value;
      if (nextCause === undefined || nextCause === null) { break; }
      if (typeof nextCause === 'object' && visited.has(nextCause)) { break; }

      current = nextCause;
      hopCount += 1;
    }

    const head = nodes.at(0) ?? Classifier.ofNullish();
    // Only the head keeps its stack: a cause node is a summary, and CauseNodeEntity
    // declares no `stack` member, so carrying one would emit an off-schema node.
    const causes = nodes.slice(1).map((node) => {
      const { 'causes': _causes, 'stack': _stack, ...rest } = node;

      return rest;
    });
    const result: ThrownValueEntity.Type = causes.length === 0 ? head : { ...head, 'causes': causes };

    return result;
  }
}
