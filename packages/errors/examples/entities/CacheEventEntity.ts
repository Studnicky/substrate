import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../../src/interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../../src/validation/EntityIntake.js';

/** Cache-access event recorded by the EventRecorder example. */
export namespace CacheEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': { 'enum': ['hit', 'miss'], 'type': 'string' },
      'key': { 'type': 'string' }
    },
    'required': ['event', 'key'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    const result = (candidate.event === 'hit' || candidate.event === 'miss') && typeof candidate.key === 'string';
    return result;
  };

  class Parser {
    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['event', 'key'])) { return undefined; }
      const event = EntityIntake.string(candidate.event, options.coerce);
      const key = EntityIntake.string(candidate.key, options.coerce);
      if ((event !== 'hit' && event !== 'miss') || key === undefined) { return undefined; }
      return { 'event': event, 'key': key };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'CacheEvent');
  export const create = EntityIntake.compileCreate(Parser.parse, 'CacheEvent');
}
