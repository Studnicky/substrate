import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { ConfigurationError } from '../../src/errors/ConfigurationError.js';
import { Timing } from '../../src/modules/Timing.js';
import { TimingBuilder } from '../../src/modules/TimingBuilder.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';

void describe('TimingBuilder', () => {
  void describe('Timing.builder()', () => {
    void it('returns a TimingBuilder instance', () => {
      const builder = Timing.builder();

      assert.ok(builder instanceof TimingBuilder);
      assert.strictEqual(typeof builder.maxEvents, 'function');
      assert.strictEqual(typeof builder.precision, 'function');
      assert.strictEqual(typeof builder.build, 'function');
    });
  });

  void describe('maxEvents()', () => {
    void it('sets maxEvents and returns this for chaining', () => {
      const builder = Timing.builder();
      const result = builder.maxEvents(100);

      assert.strictEqual(result, builder);
    });
  });

  void describe('precision()', () => {
    void it('sets precision and returns this for chaining', () => {
      const builder = Timing.builder();
      const result = builder.precision({ ms: 2 });

      assert.strictEqual(result, builder);
    });
  });

  void describe('build()', () => {
    void it('returns a Timing instance with default options', () => {
      const timing = Timing.builder().build();

      assert.ok(timing instanceof Timing);
      assert.strictEqual(typeof timing.event, 'function');
      assert.strictEqual(typeof timing.getEvents, 'function');
      assert.strictEqual(typeof timing.clear, 'function');
    });

    void it('returns a Timing instance with maxEvents configured', () => {
      const timing = Timing.builder()
        .maxEvents(3)
        .build();

      // Add events to test LRU behavior
      timing.event(TimingEvent.create().component('TestService')
        .operation('e1')
        .build());
      timing.event(TimingEvent.create().component('TestService')
        .operation('e2')
        .build());
      timing.event(TimingEvent.create().component('TestService')
        .operation('e3')
        .build());

      const events = timing.getEvents();
      const eventKeys = Object.keys(events).filter((k) => {
        return k !== 'durationMs';
      });

      // 3 events means initialize should be evicted
      assert.strictEqual(eventKeys.length, 3);
      assert.ok(events.initialize === undefined, 'initialize should be evicted');
    });

    void it('returns a Timing instance with precision configured', () => {
      const timing = Timing.builder()
        .precision({ ms: 1 })
        .build();

      timing.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      const events = timing.getEvents();

      // Check that precision is applied (at most 1 decimal place)
      const initValue = events.initialize;

      if (initValue !== undefined) {
        const valueStr = initValue.toString();
        const decimalPart = valueStr.split('.')[1];

        if (decimalPart !== undefined) {
          assert.ok(decimalPart.length <= 1, `Expected at most 1 decimal place, got ${decimalPart.length}`);
        }
      }
    });

    void it('throws ConfigurationError for invalid maxEvents', () => {
      assert.throws(
        () => {
          Timing.builder()
            .maxEvents(-1)
            .build();
        },
        ConfigurationError
      );
    });

    void it('throws ConfigurationError for invalid precision', () => {
      assert.throws(
        () => {
          Timing.builder()
            .precision({ ms: -1 })
            .build();
        },
        ConfigurationError
      );
    });
  });

  void describe('method chaining', () => {
    void it('supports fluent chaining', () => {
      const timing = Timing.builder()
        .maxEvents(100)
        .precision({ ms: 2 })
        .build();

      assert.ok(timing instanceof Timing);
    });

    void it('allows overwriting values', () => {
      const timing = Timing.builder()
        .maxEvents(5)
        .maxEvents(3)
        .build();

      // Add more events than the final maxEvents to verify it took effect
      timing.event(TimingEvent.create().component('TestService')
        .operation('e1')
        .build());
      timing.event(TimingEvent.create().component('TestService')
        .operation('e2')
        .build());
      timing.event(TimingEvent.create().component('TestService')
        .operation('e3')
        .build());

      const events = timing.getEvents();
      const eventKeys = Object.keys(events).filter((k) => {
        return k !== 'durationMs';
      });

      // Should have 3 events (maxEvents=3 took effect)
      assert.strictEqual(eventKeys.length, 3);
    });
  });
});
