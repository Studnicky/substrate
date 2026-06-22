import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { TIMING_STATUS } from '../../src/constants/index.js';
import { TimingBuildError } from '../../src/errors/TimingBuildError.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';

void describe('TimingEvent', () => {
  void describe('TimingEvent.create()', () => {
    void it('returns a TimingEvent builder instance', () => {
      const builder = TimingEvent.create();

      assert.ok(builder instanceof TimingEvent);
      assert.strictEqual(typeof builder.component, 'function');
      assert.strictEqual(typeof builder.operation, 'function');
      assert.strictEqual(typeof builder.status, 'function');
      assert.strictEqual(typeof builder.build, 'function');
    });
  });

  void describe('component()', () => {
    void it('sets component and returns this for chaining', () => {
      const builder = TimingEvent.create();
      const result = builder.component('GraphAdapter');

      assert.strictEqual(result, builder);
    });
  });

  void describe('operation()', () => {
    void it('sets operation and returns this for chaining', () => {
      const builder = TimingEvent.create();
      const result = builder.operation('query');

      assert.strictEqual(result, builder);
    });
  });

  void describe('status()', () => {
    void it('sets status and returns this for chaining', () => {
      const builder = TimingEvent.create();
      const result = builder.status(TIMING_STATUS.START);

      assert.strictEqual(result, builder);
    });
  });

  void describe('build()', () => {
    void it('returns TimingEventDataType with component.operation format', () => {
      const data = TimingEvent.create()
        .component('GraphAdapter')
        .operation('query')
        .build();

      assert.strictEqual(data.event, 'GraphAdapter.query');
    });

    void it('returns TimingEventDataType with component.operation.status format', () => {
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

    void it('throws TimingBuildError when component is missing', () => {
      assert.throws(
        () => {
          TimingEvent.create()
            .operation('query')
            .build();
        },
        TimingBuildError
      );
    });

    void it('throws TimingBuildError when operation is missing', () => {
      assert.throws(
        () => {
          TimingEvent.create()
            .component('GraphAdapter')
            .build();
        },
        TimingBuildError
      );
    });

    void it('throws TimingBuildError with descriptive message for missing component', () => {
      try {
        TimingEvent.create()
          .operation('query')
          .build();
        assert.fail('Expected TimingBuildError to be thrown');
      } catch (error) {
        assert.ok(error instanceof TimingBuildError);
        assert.ok(error.message.includes('component'));
      }
    });

    void it('throws TimingBuildError with descriptive message for missing operation', () => {
      try {
        TimingEvent.create()
          .component('GraphAdapter')
          .build();
        assert.fail('Expected TimingBuildError to be thrown');
      } catch (error) {
        assert.ok(error instanceof TimingBuildError);
        assert.ok(error.message.includes('operation'));
      }
    });
  });

  void describe('method chaining', () => {
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
  });
});
