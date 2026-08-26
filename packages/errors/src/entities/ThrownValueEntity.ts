import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from '../interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { CAUSE_CHAIN_DEPTH_LIMIT } from '../constants/CauseChainConstants.js';
import { CauseNodeEntity } from './CauseNodeEntity.js';

const KIND_SET: ReadonlySet<string> = new Set(CauseNodeEntity.KIND_VALUES);

/**
 * Total, never-throwing fallback projection of an arbitrary caught/thrown value.
 *
 * A caught value can be anything: an `Error`, a subclass, an `AggregateError`, a
 * `DOMException`, a string, `null`, an engine-thrown object from `JSON.parse` or
 * `fetch`. The other error entities in this package describe a closed set of
 * known shapes; this one describes the open set reality actually produces, and
 * it must never itself throw — a value that cannot be classified precisely is
 * still classified as `'object'`/`'primitive'`/`'nullish'` rather than rejected.
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
      'kind': { 'enum': CauseNodeEntity.KIND_VALUES, 'type': 'string' },
      'message': { 'type': 'string' },
      'name': { 'type': 'string' },
      'stack': { 'type': 'string' }
    },
    'required': ['kind', 'message'],
    'title': 'ThrownValue',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /** Shape produced while walking the chain, before `stack` is stripped for non-head nodes. */
  interface ClassifiedNodeInterface {
    readonly 'kind': Type['kind'];
    readonly 'message': string;
    readonly 'name'?: string;
    readonly 'stack'?: string;
  }

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    if (typeof candidate.kind !== 'string' || !KIND_SET.has(candidate.kind)) { return false; }
    if (typeof candidate.message !== 'string') { return false; }
    if (candidate.name !== undefined && typeof candidate.name !== 'string') { return false; }
    if (candidate.stack !== undefined && typeof candidate.stack !== 'string') { return false; }
    if (candidate.causes === undefined) { return true; }
    if (!Array.isArray(candidate.causes)) { return false; }
    const result = candidate.causes.every((item) => {
      if (!Predicates.isObject(item)) { return false; }
      if (typeof item.kind !== 'string' || !KIND_SET.has(item.kind)) { return false; }
      if (typeof item.message !== 'string') { return false; }
      const nameValid = item.name === undefined || typeof item.name === 'string';
      return nameValid;
    });
    return result;
  };

  /**
   * Classifies an already-narrowed value into a chain node. Every method here takes a
   * concrete, non-`unknown` parameter — the narrowing itself happens inline in `intake`,
   * the one place permitted to inspect an `unknown` value.
   */
  class Classifier {
    public static ofNullish(): ClassifiedNodeInterface {
      return { 'kind': 'nullish', 'message': '' };
    }

    public static ofString(value: string): ClassifiedNodeInterface {
      return { 'kind': 'string', 'message': value };
    }

    public static ofError(error: Error): ClassifiedNodeInterface {
      const node: ClassifiedNodeInterface = { 'kind': 'error', 'message': error.message, 'name': error.name };
      const result = typeof error.stack === 'string' ? { ...node, 'stack': error.stack } : node;
      return result;
    }

    public static ofAggregate(error: AggregateError): ClassifiedNodeInterface {
      const asError = Classifier.ofError(error);
      const result: ClassifiedNodeInterface = { ...asError, 'kind': 'aggregate' };
      return result;
    }

    /** Reads `message`/`name` defensively — a thrown object may carry a throwing getter for either. */
    public static ofObject(value: object): ClassifiedNodeInterface {
      let message = '';
      try {
        const candidate: unknown = Reflect.get(value, 'message');
        if (typeof candidate === 'string') { message = candidate; }
      } catch {
        message = '';
      }
      let name: string | undefined;
      try {
        const candidate: unknown = Reflect.get(value, 'name');
        if (typeof candidate === 'string') { name = candidate; }
      } catch {
        name = undefined;
      }
      const result: ClassifiedNodeInterface = name === undefined ? { 'kind': 'object', 'message': message } : { 'kind': 'object', 'message': message, 'name': name };
      return result;
    }

    /** `String()` never throws for these types, unlike template-literal coercion. */
    public static ofPrimitive(value: bigint | boolean | number | symbol): ClassifiedNodeInterface {
      return { 'kind': 'primitive', 'message': String(value) };
    }
  }

  class Boundary {
    /**
     * Total intake: never throws, regardless of `input`. Walks the `cause` chain of an
     * `Error`/`AggregateError` iteratively (never recursively) up to `CAUSE_CHAIN_DEPTH_LIMIT`
     * hops, tracking visited objects in a `WeakSet` so a cyclic `cause` chain terminates
     * immediately rather than looping until the depth limit.
     */
    public static intake(input: unknown): Type {
      const nodes: ClassifiedNodeInterface[] = [];
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
        } else if (current instanceof Error) {
          nodes.push(Classifier.ofError(current));
        } else if (typeof current === 'string') {
          nodes.push(Classifier.ofString(current));
        } else if (typeof current === 'object' || typeof current === 'function') {
          nodes.push(Classifier.ofObject(current));
        } else {
          nodes.push(Classifier.ofPrimitive(current as bigint | boolean | number | symbol));
        }

        if (!(current instanceof Error)) { break; }
        if (visited.has(current)) { break; }
        visited.add(current);

        const nextCause: unknown = current.cause;
        if (nextCause === undefined || nextCause === null) { break; }
        if (typeof nextCause === 'object' && visited.has(nextCause)) { break; }

        current = nextCause;
        hopCount += 1;
      }

      const head = nodes[0] ?? Classifier.ofNullish();
      const causes: CauseNodeEntity.Type[] = nodes.slice(1).map((node) => {
        const result: CauseNodeEntity.Type = node.name === undefined
          ? { 'kind': node.kind, 'message': node.message }
          : { 'kind': node.kind, 'message': node.message, 'name': node.name };
        return result;
      });

      const base: Type = head.name === undefined
        ? { 'kind': head.kind, 'message': head.message }
        : { 'kind': head.kind, 'message': head.message, 'name': head.name };
      const withStack: Type = head.stack === undefined ? base : { ...base, 'stack': head.stack };
      const result: Type = causes.length === 0 ? withStack : { ...withStack, 'causes': causes };
      return result;
    }

    /** Locally-produced data: defaults merged, no coercion or transforms. */
    public static create(partial: Partial<Type> = {}): Type {
      const kind = partial.kind ?? 'nullish';
      const message = partial.message ?? '';
      let result: Type = { 'kind': kind, 'message': message };
      if (partial.name !== undefined) { result = { ...result, 'name': partial.name }; }
      if (partial.stack !== undefined) { result = { ...result, 'stack': partial.stack }; }
      if (partial.causes !== undefined) { result = { ...result, 'causes': partial.causes }; }
      return result;
    }
  }

  export const intake: EntityIntakeFunctionInterface<Type> = Boundary.intake;
  export const create: EntityCreateFunctionInterface<Type> = Boundary.create;
}
