import { PROBLEM_TITLE_ERROR, PROBLEM_TITLE_THROWN_NULLISH, PROBLEM_TITLE_THROWN_OBJECT, PROBLEM_TITLE_THROWN_PRIMITIVE, PROBLEM_TITLE_THROWN_STRING, PROBLEM_TYPE_ERROR, PROBLEM_TYPE_THROWN_NULLISH, PROBLEM_TYPE_THROWN_OBJECT, PROBLEM_TYPE_THROWN_PRIMITIVE, PROBLEM_TYPE_THROWN_STRING, ThrownValueProjection } from '@studnicky/types/browser';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ThrownValueEntity } from '../../src/entities/ThrownValueEntity.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';

class HostileErrorAccessors {
  static describe(): PropertyDescriptorMap {
    const result: PropertyDescriptorMap = {
      'cause': { 'configurable': true, 'get': HostileErrorAccessors.failWith('cause getter') },
      'message': { 'configurable': true, 'get': HostileErrorAccessors.failWith('message getter') },
      'name': { 'configurable': true, 'get': HostileErrorAccessors.failWith('name getter') },
      'stack': { 'configurable': true, 'get': HostileErrorAccessors.failWith('stack getter') }
    };
    return result;
  }

  private static failWith(label: string): () => never {
    const result = (): never => {
      throw RuntimeError.create(label);
    };
    return result;
  }
}

class ThrownValueEntitySuite {
  static declaresIsTotalNeverThrowsFor(): void {
    void it('is total: never throws for cyclic objects, functions, symbols, and caught-value shapes', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const inputs: readonly unknown[] = [
        undefined,
        null,
        'plain string',
        42,
        true,
        Symbol('boom'),
        Date.now,
        cyclic,
        10n,
        RuntimeError.create('base'),
        RuntimeError.create('typed'),
        RuntimeError.create('combined', { 'cause': RuntimeError.create('a') }),
        { 'custom': true },
        []
      ];

      for (let index = 0; index < inputs.length; index += 1) {
        const result = ThrownValueEntity.intake(inputs[index]);
        assert.equal(ThrownValueEntity.validate(result), true);
      }
    });
  }

  static declaresClassifiesNullishValues(): void {
    void it('classifies nullish values', () => {
      assert.deepEqual(ThrownValueEntity.intake(null), { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH });
      assert.deepEqual(ThrownValueEntity.intake(undefined), { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH });
    });
  }

  static declaresClassifiesAThrownString(): void {
    void it('classifies a thrown string', () => {
      const result = ThrownValueEntity.intake('boom');
      assert.deepEqual(result, { 'detail': 'boom' , 'title': PROBLEM_TITLE_THROWN_STRING, 'type': PROBLEM_TYPE_THROWN_STRING });
    });
  }

  static declaresClassifiesAThrownPrimitiveVia(): void {
    void it('classifies a thrown primitive via String() without throwing', () => {
      assert.deepEqual(ThrownValueEntity.intake(42), { 'detail': '42' , 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE });
      assert.deepEqual(ThrownValueEntity.intake(true), { 'detail': 'true' , 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE });
      assert.deepEqual(ThrownValueEntity.intake(10n), { 'detail': '10' , 'title': PROBLEM_TITLE_THROWN_PRIMITIVE, 'type': PROBLEM_TYPE_THROWN_PRIMITIVE });

      const symbolResult = ThrownValueEntity.intake(Symbol('boom'));
      assert.equal(symbolResult.type, PROBLEM_TYPE_THROWN_PRIMITIVE);
      assert.equal(typeof symbolResult.detail, 'string');
    });
  }

  static declaresClassifiesARuntimeErrorReadingStack(): void {
    void it('classifies a RuntimeError, reading stack when present', () => {
      const error = RuntimeError.create('failure');
      const result = ThrownValueEntity.intake(error);
      assert.equal(result.type, PROBLEM_TYPE_ERROR);
      assert.equal(result.detail, 'failure');
      assert.equal(result.name, 'RuntimeError');
      assert.equal(result.stack, error.stack);
    });
  }

  static declaresProjectsARuntimeErrorAsAn(): void {
    void it('projects a RuntimeError as an error discriminant', () => {
      const error = RuntimeError.create('combined', { 'cause': RuntimeError.create('a') });
      const result = ThrownValueEntity.intake(error);
      assert.equal(result.type, PROBLEM_TYPE_ERROR);
      assert.equal(result.detail, 'combined');
    });
  }

  static declaresClassifiesAPlainThrownObject(): void {
    void it('classifies a plain thrown object, defensively reading message/name', () => {
      const result = ThrownValueEntity.intake({ 'message': 'custom message', 'name': 'CustomName' });
      assert.deepEqual(result, { 'detail': 'custom message', 'name': 'CustomName' , 'title': PROBLEM_TITLE_THROWN_OBJECT, 'type': PROBLEM_TYPE_THROWN_OBJECT });
    });
  }

  static declaresIsNotFooledByA(): void {
    void it('is not fooled by a throwing message/name getter and does not itself throw', () => {
      const hostile = {
        get 'message'(): string {
          throw RuntimeError.create('getter boom');
        },
        get 'name'(): string {
          throw RuntimeError.create('getter boom');
        }
      };

      const result = ThrownValueEntity.intake(hostile);
      assert.deepEqual(result, { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_OBJECT, 'type': PROBLEM_TYPE_THROWN_OBJECT });
    });
  }

  static declaresProjectsHostileErrorAccessorsWithout(): void {
    void it('projects hostile Error accessors without throwing and stops at an unreadable cause', () => {
      const hostile = RuntimeError.create('ignored');
      Object.defineProperties(hostile, HostileErrorAccessors.describe());

      assert.doesNotThrow(() => {
        const result = ThrownValueProjection.project(hostile);
        return result;
      });
      assert.doesNotThrow(() => {
        const result = ThrownValueEntity.intake(hostile);
        return result;
      });
      assert.deepEqual(ThrownValueEntity.intake(hostile), {
        'detail': '',
        'title': PROBLEM_TITLE_ERROR,
        'type': PROBLEM_TYPE_ERROR
      });
    });
  }

  static declaresDoesNotFabricateAMessage(): void {
    void it('does not fabricate a message for an object with no message property', () => {
      const result = ThrownValueEntity.intake({ 'other': true });
      assert.deepEqual(result, { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_OBJECT, 'type': PROBLEM_TYPE_THROWN_OBJECT });
    });
  }

  static declaresFollowsACauseChainAnd(): void {
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
  }

  static declaresTerminatesImmediatelyOnACyclic(): void {
    void it('terminates immediately on a cyclic cause chain instead of looping to the depth limit', () => {
      const a = RuntimeError.create('a');
      const b = RuntimeError.create('b', { 'cause': a });
      Reflect.set(a, 'cause', b);

      const result = ThrownValueEntity.intake(a);
      assert.equal(result.detail, 'a');
      assert.deepEqual(result.causes, [{ 'detail': 'b', 'name': 'RuntimeError' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR }]);
    });
  }

  static declaresBoundsAnUnboundedNonCyclic(): void {
    void it('bounds an unbounded (non-cyclic) cause chain at the depth limit', () => {
      let current: RuntimeError | undefined;
      for (let index = 0; index < 100; index += 1) {
        current = RuntimeError.create(`level-${index}`, current === undefined ? undefined : { 'cause': current });
      }

      const result = ThrownValueEntity.intake(current);
      assert.ok((result.causes?.length ?? 0) <= 31);
    });
  }

  static declaresRoundTripsThroughValidate(): void {
    void it('round-trips through validate', () => {
      const result = ThrownValueEntity.intake(RuntimeError.create('failure'));
      assert.equal(ThrownValueEntity.validate(result), true);
      assert.equal(ThrownValueEntity.validate({ 'kind': 'not-a-kind', 'message': '' }), false);
    });
  }

  static declaresCreateFillsDefaultsWithoutCoercion(): void {
    void it('create fills defaults without coercion and does not fabricate optional fields', () => {
      assert.deepEqual(ThrownValueEntity.create(), { 'detail': '' , 'title': PROBLEM_TITLE_THROWN_NULLISH, 'type': PROBLEM_TYPE_THROWN_NULLISH });
      const withName = ThrownValueEntity.create({ 'detail': 'boom', 'name': 'X' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR });
      assert.deepEqual(withName, { 'detail': 'boom', 'name': 'X' , 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR });
      assert.equal(Object.hasOwn(withName, 'stack'), false);
    });
  }

  static declaresCreateAcceptsAPlainUnbranded(): void {
    void it('create accepts a plain unbranded literal for the maxItems-constrained causes array and validates', () => {
      const result = ThrownValueEntity.create({
        'causes': [{ 'detail': 'inner', 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR }],
        'detail': 'outer',
        'title': PROBLEM_TITLE_ERROR,
        'type': PROBLEM_TYPE_ERROR
      });
      assert.deepEqual(result.causes, [{ 'detail': 'inner', 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR }]);
      assert.equal(ThrownValueEntity.validate(result), true);
    });
  }
}

void describe('ThrownValueEntity', () => {
  ThrownValueEntitySuite.declaresIsTotalNeverThrowsFor();
  ThrownValueEntitySuite.declaresClassifiesNullishValues();
  ThrownValueEntitySuite.declaresClassifiesAThrownString();
  ThrownValueEntitySuite.declaresClassifiesAThrownPrimitiveVia();
  ThrownValueEntitySuite.declaresClassifiesARuntimeErrorReadingStack();
  ThrownValueEntitySuite.declaresProjectsARuntimeErrorAsAn();
  ThrownValueEntitySuite.declaresClassifiesAPlainThrownObject();
  ThrownValueEntitySuite.declaresIsNotFooledByA();
  ThrownValueEntitySuite.declaresProjectsHostileErrorAccessorsWithout();
  ThrownValueEntitySuite.declaresDoesNotFabricateAMessage();
  ThrownValueEntitySuite.declaresFollowsACauseChainAnd();
  ThrownValueEntitySuite.declaresTerminatesImmediatelyOnACyclic();
  ThrownValueEntitySuite.declaresBoundsAnUnboundedNonCyclic();
  ThrownValueEntitySuite.declaresRoundTripsThroughValidate();
  ThrownValueEntitySuite.declaresCreateFillsDefaultsWithoutCoercion();
  ThrownValueEntitySuite.declaresCreateAcceptsAPlainUnbranded();
});
