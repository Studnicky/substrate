/**
 * Registry of runtime operand coders for native values outside FilterValueEntity.Type.
 */

import type { ValueCoderInterface } from './ValueCoderInterface.js';

import { Registry } from './Registry.js';

const CORE: Record<string, ValueCoderInterface<
  Date | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>
>> = {
  'date': {
    'guard': (value: unknown): value is Date => value instanceof Date
  },
  'map': {
    'guard': (value: unknown): value is ReadonlyMap<unknown, unknown> => value instanceof Map
  },
  'set': {
    'guard': (value: unknown): value is ReadonlySet<unknown> => value instanceof Set
  }
};

export class ValueCoders {
  public readonly coders: Registry<ValueCoderInterface<
    Date | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>
  >> = new Registry('valueCoder', { 'CORE': CORE });
}
