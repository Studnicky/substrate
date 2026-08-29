import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from '../interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { CAUSE_CHAIN_DEPTH_LIMIT } from '../constants/CauseChainConstants.js';
import {
  PROBLEM_TITLE_THROWN_NULLISH,
  PROBLEM_TYPE_THROWN_NULLISH
} from '../constants/ProblemConstants.js';
import { ThrownValueProjection } from '../validation/thrownValueProjection.js';
import { CauseNodeEntity } from './CauseNodeEntity.js';

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
        'description': 'Stable human-readable name of the problem type.',
        'type': 'string'
      },
      'type': {
        'description': 'URI reference identifying the problem type. The discriminant.',
        'type': 'string'
      }
    },
    'required': ['detail', 'title', 'type'],
    'title': 'ThrownValue',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    if (!Predicates.isString(candidate.type)) { return false; }
    if (!Predicates.isString(candidate.title)) { return false; }
    if (!Predicates.isString(candidate.detail)) { return false; }
    if (candidate.name !== undefined && !Predicates.isString(candidate.name)) { return false; }
    if (candidate.stack !== undefined && !Predicates.isString(candidate.stack)) { return false; }
    if (candidate.causes === undefined) { return true; }
    if (!Predicates.isArray(candidate.causes)) { return false; }

    const result = candidate.causes.every((item) => {
      const itemResult = CauseNodeEntity.validate(item);

      return itemResult;
    });

    return result;
  };

  class Boundary {
    /**
     * Total intake: never throws, regardless of `input`. Walks the `cause` chain of an
     * `Error`/`AggregateError` iteratively (never recursively) up to `CAUSE_CHAIN_DEPTH_LIMIT`
     * hops, tracking visited objects in a `WeakSet` so a cyclic `cause` chain terminates
     * immediately rather than looping until the depth limit.
     */
    /** Delegates to the leaf projection; see `validation/thrownValueProjection.ts`. */
    public static intake(input: unknown): Type {
      const projected = ThrownValueProjection.project(input);
      const causes = projected.causes ?? [];
      let result: Type = { 'detail': projected.detail, 'title': projected.title, 'type': projected.type };

      if (projected.name !== undefined) { result = { ...result, 'name': projected.name }; }
      if (projected.stack !== undefined) { result = { ...result, 'stack': projected.stack }; }
      if (causes.length > 0) { result = { ...result, 'causes': [...causes] }; }

      return result;
    }

    /** Locally-produced data: defaults merged, no coercion or transforms. */
    public static create(partial: Partial<Type> = {}): Type {
      const type = partial.type ?? PROBLEM_TYPE_THROWN_NULLISH;
      const title = partial.title ?? PROBLEM_TITLE_THROWN_NULLISH;
      const detail = partial.detail ?? '';
      let result: Type = { 'detail': detail, 'title': title, 'type': type };
      if (partial.name !== undefined) { result = { ...result, 'name': partial.name }; }
      if (partial.stack !== undefined) { result = { ...result, 'stack': partial.stack }; }
      if (partial.causes !== undefined) { result = { ...result, 'causes': partial.causes }; }
      return result;
    }
  }

  export const intake: EntityIntakeFunctionInterface<Type> = Boundary.intake;
  export const create: EntityCreateFunctionInterface<Type> = Boundary.create;
}
