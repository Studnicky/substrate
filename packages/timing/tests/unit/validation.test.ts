import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import {
  ConfigurationError, Timing
} from '../../src/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';

void describe('Configuration Validation', () => {
  void describe('maxEvents validation', () => {
    void it('accepts valid maxEvents values', () => {
      const validValues = [
        1,
        10,
        1000,
        Infinity
      ];

      for (const maxEvents of validValues) {
        assert.doesNotThrow(() => {
          Timing.builder().maxEvents(maxEvents)
            .build();
        });
      }

      // Test omitted maxEvents (defaults to no limit)
      assert.doesNotThrow(() => {
        Timing.builder().build();
      });
    });

    void it('rejects invalid maxEvents values', () => {
      const invalidValues = [
        {
          description: 'non-integer',
          value: 10.5
        },
        {
          description: 'zero',
          value: 0
        },
        {
          description: 'negative',
          value: -1
        },
        {
          description: 'NaN',
          value: Number.NaN
        },
        {
          description: 'string',
          value: 'not-a-number'
        }
      ];

      for (const {
        description, value
      } of invalidValues) {
        assert.throws(
          () => {
            // @ts-expect-error - Testing runtime validation
            Timing.builder().maxEvents(value)
              .build();
          },
          ConfigurationError,
          `Should reject ${description}`
        );
      }
    });
  });

  void describe('precision validation', () => {
    void it('accepts valid precision configurations', () => {
      const validConfigs = [
        {
          ms: 2,
          s: 4
        },
        {}
      ];

      for (const precision of validConfigs) {
        assert.doesNotThrow(() => {
          Timing.builder().precision(precision)
            .build();
        });
      }

      // Test omitted precision (defaults to standard precision)
      assert.doesNotThrow(() => {
        Timing.builder().build();
      });
    });

    void it('rejects non-object precision', () => {
      assert.throws(() => {
        // @ts-expect-error - Testing runtime validation
        Timing.builder().precision('not-an-object')
          .build();
      }, ConfigurationError);
    });

    void it('rejects invalid precision values', () => {
      const invalidPrecisions = [
        {
          description: 'string',
          value: 'not-a-number'
        },
        {
          description: 'float',
          value: 2.5
        },
        {
          description: 'negative',
          value: -1
        },
        {
          description: 'too large (>20)',
          value: 21
        }
      ];

      for (const {
        description, value
      } of invalidPrecisions) {
        assert.throws(
          () => {
            // @ts-expect-error - Testing runtime validation
            Timing.builder().precision({ ms: value })
              .build();
          },
          ConfigurationError,
          `Should reject ${description}`
        );
      }
    });

    void it('rejects invalid time units in precision', () => {
      assert.throws(() => {
        Timing.builder().precision({
          // @ts-expect-error - Testing runtime validation
          invalid: 2
        })
          .build();
      }, ConfigurationError);
    });

    void it('applies precision with custom configuration', () => {
      const timer = Timing.builder().precision({ ms: 1 })
        .build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      const events = timer.getEvents();

      assert.ok(events.initialize !== undefined);

      const valueStr = events.initialize.toString();
      const decimalPart = valueStr.split('.')[1];

      if (decimalPart !== undefined) {
        assert.ok(decimalPart.length <= 1, `Expected at most 1 decimal place, got ${decimalPart.length}`);
      }
    });
  });

  void describe('combined validation', () => {
    void it('accepts valid configuration with all options', () => {
      assert.doesNotThrow(() => {
        Timing.builder()
          .maxEvents(100)
          .precision({ ms: 2 })
          .build();
      });
    });

    void it('applies defaults when options not provided', () => {
      const timer = Timing.builder().build();
      const events = timer.getEvents();

      assert.ok(events.initialize !== undefined);
    });
  });
});
