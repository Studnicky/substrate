import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ThrownValueEntity } from '../../src/entities/ThrownValueEntity.js';

void describe('ThrownValueEntity', () => {
  void it('is total: never throws, for every shape a caught value can take', () => {
    const inputs: readonly unknown[] = [
      undefined,
      null,
      'plain string',
      42,
      true,
      Symbol('boom'),
      10n,
      new Error('base'),
      new TypeError('typed'),
      new AggregateError([new Error('a'), new Error('b')], 'aggregate'),
      { 'custom': true },
      []
    ];

    for (const input of inputs) {
      assert.doesNotThrow(() => ThrownValueEntity.intake(input));
    }
  });

  void it('classifies nullish values', () => {
    assert.deepEqual(ThrownValueEntity.intake(null), { 'kind': 'nullish', 'message': '' });
    assert.deepEqual(ThrownValueEntity.intake(undefined), { 'kind': 'nullish', 'message': '' });
  });

  void it('classifies a thrown string', () => {
    const result = ThrownValueEntity.intake('boom');
    assert.deepEqual(result, { 'kind': 'string', 'message': 'boom' });
  });

  void it('classifies a thrown primitive via String() without throwing', () => {
    assert.deepEqual(ThrownValueEntity.intake(42), { 'kind': 'primitive', 'message': '42' });
    assert.deepEqual(ThrownValueEntity.intake(true), { 'kind': 'primitive', 'message': 'true' });
    assert.deepEqual(ThrownValueEntity.intake(10n), { 'kind': 'primitive', 'message': '10' });

    const symbolResult = ThrownValueEntity.intake(Symbol('boom'));
    assert.equal(symbolResult.kind, 'primitive');
    assert.equal(typeof symbolResult.message, 'string');
  });

  void it('classifies a plain Error, reading stack when present', () => {
    const error = new Error('failure');
    const result = ThrownValueEntity.intake(error);
    assert.equal(result.kind, 'error');
    assert.equal(result.message, 'failure');
    assert.equal(result.name, 'Error');
    assert.equal(result.stack, error.stack);
  });

  void it('gives AggregateError its own discriminant, distinct from a plain Error', () => {
    const aggregate = new AggregateError([new Error('a')], 'combined');
    const result = ThrownValueEntity.intake(aggregate);
    assert.equal(result.kind, 'aggregate');
    assert.equal(result.message, 'combined');
  });

  void it('classifies a plain thrown object, defensively reading message/name', () => {
    const result = ThrownValueEntity.intake({ 'message': 'custom message', 'name': 'CustomName' });
    assert.deepEqual(result, { 'kind': 'object', 'message': 'custom message', 'name': 'CustomName' });
  });

  void it('is not fooled by a throwing message/name getter and does not itself throw', () => {
    const hostile = {
      get message(): string {
        throw new Error('getter boom');
      },
      get name(): string {
        throw new Error('getter boom');
      }
    };

    const result = ThrownValueEntity.intake(hostile);
    assert.deepEqual(result, { 'kind': 'object', 'message': '' });
  });

  void it('does not fabricate a message for an object with no message property', () => {
    const result = ThrownValueEntity.intake({ 'other': true });
    assert.deepEqual(result, { 'kind': 'object', 'message': '' });
  });

  void it('follows a cause chain and bounds it via `causes`', () => {
    const root = new Error('root');
    const middle = new Error('middle', { 'cause': root });
    const top = new Error('top', { 'cause': middle });

    const result = ThrownValueEntity.intake(top);
    assert.equal(result.message, 'top');
    assert.deepEqual(result.causes, [
      { 'kind': 'error', 'message': 'middle', 'name': 'Error' },
      { 'kind': 'error', 'message': 'root', 'name': 'Error' }
    ]);
  });

  void it('terminates immediately on a cyclic cause chain instead of looping to the depth limit', () => {
    const a: Error & { cause?: unknown } = new Error('a');
    const b: Error & { cause?: unknown } = new Error('b', { 'cause': a });
    a.cause = b;

    const result = ThrownValueEntity.intake(a);
    assert.equal(result.message, 'a');
    assert.deepEqual(result.causes, [{ 'kind': 'error', 'message': 'b', 'name': 'Error' }]);
  });

  void it('bounds an unbounded (non-cyclic) cause chain at the depth limit', () => {
    let current: Error | undefined;
    for (let index = 0; index < 100; index += 1) {
      current = new Error(`level-${index}`, current === undefined ? undefined : { 'cause': current });
    }

    const result = ThrownValueEntity.intake(current);
    assert.ok((result.causes?.length ?? 0) <= 31);
  });

  void it('round-trips through validate', () => {
    const result = ThrownValueEntity.intake(new Error('failure'));
    assert.equal(ThrownValueEntity.validate(result), true);
    assert.equal(ThrownValueEntity.validate({ 'kind': 'not-a-kind', 'message': '' }), false);
  });

  void it('create fills defaults without coercion and does not fabricate optional fields', () => {
    assert.deepEqual(ThrownValueEntity.create(), { 'kind': 'nullish', 'message': '' });
    const withName = ThrownValueEntity.create({ 'kind': 'error', 'message': 'boom', 'name': 'X' });
    assert.deepEqual(withName, { 'kind': 'error', 'message': 'boom', 'name': 'X' });
    assert.equal(Object.hasOwn(withName, 'stack'), false);
  });
});
