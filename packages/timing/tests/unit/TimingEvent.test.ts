import assert from 'node:assert/strict';
import { it } from 'node:test';

import { TIMING_STATUS } from '../../src/constants/index.js';
import { TimingBuildError } from '../../src/errors/TimingBuildError.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';

void it('returns a TimingEvent builder instance', () => {
  const builder = TimingEvent.create();

  assert.ok(builder instanceof TimingEvent);
  assert.strictEqual(typeof builder.component, 'function');
  assert.strictEqual(typeof builder.operation, 'function');
  assert.strictEqual(typeof builder.status, 'function');
  assert.strictEqual(typeof builder.build, 'function');
});

void it('sets component and returns this for chaining', () => {
  const builder = TimingEvent.create();
  const result = builder.component('GraphAdapter');

  assert.strictEqual(result, builder);
});

void it('sets operation and returns this for chaining', () => {
  const builder = TimingEvent.create();
  const result = builder.operation('query');

  assert.strictEqual(result, builder);
});

void it('sets status and returns this for chaining', () => {
  const builder = TimingEvent.create();
  const result = builder.status(TIMING_STATUS.START);

  assert.strictEqual(result, builder);
});

void it('returns TimingEventDataEntity.Type data with component.operation format', () => {
  const data = TimingEvent.create()
    .component('GraphAdapter')
    .operation('query')
    .build();

  assert.strictEqual(data.event, 'GraphAdapter.query');
});

void it('returns TimingEventDataEntity.Type with component.operation.status format', () => {
  const data = TimingEvent.create()
    .component('DatabaseAdapter')
    .operation('connect')
    .status(TIMING_STATUS.START)
    .build();

  assert.strictEqual(data.event, 'DatabaseAdapter.connect.start');
});

void it('works with TIMING_STATUS constants', () => {
  const data = TimingEvent.create()
    .component('CacheService')
    .operation('get')
    .status(TIMING_STATUS.HIT)
    .build();

  assert.strictEqual(data.event, 'CacheService.get.hit');
});

void it('returns a frozen object', () => {
  const data = TimingEvent.create()
    .component('GraphAdapter')
    .operation('query')
    .build();

  assert.ok(Object.isFrozen(data));
});

const missingFieldScenarios: Array<{ description: string; build: () => unknown; expectedField: string }> = [
  { description: 'throws TimingBuildError when component is missing', build: () => TimingEvent.create().operation('query').build(), expectedField: 'component' },
  { description: 'throws TimingBuildError when operation is missing', build: () => TimingEvent.create().component('GraphAdapter').build(), expectedField: 'operation' },
];
for (const { description, build, expectedField } of missingFieldScenarios) {
  void it(description, () => {
    assert.throws(build, (err: unknown) => err instanceof TimingBuildError && err.message.includes(expectedField));
  });
}

void it('supports fluent chaining in any order', () => {
  const data1 = TimingEvent.create()
    .component('GraphAdapter')
    .operation('query')
    .status(TIMING_STATUS.COMPLETE)
    .build();

  const data2 = TimingEvent.create()
    .status(TIMING_STATUS.COMPLETE)
    .operation('query')
    .component('GraphAdapter')
    .build();

  assert.strictEqual(data1.event, data2.event);
  assert.strictEqual(data1.event, 'GraphAdapter.query.complete');
});

void it('allows overwriting values', () => {
  const data = TimingEvent.create()
    .component('WrongService')
    .component('GraphAdapter')
    .operation('wrong')
    .operation('query')
    .build();

  assert.strictEqual(data.event, 'GraphAdapter.query');
});
