import assert from 'node:assert/strict';
import { it } from 'node:test';

import { BodySerializer } from '../../../src/modules/BodySerializer.js';

void it('copies a DataView visible range into a detached Uint8Array', () => {
  const source = new Uint8Array([99, 1, 2, 3, 99]);
  const view = new DataView(source.buffer, 1, 3);

  const serialized = BodySerializer.serialize(view);

  assert.ok(serialized instanceof Uint8Array);
  assert.strictEqual(serialized.constructor, Uint8Array);
  assert.deepEqual([...serialized], [1, 2, 3]);

  source[1] = 42;
  assert.deepEqual([...serialized], [1, 2, 3]);
});

void it('copies a typed-array byte range without retaining its backing buffer', () => {
  const source = new Uint16Array([258, 772]);
  const expected = [...new Uint8Array(source.buffer, source.byteOffset, source.byteLength)];

  const serialized = BodySerializer.serialize(source);

  assert.ok(serialized instanceof Uint8Array);
  assert.strictEqual(serialized.constructor, Uint8Array);
  assert.deepEqual([...serialized], expected);

  source.fill(0);
  assert.deepEqual([...serialized], expected);
});
