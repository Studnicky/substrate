import type { JSONSchema7Type } from 'json-schema';

export namespace GuardAccessorsFixtures {
  export const mixed: unknown = [{ 'id': 1 }, 'skip', { 'id': 2 }, null];
  export const value: JSONSchema7Type = { 'nested': [1, 'two', null] };
}
