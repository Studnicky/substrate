import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { LruCacheOptionsEntity } from '../../src/entities/LruCacheOptionsEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { CacheConfigError } from '../../src/errors/CacheConfigError.js';
import { LruCache } from '../../src/LruCache.js';
import { LruCacheScenarioCaseEntity } from './entities/LruCacheScenarioCaseEntity.js';
import scenarioGroups from './LruCache.scenarios.json' with { 'type': 'json' };

class RecordingCache extends LruCache<string, number> {
  readonly log: (| { 'count': number; 'event': 'clear'; }
    | { 'event': 'delete'; 'key': string }
    | { 'event': 'evict'; 'key': string; 'reason': 'capacity' }
    | { 'event': 'expire'; 'key': string }
    | { 'event': 'hit'; 'key': string; 'value': number }
    | { 'event': 'miss'; 'key': string }
    | { 'event': 'set'; 'key': string }
    | { 'event': 'stale'; 'key': string; 'value': number }
    | { 'event': 'update'; 'key': string })[] = [];

  constructor(config: LruCacheOptionsEntity.InputType) {
    super(config);
  }

  protected override onHit(key: string, value: number): void {
    this.log.push({ 'event': 'hit', 'key': key, 'value': value });
  }

  protected override onStale(key: string, value: number): void {
    this.log.push({ 'event': 'stale', 'key': key, 'value': value });
  }

  protected override onMiss(key: string): void {
    this.log.push({ 'event': 'miss', 'key': key });
  }

  protected override onSet(key: string): void {
    this.log.push({ 'event': 'set', 'key': key });
  }

  protected override onUpdate(key: string): void {
    this.log.push({ 'event': 'update', 'key': key });
  }

  protected override onEvict(key: string, reason: 'capacity'): void {
    this.log.push({ 'event': 'evict', 'key': key, 'reason': reason });
  }

  protected override onExpire(key: string): void {
    this.log.push({ 'event': 'expire', 'key': key });
  }

  protected override onDelete(key: string): void {
    this.log.push({ 'event': 'delete', 'key': key });
  }

  protected override onClear(count: number): void {
    this.log.push({ 'count': count, 'event': 'clear' });
  }
}

class LruCacheRunners {
  static 'clear-empties-cache'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'clear-empties-cache'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue)
    );
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue)
    );
    cache.clear();
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
    assert.strictEqual(
      cache.get(String(scenarioCase.input.firstKey)),
      scenarioCase.expected.firstValue ?? undefined
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.input.secondKey)),
      scenarioCase.expected.secondValue ?? undefined
    );
  }

  static 'delete-existing'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'delete-existing'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.delete(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.deleted)
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      scenarioCase.expected.value ?? undefined
    );
  }

  static 'delete-missing'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'delete-missing'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    assert.strictEqual(
      cache.delete(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.deleted)
    );
  }

  static 'delete-where-empty'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'delete-where-empty'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    const removed = cache.deleteWhere(() => {
      const matches = Boolean(scenarioCase.expected.matchPredicate);
      return matches;
    });
    assert.strictEqual(removed, Number(scenarioCase.expected.removed));
  }

  static 'delete-where-matches'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'delete-where-matches'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    for (const pair of scenarioCase.input.entries) {
      cache.set(String(pair[0]), Number(pair[1]));
    }
    cache.log.length = 0;
    const removed = cache.deleteWhere((_key, value) => {
      const matches = Boolean(
        scenarioCase.expected.matchPredicate ? value % 2 === 1 : false
      );
      return matches;
    });
    assert.strictEqual(removed, Number(scenarioCase.expected.removed));
    assert.strictEqual(
      cache.has(String(scenarioCase.expected.hasAKey)),
      Boolean(scenarioCase.expected.hasA)
    );
    assert.strictEqual(
      cache.has(String(scenarioCase.expected.hasBKey)),
      Boolean(scenarioCase.expected.hasB)
    );
    assert.strictEqual(
      cache.has(String(scenarioCase.expected.hasCKey)),
      Boolean(scenarioCase.expected.hasC)
    );
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
    const deleteEvents = cache.log.filter((entry) => {
      const matches = entry.event === 'delete';
      return matches;
    });
    assert.strictEqual(
      deleteEvents.length,
      Number(scenarioCase.expected.deleteCount)
    );
  }

  static 'delete-where-none'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'delete-where-none'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    for (const pair of scenarioCase.input.entries) {
      cache.set(String(pair[0]), Number(pair[1]));
    }
    cache.log.length = 0;
    const removed = cache.deleteWhere((_key, value) => {
      const isOdd = value % 2 === 1;
      return isOdd;
    });
    assert.strictEqual(removed, Number(scenarioCase.expected.removed));
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
  }

  static 'entry-ttl-overrides-global'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'entry-ttl-overrides-global'>): Promise<void> {
    const cache = LruCacheRunners.createCache<string, string>(scenarioCase);
    cache.set(
      String(scenarioCase.input.shortKey),
      String(scenarioCase.input.shortValue),
      { 'ttlMs': Number(scenarioCase.input.shortTtlMs) }
    );
    cache.set(
      String(scenarioCase.input.longKey),
      String(scenarioCase.input.longValue)
    );
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(
          cache.get(String(scenarioCase.input.shortKey)),
          scenarioCase.expected.shortValue ?? undefined
        );
        assert.strictEqual(
          cache.get(String(scenarioCase.input.longKey)),
          String(scenarioCase.expected.longValue)
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static 'evict-correct-key'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'evict-correct-key'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.lruKey),
      Number(scenarioCase.input.lruValue)
    );
    cache.log.length = 0;
    cache.set(
      String(scenarioCase.input.newKey),
      Number(scenarioCase.input.newValue)
    );
    const evictEvents = cache.log.filter((entry) => {
      const matches = entry.event === 'evict';
      return matches;
    });
    assert.strictEqual(
      evictEvents.length,
      Number(scenarioCase.expected.evictCount)
    );
    if (evictEvents[0]?.event === 'evict') {
      assert.strictEqual(
        evictEvents[0].key,
        String(scenarioCase.expected.evictKey)
      );
    }
  }

  static 'get-missing'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'get-missing'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      scenarioCase.expected.value ?? undefined
    );
  }

  static 'hard-expiry-wins'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'hard-expiry-wins'>): Promise<void> {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, scenarioCase.expected.value ?? undefined);
        assert.deepStrictEqual(
          cache.log[0],
          scenarioCase.expected.firstLogEntry
        );
        assert.deepStrictEqual(
          cache.log[1],
          scenarioCase.expected.secondLogEntry
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static 'has-existing'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'has-existing'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.has(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.has)
    );
  }

  static 'has-missing'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'has-missing'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    assert.strictEqual(
      cache.has(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.has)
    );
  }

  static 'invalid-options'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'invalid-options'>): void {
    assert.throws(
      () => {
        LruCacheRunners.createCache<string, number>(scenarioCase);
      },
      CacheConfigError
    );
  }

  static 'lru-evicts-tail'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'lru-evicts-tail'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    for (const pair of scenarioCase.input.entries) {
      cache.set(String(pair[0]), Number(pair[1]));
    }
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.evictedKey)),
      scenarioCase.expected.evictedValue ?? undefined
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.keptKey)),
      Number(scenarioCase.expected.keptValue)
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.newKey)),
      Number(scenarioCase.expected.newValue)
    );
  }

  static 'lru-promotes-accessed-entry'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'lru-promotes-accessed-entry'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue)
    );
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue)
    );
    cache.get(String(scenarioCase.input.promoteKey));
    cache.set(
      String(scenarioCase.input.thirdKey),
      Number(scenarioCase.input.thirdValue)
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.keptKey)),
      Number(scenarioCase.expected.keptValue)
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.evictedKey)),
      scenarioCase.expected.evictedValue ?? undefined
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.newKey)),
      Number(scenarioCase.expected.newValue)
    );
  }

  static 'no-stale-ms-uses-hit'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'no-stale-ms-uses-hit'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    cache.get(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'object-key-identity'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'object-key-identity'>): void {
    const cache = LruCacheRunners.createCache<object, number>(scenarioCase);
    const { keyA, keyB } = scenarioCase.input;
    cache.set(keyA, Number(scenarioCase.input.valueA));
    cache.set(keyB, Number(scenarioCase.input.valueB));
    assert.strictEqual(cache.get(keyA), Number(scenarioCase.expected.valueA));
    assert.strictEqual(cache.get(keyB), Number(scenarioCase.expected.valueB));
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
  }

  static 'on-clear'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-clear'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    for (const pair of scenarioCase.input.entries) {
      cache.set(String(pair[0]), Number(pair[1]));
    }
    cache.log.length = 0;
    cache.clear();
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'on-clear-empty'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-clear-empty'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.clear();
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'on-delete'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-delete'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    cache.delete(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'on-delete-absent'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-delete-absent'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.delete(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
  }

  static 'on-evict'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-evict'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue)
    );
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue)
    );
    cache.log.length = 0;
    cache.set(
      String(scenarioCase.input.thirdKey),
      Number(scenarioCase.input.thirdValue)
    );
    const evictEvents = cache.log.filter((entry) => {
      const matches = entry.event === 'evict';
      return matches;
    });
    assert.strictEqual(
      evictEvents.length,
      Number(scenarioCase.expected.evictCount)
    );
    assert.deepStrictEqual(evictEvents[0], scenarioCase.expected.evictEntry);
  }

  static 'on-expire-and-on-miss'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-expire-and-on-miss'>): Promise<void> {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { 'ttlMs': Number(scenarioCase.input.ttlMs) }
    );
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, scenarioCase.expected.value ?? undefined);
        assert.strictEqual(
          cache.log.length,
          Number(scenarioCase.expected.logLength)
        );
        assert.deepStrictEqual(
          cache.log[0],
          scenarioCase.expected.firstLogEntry
        );
        assert.deepStrictEqual(
          cache.log[1],
          scenarioCase.expected.secondLogEntry
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static 'on-expire-with-has'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-expire-with-has'>): Promise<void> {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { 'ttlMs': Number(scenarioCase.input.ttlMs) }
    );
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const present = cache.has(String(scenarioCase.input.key));
        assert.strictEqual(present, Boolean(scenarioCase.expected.present));
        const expireEvents = cache.log.filter((entry) => {
          const matches = entry.event === 'expire';
          return matches;
        });
        assert.strictEqual(
          expireEvents.length,
          Number(scenarioCase.expected.expireCount)
        );
        assert.deepStrictEqual(
          expireEvents[0],
          scenarioCase.expected.expireEntry
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static 'on-hit'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-hit'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    cache.get(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'on-miss'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-miss'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.get(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'on-set'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-set'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'on-update'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'on-update'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.firstValue)
    );
    cache.log.length = 0;
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.secondValue)
    );
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength)
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  }

  static 'per-call-stale-override'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'per-call-stale-override'>): Promise<void> {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { 'staleMs': Number(scenarioCase.input.staleMs) }
    );
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, Number(scenarioCase.expected.value));
        assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static 'set-get'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'set-get'>): void {
    const cache = LruCacheRunners.createCache<string, string>(scenarioCase);
    cache.set(String(scenarioCase.input.key), String(scenarioCase.input.value));
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      String(scenarioCase.expected.value)
    );
  }

  static 'set-vs-update'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'set-vs-update'>): void {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.firstValue)
    );
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.secondValue)
    );
    const sets = cache.log.filter((entry) => {
      const matches = entry.event === 'set';
      return matches;
    });
    const updates = cache.log.filter((entry) => {
      const matches = entry.event === 'update';
      return matches;
    });
    assert.strictEqual(sets.length, Number(scenarioCase.expected.setCount));
    assert.strictEqual(
      updates.length,
      Number(scenarioCase.expected.updateCount)
    );
  }

  static 'size-reflects-entry-count'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'size-reflects-entry-count'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    const { sizes } = scenarioCase.expected;
    if (sizes === undefined) {
      throw RuntimeError.create(
        `Expected sizes are required for scenario ${scenarioCase.name}`
      );
    }
    const [emptySize, firstSize, secondSize, afterDeleteSize] = sizes;
    if (
      emptySize === undefined ||
      firstSize === undefined ||
      secondSize === undefined ||
      afterDeleteSize === undefined
    ) {
      throw RuntimeError.create(
        `Invalid sizes number array for scenario ${scenarioCase.name}`
      );
    }

    assert.strictEqual(cache.size, emptySize);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue)
    );
    assert.strictEqual(cache.size, firstSize);
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue)
    );
    assert.strictEqual(cache.size, secondSize);
    cache.delete(String(scenarioCase.input.firstKey));
    assert.strictEqual(cache.size, afterDeleteSize);
  }

  static 'stale-before-expiry'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'stale-before-expiry'>): Promise<void> {
    const cache = LruCacheRunners.createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, Number(scenarioCase.expected.value));
        assert.strictEqual(
          cache.log.length,
          Number(scenarioCase.expected.logLength)
        );
        assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static 'throwing-on-expire'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'throwing-on-expire'>): Promise<void> {
    const { expected, input } = scenarioCase;
    class ThrowingExpireCache extends LruCache<string, number> {
      constructor(config: LruCacheOptionsEntity.InputType) {
        super(config);
      }

      protected override onExpire(): void {
        throw RuntimeError.create(input.throwMessage);
      }
    }

    const cache = new ThrowingExpireCache(input.cache);
    cache.set(input.key, input.value, { 'ttlMs': input.ttlMs });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(cache.get(input.key), expected.value ?? undefined);
        assert.strictEqual(cache.has(input.key), false);
        assert.strictEqual(cache.size, expected.size);
        resolve();
      }, input.waitMs);
    });
  }

  static 'throwing-on-hit'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'throwing-on-hit'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingHitCache extends LruCache<string, number> {
      hitCount = 0;

      constructor(config: LruCacheOptionsEntity.InputType) {
        super(config);
      }

      protected override onHit(): void {
        this.hitCount += 1;
        throw RuntimeError.create(input.throwMessage);
      }
    }

    const cache = new ThrowingHitCache(input.cache);
    cache.set(input.keyA, input.valueA);
    cache.set(input.keyB, input.valueB);
    assert.strictEqual(cache.get(input.keyA), expected.afterGetA);
    cache.set(input.keyC, input.valueC);
    assert.strictEqual(cache.get(input.keyA), expected.afterGetA);
    assert.strictEqual(cache.get(expected.missingKey), undefined);
    assert.strictEqual(cache.hitCount, expected.hitCount);
  }

  static 'throwing-on-update'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'throwing-on-update'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingUpdateCache extends LruCache<string, number> {
      constructor(config: LruCacheOptionsEntity.InputType) {
        super(config);
      }

      protected override onUpdate(): void {
        throw RuntimeError.create(input.throwMessage);
      }
    }

    const cache = new ThrowingUpdateCache(input.cache);
    cache.set(input.key, input.firstValue);
    cache.set(input.key, input.secondValue);
    assert.strictEqual(cache.get(input.key), expected.value);
  }

  static 'ttl-before-expiry'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'ttl-before-expiry'>): void {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      Number(scenarioCase.expected.value)
    );
  }

  static 'ttl-expires-after-delay'(scenarioCase: ScenarioCaseOfType<LruCacheScenarioCaseEntity.Type, 'ttl-expires-after-delay'>): Promise<void> {
    const cache = LruCacheRunners.createCache<string, number>(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { 'ttlMs': Number(scenarioCase.input.ttlMs) }
    );
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(
          cache.get(String(scenarioCase.input.key)),
          scenarioCase.expected.value ?? undefined
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  }

  static declaresInjectedClockExpiry(): void {
    void it('uses an injected clock for expiration', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const clock = VirtualClockProvider.create(counter);
      const cache = LruCache.create<string, number>({ 'capacity': 1, 'ttlMs': 10 }, { 'clock': clock });

      cache.set('entry', 1);
      counter.advance(11);

      assert.equal(cache.get('entry'), undefined);
    });
  }

  private static createCache<K, V>(scenarioCase: LruCacheScenarioCaseEntity.Type): LruCache<K, V> {
    const cache = LruCache.create<K, V>(scenarioCase.input.cache);
    return cache;
  }

  private static createRecordingCache(scenarioCase: LruCacheScenarioCaseEntity.Type): RecordingCache {
    const cache = new RecordingCache(scenarioCase.input.cache);
    return cache;
  }
}

ScenarioSuite.register({
  'entity': LruCacheScenarioCaseEntity,
  'extraTests': LruCacheRunners.declaresInjectedClockExpiry,
  'file': scenarioGroups,
  'name': 'LruCache',
  'runners': LruCacheRunners
});
