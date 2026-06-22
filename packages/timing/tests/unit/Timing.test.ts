import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { DEFAULT_MAX_EVENTS, TIMING_STATUS } from '../../src/constants/index.js';
import type { TimingEventDataType } from '../../src/interfaces/TimingEventDataType.js';
import type { TimingOptionsType } from '../../src/interfaces/TimingOptionsType.js';
import { Timing } from '../../src/modules/Timing.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';

/**
 * CPU-intensive busy-wait utility using atomic process.hrtime operations.
 * Uses a busy loop instead of setTimeout to ensure deterministic timing
 * in tests without race conditions.
 */
class TestClock {
  static busyWait(ms: number): void {
    const start = process.hrtime.bigint();
    const targetNs = BigInt(ms * 1_000_000);

    while (process.hrtime.bigint() - start < targetNs) {
      // Busy loop
    }
  }
}

/**
 * Subclass that exposes protected seams for test verification.
 */
class TracedTiming extends Timing {
  public readCount = 0;
  public eventCount = 0;
  public evictCount = 0;
  public clearCount = 0;
  public lastEventData: TimingEventDataType | undefined = undefined;

  public constructor(options: TimingOptionsType = {}) {
    super(options);
  }

  protected override readHrtime(): bigint {
    this.readCount++;
    return super.readHrtime();
  }

  protected override onEvent(data: TimingEventDataType, _timestamp: bigint): void {
    this.eventCount++;
    this.lastEventData = data;
  }

  protected override onEvict(_name: string): void {
    this.evictCount++;
  }

  protected override onClear(): void {
    this.clearCount++;
  }

  public testConvertTime(ns: bigint, unit: 'ms'): number {
    return this.convertTime(ns, unit);
  }
}

void describe('Timing', () => {
  void describe('Timing.builder().build()', () => {
    void it('creates instance with expected interface', () => {
      const timer = Timing.builder().build();

      assert.ok(timer instanceof Timing);
      assert.strictEqual(typeof timer.event, 'function');
      assert.strictEqual(typeof timer.getEvents, 'function');
      assert.strictEqual(typeof timer.clear, 'function');
    });

    void it('starts timing immediately with initialize event', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(10);
      const events = timer.getEvents();

      assert.ok(events.durationMs !== undefined);
      assert.ok(events.durationMs >= 10, `Expected durationMs >= 10ms, got ${events.durationMs}ms`);
      assert.ok(events.initialize !== undefined);
      assert.ok(events.initialize >= 0);
    });

    void it('accepts configuration options via builder', () => {
      const configs = [
        () => {
          return Timing.builder().maxEvents(5)
            .build();
        },
        () => {
          return Timing.builder().precision({ ms: 2 })
            .build();
        },
        () => {
          return Timing.builder().maxEvents(10)
            .precision({ ms: 3 })
            .build();
        }
      ];

      for (const createTimer of configs) {
        const timer = createTimer();

        assert.ok(timer instanceof Timing);
      }
    });
  });

  void describe('event()', () => {
    void it('records events with component.operation format', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());

      const events = timer.getEvents();

      assert.ok(events['GraphAdapter.query'] !== undefined);
      assert.ok(events['CacheService.get'] !== undefined);
    });

    void it('records events with increasing elapsed times', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());
      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('EntityResolver')
        .operation('resolve')
        .build());

      const events = timer.getEvents();

      assert.ok(events['GraphAdapter.query'] !== undefined);
      assert.ok(events['CacheService.get'] !== undefined);
      assert.ok(events['EntityResolver.resolve'] !== undefined);
      assert.ok(events['GraphAdapter.query'] < events['CacheService.get']);
      assert.ok(events['CacheService.get'] < events['EntityResolver.resolve']);
    });

    void it('stores multiple events with the same name', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());

      const events = timer.getEvents();

      // Last occurrence wins in the output
      assert.ok(events['GraphAdapter.query'] !== undefined);
    });

    void it('records events with optional status parameter', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('DatabaseAdapter')
        .operation('connect')
        .status(TIMING_STATUS.START)
        .build());
      timer.event(TimingEvent.create().component('DatabaseAdapter')
        .operation('connect')
        .status(TIMING_STATUS.COMPLETE)
        .build());

      const events = timer.getEvents();

      assert.ok(events['DatabaseAdapter.connect.start'] !== undefined);
      assert.ok(events['DatabaseAdapter.connect.complete'] !== undefined);
    });

    void it('records events with domain-specific status', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .status(TIMING_STATUS.HIT)
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('lookup')
        .status(TIMING_STATUS.MISS)
        .build());
      timer.event(TimingEvent.create().component('MutexManager')
        .operation('acquire')
        .status(TIMING_STATUS.WAITING)
        .build());

      const events = timer.getEvents();

      assert.ok(events['CacheService.get.hit'] !== undefined);
      assert.ok(events['CacheService.lookup.miss'] !== undefined);
      assert.ok(events['MutexManager.acquire.waiting'] !== undefined);
    });

    void it('mixes events with and without status', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.event(TimingEvent.create().component('DatabaseAdapter')
        .operation('connect')
        .status(TIMING_STATUS.START)
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());
      timer.event(TimingEvent.create().component('DatabaseAdapter')
        .operation('connect')
        .status(TIMING_STATUS.COMPLETE)
        .build());

      const events = timer.getEvents();

      assert.ok(events['GraphAdapter.query'] !== undefined);
      assert.ok(events['DatabaseAdapter.connect.start'] !== undefined);
      assert.ok(events['CacheService.get'] !== undefined);
      assert.ok(events['DatabaseAdapter.connect.complete'] !== undefined);
    });

    void it('works with TIMING_STATUS constants', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('DatabaseAdapter')
        .operation('connect')
        .status(TIMING_STATUS.START)
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .status(TIMING_STATUS.HIT)
        .build());
      timer.event(TimingEvent.create().component('MutexManager')
        .operation('acquire')
        .status(TIMING_STATUS.ACQUIRED)
        .build());
      timer.event(TimingEvent.create().component('DatabaseAdapter')
        .operation('connect')
        .status(TIMING_STATUS.COMPLETE)
        .build());

      const events = timer.getEvents();

      assert.ok(events['DatabaseAdapter.connect.start'] !== undefined);
      assert.ok(events['CacheService.get.hit'] !== undefined);
      assert.ok(events['MutexManager.acquire.acquired'] !== undefined);
      assert.ok(events['DatabaseAdapter.connect.complete'] !== undefined);
    });
  });

  void describe('LRU cache behavior', () => {
    void it('evicts oldest events when maxEvents exceeded', () => {
      const timer = Timing.builder().maxEvents(3)
        .build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());
      timer.event(TimingEvent.create().component('EntityResolver')
        .operation('resolve')
        .build());

      const events = timer.getEvents();
      const eventKeys = Object.keys(events).filter((k) => {
        return k !== 'durationMs';
      });

      assert.strictEqual(eventKeys.length, 3);
      assert.ok(events.initialize === undefined, 'initialize should be evicted');
      assert.ok(events['GraphAdapter.query'] !== undefined);
      assert.ok(events['CacheService.get'] !== undefined);
      assert.ok(events['EntityResolver.resolve'] !== undefined);
    });

    void it('maintains most recent events across various limits', () => {
      const testCases = [
        {
          expected: [
            'CacheService.get',
            'EntityResolver.resolve'
          ],
          maxEvents: 2
        },
        {
          expected: ['EntityResolver.resolve'],
          maxEvents: 1
        }
      ];

      for (const {
        expected, maxEvents
      } of testCases) {
        const timer = Timing.builder().maxEvents(maxEvents)
          .build();

        timer.event(TimingEvent.create().component('GraphAdapter')
          .operation('query')
          .build());
        timer.event(TimingEvent.create().component('GraphAdapter')
          .operation('insert')
          .build());
        timer.event(TimingEvent.create().component('CacheService')
          .operation('get')
          .build());
        timer.event(TimingEvent.create().component('EntityResolver')
          .operation('resolve')
          .build());

        const events = timer.getEvents();
        const eventKeys = Object.keys(events).filter((k) => {
          return k !== 'durationMs';
        });

        assert.strictEqual(eventKeys.length, maxEvents);

        for (const eventName of expected) {
          assert.ok(events[eventName] !== undefined, `${eventName} should exist`);
        }
      }
    });

    void it('defaults to no limit when maxEvents not specified', () => {
      const timer = Timing.builder().build();

      for (let i = 0; i < 1000; i++) {
        timer.event(TimingEvent.create().component('TestService')
          .operation(`event-${i}`)
          .build());
      }

      const events = timer.getEvents();
      const eventKeys = Object.keys(events).filter((k) => {
        return k !== 'durationMs';
      });

      // 1000 events + initialize
      assert.strictEqual(eventKeys.length, 1001);
      assert.ok(events.initialize !== undefined);
      assert.ok(events['TestService.event-0'] !== undefined);
      assert.ok(events['TestService.event-999'] !== undefined);
    });
  });

  void describe('getEvents()', () => {
    void it('returns events with only initialize event initially', () => {
      const timer = Timing.builder().build();
      const events = timer.getEvents();

      assert.strictEqual(typeof events.durationMs, 'number');
      assert.ok(typeof events === 'object');

      const eventKeys = Object.keys(events).filter((k) => {
        return k !== 'durationMs';
      });

      assert.strictEqual(eventKeys.length, 1);
      assert.ok(events.initialize !== undefined);
    });

    void it('continues tracking after getEvents() call', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(10);
      const events1 = timer.getEvents();

      TestClock.busyWait(10);
      const events2 = timer.getEvents();

      assert.ok(events1.durationMs !== undefined);
      assert.ok(events2.durationMs !== undefined);
      assert.ok(events2.durationMs > events1.durationMs);
    });

    void it('returns new object on each call', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      const events1 = timer.getEvents();
      const events2 = timer.getEvents();

      assert.notStrictEqual(events1, events2);
    });

    void it('includes events added after previous call', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      const events1 = timer.getEvents();

      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());
      const events2 = timer.getEvents();

      const keys1 = Object.keys(events1).filter((k) => {
        return k !== 'durationMs';
      });
      const keys2 = Object.keys(events2).filter((k) => {
        return k !== 'durationMs';
      });

      assert.ok(keys2.length > keys1.length);
      assert.ok(events2['CacheService.get'] !== undefined);
    });

    void it('returns JSON-serializable object', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());

      const events = timer.getEvents();
      const parsed = structuredClone(events);

      assert.ok(typeof parsed.durationMs === 'number');
      assert.ok(typeof parsed['GraphAdapter.query'] === 'number');
    });

    void it('includes durationMs for total elapsed time', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(10);
      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());

      const events = timer.getEvents();

      assert.ok(events.durationMs !== undefined);
      assert.ok(events.durationMs >= 10);
    });
  });

  void describe('clear()', () => {
    void it('clears all events and allows new ones', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());

      const beforeClear = timer.getEvents();
      const keysBeforeClear = Object.keys(beforeClear).filter((k) => {
        return k !== 'durationMs';
      });

      assert.ok(keysBeforeClear.length >= 2);

      timer.clear();

      const afterClear = timer.getEvents();
      const keysAfterClear = Object.keys(afterClear).filter((k) => {
        return k !== 'durationMs';
      });

      assert.strictEqual(keysAfterClear.length, 0);

      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('EntityResolver')
        .operation('resolve')
        .build());
      const afterAdd = timer.getEvents();
      const keysAfterAdd = Object.keys(afterAdd).filter((k) => {
        return k !== 'durationMs';
      });

      assert.strictEqual(keysAfterAdd.length, 1);
      assert.ok(afterAdd['EntityResolver.resolve'] !== undefined);
    });

    void it('does not reset the start time', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(10);
      const beforeClear = timer.getEvents();

      timer.clear();
      TestClock.busyWait(10);
      const afterClear = timer.getEvents();

      assert.ok(beforeClear.durationMs !== undefined);
      assert.ok(afterClear.durationMs !== undefined);
      assert.ok(afterClear.durationMs > beforeClear.durationMs);
    });

    void it('can be called multiple times', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.clear();
      timer.clear();
      timer.clear();

      const events = timer.getEvents();
      const eventKeys = Object.keys(events).filter((k) => {
        return k !== 'durationMs';
      });

      assert.strictEqual(eventKeys.length, 0);
    });
  });

  void describe('Multi-stage operations', () => {
    void it('tracks stages with cumulative timing', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('WorkflowService')
        .operation('stage1')
        .build());
      TestClock.busyWait(10);
      timer.event(TimingEvent.create().component('WorkflowService')
        .operation('stage2')
        .build());
      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('WorkflowService')
        .operation('stage3')
        .build());
      TestClock.busyWait(5);
      timer.event(TimingEvent.create().component('WorkflowService')
        .operation('stage4')
        .build());

      const events = timer.getEvents();

      assert.ok(events['WorkflowService.stage1'] !== undefined);
      assert.ok(events['WorkflowService.stage2'] !== undefined);
      assert.ok(events['WorkflowService.stage3'] !== undefined);
      assert.ok(events.durationMs !== undefined);
      assert.ok(events['WorkflowService.stage1'] >= 5);
      assert.ok(events['WorkflowService.stage2'] >= 15);
      assert.ok(events['WorkflowService.stage3'] >= 20);
      assert.ok(events.durationMs >= 25);
    });
  });

  void describe('Edge cases', () => {
    void it('handles immediate operations after creation', () => {
      const timer = Timing.builder().build();

      const events = timer.getEvents();

      assert.ok(events.durationMs !== undefined);
      assert.ok(events.durationMs >= 0);
      assert.ok(events.durationMs < 5);

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      const events2 = timer.getEvents();

      assert.ok(events2['GraphAdapter.query'] !== undefined);
      assert.ok(events2['GraphAdapter.query'] < 5);
    });

    void it('handles very small time intervals with non-negative values', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());
      timer.event(TimingEvent.create().component('EntityResolver')
        .operation('resolve')
        .build());

      const events = timer.getEvents();

      for (const elapsed of Object.values(events)) {
        assert.ok(elapsed >= 0);
      }
    });

    void it('provides high-resolution timing', () => {
      const timer = Timing.builder().build();

      TestClock.busyWait(1);
      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());

      const events = timer.getEvents();

      assert.ok(events['GraphAdapter.query'] !== undefined);
      assert.ok(Number.isFinite(events['GraphAdapter.query']));
      assert.ok(events['GraphAdapter.query'] >= 1);
    });
  });

  void describe('Logging context integration', () => {
    void it('produces output suitable for LogBody.context()', () => {
      const timer = Timing.builder().build();

      timer.event(TimingEvent.create().component('GraphAdapter')
        .operation('query')
        .build());
      timer.event(TimingEvent.create().component('CacheService')
        .operation('get')
        .build());

      const ctx = timer.getEvents();

      // Should have hierarchical event names
      assert.ok(ctx['GraphAdapter.query'] !== undefined);
      assert.ok(ctx['CacheService.get'] !== undefined);
      assert.ok(ctx.durationMs !== undefined);

      // All values should be numbers
      for (const value of Object.values(ctx)) {
        assert.strictEqual(typeof value, 'number');
      }
    });
  });

  void describe('subclass extension seams', () => {
    void it('readHrtime is called during event()', () => {
      const traced = new TracedTiming({});
      const countBefore = traced.readCount;

      traced.event(TimingEvent.create().component('TestService')
        .operation('probe')
        .build());

      assert.ok(traced.readCount > countBefore, 'readHrtime should be called during event()');
    });

    void it('onEvent hook is called with the event data', () => {
      const traced = new TracedTiming({});

      assert.strictEqual(traced.eventCount, 0);

      traced.event(TimingEvent.create().component('TestService')
        .operation('probe')
        .build());

      assert.strictEqual(traced.eventCount, 1);
      assert.ok(traced.lastEventData !== undefined);
      assert.strictEqual(traced.lastEventData.event, 'TestService.probe');
    });

    void it('onEvict hook is called when maxEvents is exceeded', () => {
      // maxEvents: 2 means the cache holds the 'initialize' event + 1 explicit event.
      // Adding a second explicit event forces an eviction.
      const traced = new TracedTiming({ maxEvents: 2 });

      assert.strictEqual(traced.evictCount, 0);

      traced.event(TimingEvent.create().component('TestService')
        .operation('first')
        .build());

      // Cache is now at capacity (initialize + first = 2). Next add triggers eviction.
      traced.event(TimingEvent.create().component('TestService')
        .operation('second')
        .build());

      assert.ok(traced.evictCount > 0, 'onEvict should be called when cache overflows');
    });

    void it('onClear hook is called when clear() is invoked', () => {
      const traced = new TracedTiming({});

      assert.strictEqual(traced.clearCount, 0);

      traced.clear();

      assert.strictEqual(traced.clearCount, 1);
    });

    void it('_maxEvents and _startTime are accessible from subclass', () => {
      const traced = new TracedTiming({ maxEvents: 42 });

      assert.strictEqual(traced._maxEvents, 42);
      assert.strictEqual(typeof traced._startTime, 'bigint');
    });

    void it('_maxEvents defaults to DEFAULT_MAX_EVENTS when not specified', () => {
      const traced = new TracedTiming({});

      assert.strictEqual(traced._maxEvents, DEFAULT_MAX_EVENTS);
    });

    void it('convertTime is accessible from subclass and converts correctly', () => {
      const traced = new TracedTiming({});

      // 1,000,000 ns == 1 ms
      const result = traced.testConvertTime(1_000_000n, 'ms');

      assert.strictEqual(result, 1);
    });
  });
});
