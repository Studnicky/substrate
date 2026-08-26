import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from '../interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

/**
 * One node of a thrown value's cause chain, minus the head node's own `stack`/`causes`.
 *
 * Hand-written, without `../validation/EntityIntake.js`. That shared boundary helper throws
 * `ValidationError`, which extends `BaseError` — and `BaseError` itself parses through
 * {@link ThrownValueEntity} (which composes this entity), so routing through it here would
 * reintroduce the exact cycle this entity exists to break out of.
 */
export namespace CauseNodeEntity {
  export const KIND_VALUES = ['aggregate', 'error', 'nullish', 'object', 'primitive', 'string'] as const;
  const KIND_SET: ReadonlySet<string> = new Set(KIND_VALUES);

  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ThrownValueCauseNode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'kind': { 'enum': KIND_VALUES, 'type': 'string' },
      'message': { 'type': 'string' },
      'name': { 'type': 'string' }
    },
    'required': ['kind', 'message'],
    'title': 'ThrownValueCauseNode',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    if (typeof candidate.kind !== 'string' || !KIND_SET.has(candidate.kind)) { return false; }
    if (typeof candidate.message !== 'string') { return false; }
    const result = candidate.name === undefined || typeof candidate.name === 'string';
    return result;
  };

  class Boundary {
    public static intake(input: unknown): Type {
      if (!Boundary.isValid(input)) {
        throw new TypeError('CauseNodeEntity.intake: candidate does not match the declared schema');
      }
      const result: Type = input.name === undefined
        ? { 'kind': input.kind, 'message': input.message }
        : { 'kind': input.kind, 'message': input.message, 'name': input.name };
      return result;
    }

    public static create(partial: Partial<Type> = {}): Type {
      const kind = partial.kind ?? 'nullish';
      const message = partial.message ?? '';
      const result: Type = partial.name === undefined
        ? { 'kind': kind, 'message': message }
        : { 'kind': kind, 'message': message, 'name': partial.name };
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
