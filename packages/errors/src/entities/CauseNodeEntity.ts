import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from '../interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import {
  PROBLEM_TITLE_THROWN_NULLISH, PROBLEM_TYPE_THROWN_NULLISH
} from '../constants/ProblemConstants.js';
import { RuntimeError } from '../errors/RuntimeError.js';

/**
 * One node of a cause chain, shaped as RFC 9457 members.
 *
 * This is the item shape of the `causes` EXTENSION member, not a standalone Problem Details
 * object, so it is sealed and its three members are required: the projection always produces
 * all three. `type` is the discriminant — a caught string and a caught `AggregateError` are
 * told apart by their type URI, which is why no separate classification member exists.
 *
 * Hand-written, without `../validation/EntityIntake.js`, because this entity is used by the
 * BaseError cause serializer and must stay independent of it at module initialization.
 */
export namespace CauseNodeEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/CauseNode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'code': {
        'description': 'Registered dotted error code, when this node was a `BaseError`.',
        'type': 'string'
      },
      'context': {
        'description': 'Structured metadata carried by this node, when it was a `BaseError`.',
        'type': 'object'
      },
      'correlationId': {
        'description': 'Correlation ID carried by this node, when it was a `BaseError`.',
        'type': 'string'
      },
      'detail': {
        'description': "Human-readable explanation specific to this occurrence — the caught value's message.",
        'type': 'string'
      },
      'name': {
        'description': "Constructor name of the caught value, when it had one (e.g. 'TypeError').",
        'type': 'string'
      },
      'timestamp': {
        'description': 'Construction timestamp carried by this node, when it was a `BaseError`.',
        'type': 'number'
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
    'title': 'CauseNode',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    if (!Predicates.isString(candidate.type)) { return false; }
    if (!Predicates.isString(candidate.title)) { return false; }
    if (!Predicates.isString(candidate.detail)) { return false; }
    if (candidate.name !== undefined && !Predicates.isString(candidate.name)) { return false; }
    if (candidate.code !== undefined && !Predicates.isString(candidate.code)) { return false; }
    if (candidate.correlationId !== undefined && !Predicates.isString(candidate.correlationId)) { return false; }
    if (candidate.timestamp !== undefined && !Predicates.isNumber(candidate.timestamp)) { return false; }
    const result = candidate.context === undefined || Predicates.isObject(candidate.context);

    return result;
  };

  class Boundary {
    public static intake(input: unknown): Type {
      if (!Boundary.isValid(input)) {
        throw RuntimeError.create('CauseNodeEntity.intake: candidate does not match the declared schema');
      }
      const result = Boundary.assemble(input);
      return result;
    }

    public static create(partial: Partial<Type> = {}): Type {
      const type = partial.type ?? PROBLEM_TYPE_THROWN_NULLISH;
      const title = partial.title ?? PROBLEM_TITLE_THROWN_NULLISH;
      const detail = partial.detail ?? '';
      const result = Boundary.assemble({ ...partial, 'detail': detail, 'title': title, 'type': type });
      return result;
    }

    /** Emits only the members that are present, so absent context never becomes an own `undefined`. */
    private static assemble(source: Partial<Type> & Pick<Type, 'detail' | 'title' | 'type'>): Type {
      let result: Type = { 'detail': source.detail, 'title': source.title, 'type': source.type };
      if (source.name !== undefined) { result = { ...result, 'name': source.name }; }
      if (source.code !== undefined) { result = { ...result, 'code': source.code }; }
      if (source.correlationId !== undefined) { result = { ...result, 'correlationId': source.correlationId }; }
      if (source.timestamp !== undefined) { result = { ...result, 'timestamp': source.timestamp }; }
      if (source.context !== undefined) { result = { ...result, 'context': source.context }; }
      return result;
    }

    private static isValid(candidate: unknown): candidate is Type {
      const result = validate(candidate);
      return result;
    }
  }

  export const intake: EntityIntakeFunctionInterface<Type> = Boundary.intake;
  export const create: EntityCreateFunctionInterface<Type> = Boundary.create;
}
