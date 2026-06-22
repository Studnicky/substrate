/**
 * Example: Wire type-safe accessors and static-override subclass
 * Run: npx tsx packages/types/examples/wire-guards.ts
 */
import assert from 'node:assert/strict';

import { Wire } from '../src/index.js';
import type {
  JsonSchemaObjectType, JsonValueType
} from '../src/index.js';

// ── isRecord ──────────────────────────────────────────────────────────────────

assert.equal(Wire.isRecord({ a: 1 }), true, 'plain object is a record');
assert.equal(Wire.isRecord([1, 2, 3]), false, 'array is not a record');
assert.equal(Wire.isRecord(null), false, 'null is not a record');
assert.equal(Wire.isRecord('hello'), false, 'string is not a record');

// ── asRecord ──────────────────────────────────────────────────────────────────

const rec = Wire.asRecord({ name: 'Ada', age: 42 });
assert.ok(rec !== undefined, 'asRecord returns the object');
assert.equal(rec['name'], 'Ada');

assert.equal(Wire.asRecord(null), undefined, 'asRecord returns undefined for null');
assert.equal(Wire.asRecord([]), undefined, 'asRecord returns undefined for array');

// ── asString ──────────────────────────────────────────────────────────────────

assert.equal(Wire.asString('hello'), 'hello');
assert.equal(Wire.asString(42), undefined, 'number is not a string');
assert.equal(Wire.asString(null), undefined, 'null is not a string');

// ── asNumber ──────────────────────────────────────────────────────────────────

assert.equal(Wire.asNumber(3.14), 3.14);
assert.equal(Wire.asNumber('3'), undefined, 'string is not a number');
assert.equal(Wire.asNumber(NaN), NaN, 'NaN passes typeof check');

// ── asStringOrNull ────────────────────────────────────────────────────────────

assert.equal(Wire.asStringOrNull('hello'), 'hello');
assert.equal(Wire.asStringOrNull(null), null, 'null returns null');
assert.equal(Wire.asStringOrNull(42), undefined, 'number returns undefined');

// ── asRecordArray ─────────────────────────────────────────────────────────────

const mixed: unknown = [{ id: 1 }, 'skip', { id: 2 }, null];
const records = Wire.asRecordArray(mixed);
assert.ok(records !== undefined);
assert.equal(records.length, 2, 'non-record elements are filtered out');
assert.equal(records[0]?.['id'], 1);
assert.equal(records[1]?.['id'], 2);

assert.equal(Wire.asRecordArray('not-an-array'), undefined);
assert.equal(Wire.asRecordArray(['a', 'b']), undefined, 'all-string array returns undefined');

// ── Static-override subclass ──────────────────────────────────────────────────

class StrictWire extends Wire {
  public static override isRecord(value: unknown): value is Record<string, unknown> {
    return super.isRecord(value) && !Array.isArray(value);
  }
}

assert.equal(StrictWire.isRecord({ x: 1 }), true, 'StrictWire accepts plain objects');
assert.equal(StrictWire.isRecord([]), false, 'StrictWire rejects arrays (same as base)');

const strictRec = StrictWire.asRecord({ host: 'localhost' });
assert.ok(strictRec !== undefined);
assert.equal(strictRec['host'], 'localhost');

// asRecordArray delegates through this.isRecord, so StrictWire inherits the filter
const strictArr = StrictWire.asRecordArray([{ a: 1 }, 99, { b: 2 }]);
assert.ok(strictArr !== undefined);
assert.equal(strictArr.length, 2);

// ── Compile-time usage: type annotations only, no runtime overhead ─────────────
const schema: JsonSchemaObjectType = { type: 'string' };
const value: JsonValueType = { nested: [1, 'two', null] };

// Suppress unused-variable warnings in strict environments
void schema;
void value;
