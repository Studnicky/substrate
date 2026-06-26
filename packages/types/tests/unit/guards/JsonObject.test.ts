import assert from 'node:assert/strict';
import { it } from 'node:test';

import { JsonObject } from '../../../src/guards/JsonObject.js';

// JsonObject.is — truthy cases
void it('JsonObject.is returns true for a plain object', () => {
  assert.equal(JsonObject.is({ a: 1 }), true);
});

void it('JsonObject.is returns true for an empty plain object', () => {
  assert.equal(JsonObject.is({}), true);
});

void it('JsonObject.is returns true for a nested plain object', () => {
  assert.equal(JsonObject.is({ x: { y: 2 } }), true);
});

// JsonObject.is — falsy cases
const falsyScenarios: Array<{ description: string; value: unknown }> = [
  { description: 'JsonObject.is returns false for null', value: null },
  { description: 'JsonObject.is returns false for an array', value: [] },
  { description: 'JsonObject.is returns false for a non-empty array', value: [1, 2] },
  { description: 'JsonObject.is returns false for a string', value: 'hello' },
  { description: 'JsonObject.is returns false for a number', value: 42 },
  { description: 'JsonObject.is returns false for a boolean', value: true },
  { description: 'JsonObject.is returns false for undefined', value: undefined }
];

for (const { description, value } of falsyScenarios) {
  void it(description, () => { assert.equal(JsonObject.is(value), false); });
}
