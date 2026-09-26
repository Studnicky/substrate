import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, MaximumItemsBrandInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { Predicates } from '@studnicky/types/browser';

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
import { CauseNodeEntity } from './CauseNodeEntity.js';

interface MemberReadResultInterface {
  readonly 'readable': boolean;
  readonly 'value': unknown;
}

interface CauseAdvanceResultInterface {
  readonly 'continue': boolean;
  readonly 'next': unknown;
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

  /** Classifies a single non-null, non-undefined value. AggregateError is checked before Error since it extends Error. */
  public static classify(value: object | string | bigint | boolean | number | symbol): ThrownValueEntity.Type {
    if (value instanceof AggregateError) {
      const result = Classifier.ofAggregate(value);
      return result;
    }
    if (Predicates.isError(value)) {
      const result = Classifier.ofError(value);
      return result;
    }
    if (Predicates.isString(value)) {
      const result = Classifier.ofString(value);
      return result;
    }
    if (typeof value === 'object' || typeof value === 'function') {
      const result = Classifier.ofObject(value);
      return result;
    }
    const result = Classifier.ofPrimitive(value);
    return result;
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
      nodes.push(Classifier.classify(current));

      const advance = ThrownValueProjection.advanceCause(current, visited);
      if (!advance.continue) { break; }
      current = advance.next;
      hopCount += 1;
    }

    const result = ThrownValueProjection.assemble(nodes);
    return result;
  }

  /** Determines the next `cause` hop, tracking visited objects so a cyclic chain stops immediately. */
  private static advanceCause(current: unknown, visited: WeakSet<object>): CauseAdvanceResultInterface {
    if (!Predicates.isError(current)) { return { 'continue': false, 'next': undefined }; }
    if (visited.has(current)) { return { 'continue': false, 'next': undefined }; }
    visited.add(current);

    const causeRead = MemberReader.read(current, 'cause');
    if (!causeRead.readable) { return { 'continue': false, 'next': undefined }; }
    const nextCause = causeRead.value;
    if (nextCause === undefined || nextCause === null) { return { 'continue': false, 'next': undefined }; }
    if (typeof nextCause === 'object' && visited.has(nextCause)) { return { 'continue': false, 'next': undefined }; }

    return { 'continue': true, 'next': nextCause };
  }

  /**
   * Only the head keeps its stack: a cause node is a summary, and CauseNodeEntity
   * declares no `stack` member, so carrying one would emit an off-schema node.
   */
  private static assemble(nodes: ThrownValueEntity.Type[]): ThrownValueEntity.Type {
    const head = nodes.at(0) ?? Classifier.ofNullish();
    const causesRaw = nodes.slice(1).map((node) => {
      const { 'causes': _causes, 'stack': _stack, ...rest } = node;

      return rest;
    });
    if (causesRaw.length === 0) {
      return head;
    }
    if (ThrownValueProjection.isCauseChain(causesRaw)) {
      const result: ThrownValueEntity.Type = { ...head, 'causes': causesRaw };
      return result;
    }
    throw new Error(`assembled cause chain violates CauseNodeEntity's own schema: ${EntityCompiler.formatErrors(ThrownValueProjection.isCauseChain.errors)}`);
  }

  /**
   * Earns the `causes` array's `CauseNodeEntity` element brand and `maxItems` brand a
   * subtraction can never forge — validating a fresh, cycle-free array in place, without
   * cloning it, is cheaper than intake and just as sound as create for internal data.
   */
  private static readonly isCauseChain = EntityCompiler.compile<CauseNodeEntity.Type[] & MaximumItemsBrandInterface<typeof CAUSE_CHAIN_DEPTH_LIMIT>>({
    'items': CauseNodeEntity.Schema,
    'maxItems': CAUSE_CHAIN_DEPTH_LIMIT,
    'type': 'array'
  } as const);
}

/**
 * Total, never-throwing projection of an arbitrary caught value into RFC 9457 members.
 *
 * A caught value can be anything: an `Error`, a subclass, an `AggregateError`, a
 * `DOMException`, a string, `null`, an engine-thrown object from `JSON.parse` or `fetch`.
 * This entity describes the open set reality actually produces, and it must never itself
 * throw — a value that cannot be classified precisely still resolves to a problem type
 * rather than being rejected.
 *
 * The projection is structurally a Problem Details object, but its three core members are
 * REQUIRED here rather than optional: this side always produces them, and requiring them is
 * what lets callers read `.detail` as a `string` instead of narrowing at every use. The
 * problem type URI carries the classification, so there is no separate discriminant member.
 *
 * `Classifier`, `MemberReader`, and `ThrownValueProjection` live in this same file, not a
 * separate module: `intake` wires directly to `ThrownValueProjection.project`, which returns
 * `Type`, so splitting them across files would recreate the cycle this entity exists to avoid.
 */
export namespace ThrownValueEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ThrownValue',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'causes': {
        'description': 'Bounded, cycle-safe projection of the remainder of the cause chain (excludes this node).',
        'items': CauseNodeEntity.Schema,
        'maxItems': CAUSE_CHAIN_DEPTH_LIMIT,
        'type': 'array'
      },
      'detail': {
        'default': '',
        'description': "Human-readable explanation specific to this occurrence — the caught value's message.",
        'type': 'string'
      },
      'name': {
        'description': "Constructor name of the caught value, when it had one (e.g. 'TypeError').",
        'type': 'string'
      },
      'stack': {
        'description': 'Stack trace of the head node. Cause nodes carry none.',
        'type': 'string'
      },
      'title': {
        'default': PROBLEM_TITLE_THROWN_NULLISH,
        'description': 'Stable human-readable name of the problem type.',
        'type': 'string'
      },
      'type': {
        'default': PROBLEM_TYPE_THROWN_NULLISH,
        'description': 'URI reference identifying the problem type. The discriminant.',
        'type': 'string'
      }
    },
    'required': ['detail', 'title', 'type'],
    'title': 'ThrownValue',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ThrownValue', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ThrownValue', 'type': 'object' } as const, { 'causes': SchemaNode.defineArray({ 'description': 'Bounded, cycle-safe projection of the remainder of the cause chain (excludes this node).', 'maxItems': CAUSE_CHAIN_DEPTH_LIMIT, 'type': 'array' } as const, CauseNodeEntity.Node), 'detail': SchemaNode.defineString({
    'default': '',
    'description': "Human-readable explanation specific to this occurrence — the caught value's message.",
    'type': 'string'
  } as const), 'name': SchemaNode.defineString({
    'description': "Constructor name of the caught value, when it had one (e.g. 'TypeError').",
    'type': 'string'
  } as const), 'stack': SchemaNode.defineString({
    'description': 'Stack trace of the head node. Cause nodes carry none.',
    'type': 'string'
  } as const), 'title': SchemaNode.defineString({
    'default': PROBLEM_TITLE_THROWN_NULLISH,
    'description': 'Stable human-readable name of the problem type.',
    'type': 'string'
  } as const), 'type': SchemaNode.defineString({
    'default': PROBLEM_TYPE_THROWN_NULLISH,
    'description': 'URI reference identifying the problem type. The discriminant.',
    'type': 'string'
  } as const) }, ['detail', 'title', 'type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = ThrownValueProjection.project;
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
