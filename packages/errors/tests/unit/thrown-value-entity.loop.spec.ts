import { RuntimeError } from '../../src/errors/RuntimeError.js';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  PROBLEM_TITLE_ERROR,
  PROBLEM_TITLE_THROWN_NULLISH,
  PROBLEM_TITLE_THROWN_OBJECT,
  PROBLEM_TITLE_THROWN_PRIMITIVE,
  PROBLEM_TITLE_THROWN_STRING,
  PROBLEM_TYPE_ERROR,
  PROBLEM_TYPE_THROWN_NULLISH,
  PROBLEM_TYPE_THROWN_OBJECT,
  PROBLEM_TYPE_THROWN_PRIMITIVE,
  PROBLEM_TYPE_THROWN_STRING
} from '../../src/constants/ProblemConstants.js';
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
      RuntimeError.create('base'),
      RuntimeError.create('typed'),
      RuntimeError.create('combined', { 'cause': RuntimeError.create('a') }),
      { 'custom': true },
      []
    ];

    for (const input of inputs) {
      assert.doesNotThrow(() => ThrownValueEntity.intake(input));
    }
  });

  void it('classifies nullish values', () => {
    assert.deepEqual(ThrownValueEntity.intake(null), { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH });
    assert.deepEqual(ThrownValueEntity.intake(undefined), { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH });
  });

  void it('classifies a thrown string', () => {
    const result = ThrownValueEntity.intake('boom');
    assert.deepEqual(result, { 'detail': 'boom' , 'title': PROBLEM_TITLE_THROWN_STRING, 'type': PROBLEM_TYPE_THROWN_STRING });
  });

  void it('classifies a thrown primitive via String() without throwing', () => {
    assert.deepEqual(ThrownValueEntity.intake(42), { 'detail': '42' , 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE });
    assert.deepEqual(ThrownValueEntity.intake(true), { 'detail': 'true' , 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE });
    assert.deepEqual(ThrownValueEntity.intake(10n), { 'detail': '10' , 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE });

    const symbolResult = ThrownValueEntity.intake(Symbol('boom'));
    assert.equal(symbolResult.type, PROBLEM_TYPE_THROWN_PRIMITIVE);
    assert.equal(typeof symbolResult.detail, 'string');
  });

  void it('classifies a RuntimeError, reading stack when present', () => {
    const error = RuntimeError.create('failure');
    const result = ThrownValueEntity.intake(error);
    assert.equal(result.type, PROBLEM_TYPE_ERROR);
    assert.equal(result.detail, 'failure');
    assert.equal(result.name, 'RuntimeError');
    assert.equal(result.stack, error.stack);
  });

  void it('projects a RuntimeError as an error discriminant', () => {
    const error = RuntimeError.create('combined', { 'cause': RuntimeError.create('a') });
    const result = ThrownValueEntity.intake(error);
    assert.equal(result.type, PROBLEM_TYPE_ERROR);
    assert.equal(result.detail, 'combined');
  });

  void it('classifies a plain thrown object, defensively reading message/name', () => {
    const result = ThrownValueEntity.intake({ 'message': 'custom message', 'name': 'CustomName' });
    assert.deepEqual(result, { 'detail': 'custom message', 'name': 'CustomName' , 'title': PROBLEM_TITLE_THROWN_OBJECT, 'type': PROBLEM_TYPE_THROWN_OBJECT });
  });

  void it('is not fooled by a throwing message/name getter and does not itself throw', () => {
    const hostile = {
      get message(): string {
        throw RuntimeError.create('getter boom');
      },
      get name(): string {
        throw RuntimeError.create('getter boom');
      }
    };

    const result = ThrownValueEntity.intake(hostile);
    assert.deepEqual(result, { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_OBJECT, 'type': PROBLEM_TYPE_THROWN_OBJECT });
  });

  void it('does not fabricate a message for an object with no message property', () => {
    const result = ThrownValueEntity.intake({ 'other': true });
    assert.deepEqual(result, { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_OBJECT, 'type': PROBLEM_TYPE_THROWN_OBJECT });
  });

  void it('follows a cause chain and bounds it via `causes`', () => {
    const root = RuntimeError.create('root');
    const middle = RuntimeError.create('middle', { 'cause': root });
    const top = RuntimeError.create('top', { 'cause': middle });

    const result = ThrownValueEntity.intake(top);
    assert.equal(result.detail, 'top');
    assert.deepEqual(result.causes, [
      { 'detail': 'middle', 'name': 'RuntimeError' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR },
      { 'detail': 'root', 'name': 'RuntimeError' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR }
    ]);
  });

  void it('terminates immediately on a cyclic cause chain instead of looping to the depth limit', () => {
    const a = RuntimeError.create('a');
    const b = RuntimeError.create('b', { 'cause': a });
    Reflect.set(a, 'cause', b);

    const result = ThrownValueEntity.intake(a);
    assert.equal(result.detail, 'a');
    assert.deepEqual(result.causes, [{ 'detail': 'b', 'name': 'RuntimeError' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR }]);
  });

  void it('bounds an unbounded (non-cyclic) cause chain at the depth limit', () => {
    let current: RuntimeError | undefined;
    for (let index = 0; index < 100; index += 1) {
      current = RuntimeError.create(`level-${index}`, current === undefined ? undefined : { 'cause': current });
    }

    const result = ThrownValueEntity.intake(current);
    assert.ok((result.causes?.length ?? 0) <= 31);
  });

  void it('round-trips through validate', () => {
    const result = ThrownValueEntity.intake(RuntimeError.create('failure'));
    assert.equal(ThrownValueEntity.validate(result), true);
    assert.equal(ThrownValueEntity.validate({ 'kind': 'not-a-kind', 'message': '' }), false);
  });

  void it('create fills defaults without coercion and does not fabricate optional fields', () => {
    assert.deepEqual(ThrownValueEntity.create(), { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH });
    const withName = ThrownValueEntity.create({ 'detail': 'boom', 'name': 'X' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR });
    assert.deepEqual(withName, { 'detail': 'boom', 'name': 'X' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR });
    assert.equal(Object.hasOwn(withName, 'stack'), false);
  });
});
