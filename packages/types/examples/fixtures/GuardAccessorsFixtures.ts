import type { JsonSchemaObjectType, JsonValueType } from '../../src/index.js';

export namespace GuardAccessorsFixtures {
  export const mixed: unknown = [{ 'id': 1 }, 'skip', { 'id': 2 }, null];
  export const schema: JsonSchemaObjectType = { 'type': 'string' };
  export const value: JsonValueType = { 'nested': [1, 'two', null] };
}
