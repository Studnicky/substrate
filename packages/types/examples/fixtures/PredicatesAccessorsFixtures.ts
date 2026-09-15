import type { JSONSchema7Type } from 'json-schema';

export namespace PredicatesAccessorsFixtures {
  export const mixed: unknown = [{ 'id': 1 }, 'skip', { 'id': 2 }, null];
  export const value: JSONSchema7Type = { 'nested': [1, 'two', null] };
  export const runtimeValues = {
    'left': new Map<unknown, unknown>([[{ 'id': 1 }, new Set<unknown>([{ 'enabled': true }])]]),
    'operand': new Map<unknown, unknown>([[{ 'id': 1 }, new Set<unknown>([new Date(0), undefined])]]),
    'right': new Map<unknown, unknown>([[{ 'id': 1 }, new Set<unknown>([{ 'enabled': true }])]])
  };
}
