import assert from 'node:assert/strict';
import { it } from 'node:test';

import { PickDefined } from '../../../src/objects/PickDefined.js';

void it('PickDefined.from keeps all keys when every value is required and present', () => {
  const result = PickDefined.from({ burstSize: 10, requestsPerSecond: 5 });
  assert.deepEqual(result, { burstSize: 10, requestsPerSecond: 5 });
});

void it('PickDefined.from keeps present optional keys alongside required ones', () => {
  const clock = (): number => 0;
  const result = PickDefined.from({ burstSize: 10, requestsPerSecond: 5, clock });
  assert.deepEqual(result, { burstSize: 10, requestsPerSecond: 5, clock });
});

void it('PickDefined.from drops undefined-valued keys from a mixed record', () => {
  const result = PickDefined.from({ burstSize: 10, requestsPerSecond: 5, clock: undefined });
  assert.deepEqual(result, { burstSize: 10, requestsPerSecond: 5 });
  assert.equal('clock' in result, false);
});

void it('PickDefined.from returns an empty object when every value is undefined', () => {
  const result = PickDefined.from({ clock: undefined, deadlineMs: undefined });
  assert.deepEqual(result, {});
  assert.equal('clock' in result, false);
  assert.equal('deadlineMs' in result, false);
});

void it('PickDefined.from models an always-undefined input property as absent', () => {
  const result: { 'value'?: never } = PickDefined.from({ value: undefined });
  assert.deepEqual(result, {});
  assert.equal('value' in result, false);
});

void it('PickDefined.from returns an empty object for an empty record', () => {
  const result = PickDefined.from({});
  assert.deepEqual(result, {});
});

void it('PickDefined.from preserves a required field so it is not over-stripped', () => {
  const result = PickDefined.from({ requestsPerSecond: 5, clock: undefined });
  assert.equal(result.requestsPerSecond, 5);
  assert.deepEqual(Object.keys(result), ['requestsPerSecond']);
});

void it('PickDefined.from preserves falsy-but-defined values', () => {
  const result = PickDefined.from({ count: 0, label: '', enabled: false, clock: undefined });
  assert.deepEqual(result, { count: 0, label: '', enabled: false });
});
