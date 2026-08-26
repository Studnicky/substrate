import assert from "node:assert/strict";
import { describe, it } from "node:test";

import scenarioGroups from "./LruCache.scenarios.json" with { type: "json" };

import { CacheConfigError } from "../../src/errors/CacheConfigError.js";
import { LruCacheOptionsEntity } from "../../src/entities/LruCacheOptionsEntity.js";
import { LruCache } from "../../src/LruCache.js";

type ScenarioShape =
  | "clear-empties-cache"
  | "delete-existing"
  | "delete-missing"
  | "delete-where-empty"
  | "delete-where-matches"
  | "delete-where-none"
  | "entry-ttl-overrides-global"
  | "evict-correct-key"
  | "get-missing"
  | "hard-expiry-wins"
  | "has-existing"
  | "has-missing"
  | "invalid-options"
  | "lru-evicts-tail"
  | "lru-promotes-accessed-entry"
  | "no-stale-ms-uses-hit"
  | "object-key-identity"
  | "on-clear"
  | "on-clear-empty"
  | "on-delete"
  | "on-delete-absent"
  | "on-evict"
  | "on-expire-and-on-miss"
  | "on-expire-with-has"
  | "on-hit"
  | "on-miss"
  | "on-set"
  | "on-update"
  | "per-call-stale-override"
  | "set-get"
  | "set-vs-update"
  | "size-reflects-entry-count"
  | "stale-before-expiry"
  | "throwing-on-expire"
  | "throwing-on-hit"
  | "throwing-on-update"
  | "ttl-before-expiry"
  | "ttl-expires-after-delay";

type BaseScenarioCase<Shape extends ScenarioShape> = {
  description: string;
  expected: { sizes?: number[] } & Record<string, unknown>;
  input: { cache: LruCacheOptionsEntity.Type } & Record<string, unknown>;
  shape: Shape;
  name: string;
};

type ScenarioCaseByShape = {
  [Shape in ScenarioShape]: BaseScenarioCase<Shape>;
};

type ScenarioCase = ScenarioCaseByShape[ScenarioShape];
type ScenarioRunnerMap = Record<
  ScenarioShape,
  (scenarioCase: ScenarioCase) => Promise<void> | void
>;

class RecordingCache extends LruCache<string, number> {
  readonly log: Array<
    | { event: "clear"; count: number }
    | { event: "delete"; key: string }
    | { event: "evict"; key: string; reason: "capacity" }
    | { event: "expire"; key: string }
    | { event: "hit"; key: string; value: number }
    | { event: "miss"; key: string }
    | { event: "set"; key: string }
    | { event: "stale"; key: string; value: number }
    | { event: "update"; key: string }
  > = [];

  constructor(config: LruCacheOptionsEntity.Type) {
    super(config);
  }

  protected override onHit(key: string, value: number): void {
    this.log.push({ event: "hit", key, value });
  }

  protected override onStale(key: string, value: number): void {
    this.log.push({ event: "stale", key, value });
  }

  protected override onMiss(key: string): void {
    this.log.push({ event: "miss", key });
  }

  protected override onSet(key: string): void {
    this.log.push({ event: "set", key });
  }

  protected override onUpdate(key: string): void {
    this.log.push({ event: "update", key });
  }

  protected override onEvict(key: string, reason: "capacity"): void {
    this.log.push({ event: "evict", key, reason });
  }

  protected override onExpire(key: string): void {
    this.log.push({ event: "expire", key });
  }

  protected override onDelete(key: string): void {
    this.log.push({ event: "delete", key });
  }

  protected override onClear(count: number): void {
    this.log.push({ event: "clear", count });
  }
}

function createCache<K, V>(scenarioCase: ScenarioCase): LruCache<K, V> {
  return LruCache.create<K, V>(scenarioCase.input.cache);
}

function createRecordingCache(scenarioCase: ScenarioCase): RecordingCache {
  return new RecordingCache(scenarioCase.input.cache);
}

const runnerMap = {
  "clear-empties-cache": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue),
    );
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue),
    );
    cache.clear();
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
    assert.strictEqual(
      cache.get(String(scenarioCase.input.firstKey)),
      scenarioCase.expected.firstValue ?? undefined,
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.input.secondKey)),
      scenarioCase.expected.secondValue ?? undefined,
    );
  },
  "delete-existing": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.delete(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.deleted),
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      scenarioCase.expected.value ?? undefined,
    );
  },
  "delete-missing": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    assert.strictEqual(
      cache.delete(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.deleted),
    );
  },
  "delete-where-empty": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    const removed = cache.deleteWhere(() => {
      return Boolean(scenarioCase.expected.matchPredicate);
    });
    assert.strictEqual(removed, Number(scenarioCase.expected.removed));
  },
  "delete-where-matches": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    for (const [key, value] of scenarioCase.input.entries as Array<
      [string, number]
    >) {
      cache.set(key, value);
    }
    cache.log.length = 0;
    const removed = cache.deleteWhere((_key, value) => {
      return Boolean(
        scenarioCase.expected.matchPredicate ? value % 2 === 1 : false,
      );
    });
    assert.strictEqual(removed, Number(scenarioCase.expected.removed));
    assert.strictEqual(
      cache.has(String(scenarioCase.expected.hasAKey)),
      Boolean(scenarioCase.expected.hasA),
    );
    assert.strictEqual(
      cache.has(String(scenarioCase.expected.hasBKey)),
      Boolean(scenarioCase.expected.hasB),
    );
    assert.strictEqual(
      cache.has(String(scenarioCase.expected.hasCKey)),
      Boolean(scenarioCase.expected.hasC),
    );
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
    const deleteEvents = cache.log.filter((entry) => {
      return entry.event === "delete";
    });
    assert.strictEqual(
      deleteEvents.length,
      Number(scenarioCase.expected.deleteCount),
    );
  },
  "delete-where-none": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    for (const [key, value] of scenarioCase.input.entries as Array<
      [string, number]
    >) {
      cache.set(key, value);
    }
    cache.log.length = 0;
    const removed = cache.deleteWhere((_key, value) => {
      return value % 2 === 1;
    });
    assert.strictEqual(removed, Number(scenarioCase.expected.removed));
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
  },
  "entry-ttl-overrides-global": (scenarioCase) => {
    const cache = createCache<string, string>(scenarioCase);
    cache.set(
      String(scenarioCase.input.shortKey),
      String(scenarioCase.input.shortValue),
      { ttlMs: Number(scenarioCase.input.shortTtlMs) },
    );
    cache.set(
      String(scenarioCase.input.longKey),
      String(scenarioCase.input.longValue),
    );
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(
          cache.get(String(scenarioCase.input.shortKey)),
          scenarioCase.expected.shortValue ?? undefined,
        );
        assert.strictEqual(
          cache.get(String(scenarioCase.input.longKey)),
          String(scenarioCase.expected.longValue),
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  },
  "evict-correct-key": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.lruKey),
      Number(scenarioCase.input.lruValue),
    );
    cache.log.length = 0;
    cache.set(
      String(scenarioCase.input.newKey),
      Number(scenarioCase.input.newValue),
    );
    const evictEvents = cache.log.filter((entry) => {
      return entry.event === "evict";
    });
    assert.strictEqual(
      evictEvents.length,
      Number(scenarioCase.expected.evictCount),
    );
    if (evictEvents[0]?.event === "evict") {
      assert.strictEqual(
        evictEvents[0].key,
        String(scenarioCase.expected.evictKey),
      );
    }
  },
  "get-missing": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      scenarioCase.expected.value ?? undefined,
    );
  },
  "hard-expiry-wins": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, scenarioCase.expected.value ?? undefined);
        assert.deepStrictEqual(
          cache.log[0],
          scenarioCase.expected.firstLogEntry,
        );
        assert.deepStrictEqual(
          cache.log[1],
          scenarioCase.expected.secondLogEntry,
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  },
  "has-existing": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.has(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.has),
    );
  },
  "has-missing": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    assert.strictEqual(
      cache.has(String(scenarioCase.input.key)),
      Boolean(scenarioCase.expected.has),
    );
  },
  "invalid-options": (scenarioCase) => {
    assert.throws(
      () => createCache<string, number>(scenarioCase),
      CacheConfigError,
    );
  },
  "lru-evicts-tail": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    for (const [key, value] of scenarioCase.input.entries as Array<
      [string, number]
    >) {
      cache.set(key, value);
    }
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.evictedKey)),
      scenarioCase.expected.evictedValue ?? undefined,
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.keptKey)),
      Number(scenarioCase.expected.keptValue),
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.newKey)),
      Number(scenarioCase.expected.newValue),
    );
  },
  "lru-promotes-accessed-entry": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue),
    );
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue),
    );
    cache.get(String(scenarioCase.input.promoteKey));
    cache.set(
      String(scenarioCase.input.thirdKey),
      Number(scenarioCase.input.thirdValue),
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.keptKey)),
      Number(scenarioCase.expected.keptValue),
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.evictedKey)),
      scenarioCase.expected.evictedValue ?? undefined,
    );
    assert.strictEqual(
      cache.get(String(scenarioCase.expected.newKey)),
      Number(scenarioCase.expected.newValue),
    );
  },
  "no-stale-ms-uses-hit": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    cache.get(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "object-key-identity": (scenarioCase) => {
    const cache = createCache<object, number>(scenarioCase);
    const { keyA, keyB } = scenarioCase.input;
    if (
      typeof keyA !== "object" ||
      keyA === null ||
      typeof keyB !== "object" ||
      keyB === null
    ) {
      throw new Error(
        `Object keys are required for scenario ${scenarioCase.name}`,
      );
    }
    cache.set(keyA, Number(scenarioCase.input.valueA));
    cache.set(keyB, Number(scenarioCase.input.valueB));
    assert.strictEqual(cache.get(keyA), Number(scenarioCase.expected.valueA));
    assert.strictEqual(cache.get(keyB), Number(scenarioCase.expected.valueB));
    assert.strictEqual(cache.size, Number(scenarioCase.expected.size));
  },
  "on-clear": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    for (const [key, value] of scenarioCase.input.entries as Array<
      [string, number]
    >) {
      cache.set(key, value);
    }
    cache.log.length = 0;
    cache.clear();
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "on-clear-empty": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.clear();
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "on-delete": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    cache.delete(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "on-delete-absent": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.delete(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
  },
  "on-evict": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue),
    );
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue),
    );
    cache.log.length = 0;
    cache.set(
      String(scenarioCase.input.thirdKey),
      Number(scenarioCase.input.thirdValue),
    );
    const evictEvents = cache.log.filter((entry) => {
      return entry.event === "evict";
    });
    assert.strictEqual(
      evictEvents.length,
      Number(scenarioCase.expected.evictCount),
    );
    assert.deepStrictEqual(evictEvents[0], scenarioCase.expected.evictEntry);
  },
  "on-expire-and-on-miss": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { ttlMs: Number(scenarioCase.input.ttlMs) },
    );
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, scenarioCase.expected.value ?? undefined);
        assert.strictEqual(
          cache.log.length,
          Number(scenarioCase.expected.logLength),
        );
        assert.deepStrictEqual(
          cache.log[0],
          scenarioCase.expected.firstLogEntry,
        );
        assert.deepStrictEqual(
          cache.log[1],
          scenarioCase.expected.secondLogEntry,
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  },
  "on-expire-with-has": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { ttlMs: Number(scenarioCase.input.ttlMs) },
    );
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const present = cache.has(String(scenarioCase.input.key));
        assert.strictEqual(present, Boolean(scenarioCase.expected.present));
        const expireEvents = cache.log.filter((entry) => {
          return entry.event === "expire";
        });
        assert.strictEqual(
          expireEvents.length,
          Number(scenarioCase.expected.expireCount),
        );
        assert.deepStrictEqual(
          expireEvents[0],
          scenarioCase.expected.expireEntry,
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  },
  "on-hit": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    cache.get(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "on-miss": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.get(String(scenarioCase.input.key));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "on-set": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "on-update": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.firstValue),
    );
    cache.log.length = 0;
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.secondValue),
    );
    assert.strictEqual(
      cache.log.length,
      Number(scenarioCase.expected.logLength),
    );
    assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
  },
  "per-call-stale-override": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { staleMs: Number(scenarioCase.input.staleMs) },
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
  },
  "set-get": (scenarioCase) => {
    const cache = createCache<string, string>(scenarioCase);
    cache.set(String(scenarioCase.input.key), String(scenarioCase.input.value));
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      String(scenarioCase.expected.value),
    );
  },
  "set-vs-update": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.firstValue),
    );
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.secondValue),
    );
    const sets = cache.log.filter((entry) => {
      return entry.event === "set";
    });
    const updates = cache.log.filter((entry) => {
      return entry.event === "update";
    });
    assert.strictEqual(sets.length, Number(scenarioCase.expected.setCount));
    assert.strictEqual(
      updates.length,
      Number(scenarioCase.expected.updateCount),
    );
  },
  "size-reflects-entry-count": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    const { sizes } = scenarioCase.expected;
    if (sizes === undefined) {
      throw new Error(
        `Expected sizes are required for scenario ${scenarioCase.name}`,
      );
    }
    const [emptySize, firstSize, secondSize, afterDeleteSize] = sizes;
    if (
      emptySize === undefined ||
      firstSize === undefined ||
      secondSize === undefined ||
      afterDeleteSize === undefined
    ) {
      throw new Error(
        `Invalid sizes number array for scenario ${scenarioCase.name}`,
      );
    }

    assert.strictEqual(cache.size, emptySize);
    cache.set(
      String(scenarioCase.input.firstKey),
      Number(scenarioCase.input.firstValue),
    );
    assert.strictEqual(cache.size, firstSize);
    cache.set(
      String(scenarioCase.input.secondKey),
      Number(scenarioCase.input.secondValue),
    );
    assert.strictEqual(cache.size, secondSize);
    cache.delete(String(scenarioCase.input.firstKey));
    assert.strictEqual(cache.size, afterDeleteSize);
  },
  "stale-before-expiry": (scenarioCase) => {
    const cache = createRecordingCache(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    cache.log.length = 0;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = cache.get(String(scenarioCase.input.key));
        assert.strictEqual(result, Number(scenarioCase.expected.value));
        assert.strictEqual(
          cache.log.length,
          Number(scenarioCase.expected.logLength),
        );
        assert.deepStrictEqual(cache.log[0], scenarioCase.expected.logEntry);
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  },
  "throwing-on-expire": (scenarioCase) => {
    const input = scenarioCase.input as {
      cache: LruCacheOptionsEntity.Type;
      key: string;
      ttlMs: number;
      value: number;
      throwMessage: string;
      waitMs: number;
    };
    const expected = scenarioCase.expected as { size: number; value: null };
    class ThrowingExpireCache extends LruCache<string, number> {
      constructor(config: LruCacheOptionsEntity.Type) {
        super(config);
      }

      protected override onExpire(): void {
        throw new Error(input.throwMessage);
      }
    }

    const cache = new ThrowingExpireCache(input.cache);
    cache.set(input.key, input.value, { ttlMs: input.ttlMs });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(cache.get(input.key), expected.value ?? undefined);
        assert.strictEqual(cache.has(input.key), false);
        assert.strictEqual(cache.size, expected.size);
        resolve();
      }, input.waitMs);
    });
  },
  "throwing-on-hit": (scenarioCase) => {
    const input = scenarioCase.input as {
      cache: LruCacheOptionsEntity.Type;
      keyA: string;
      keyB: string;
      keyC: string;
      valueA: number;
      valueB: number;
      valueC: number;
      throwMessage: string;
    };
    const expected = scenarioCase.expected as {
      afterGetA: number;
      afterGetB: number;
      afterGetC: number;
      hitCount: number;
      missingKey: string;
    };
    class ThrowingHitCache extends LruCache<string, number> {
      hitCount = 0;

      constructor(config: LruCacheOptionsEntity.Type) {
        super(config);
      }

      protected override onHit(): void {
        this.hitCount += 1;
        throw new Error(input.throwMessage);
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
  },
  "throwing-on-update": (scenarioCase) => {
    const input = scenarioCase.input as {
      cache: LruCacheOptionsEntity.Type;
      key: string;
      firstValue: number;
      secondValue: number;
      throwMessage: string;
    };
    const expected = scenarioCase.expected as { value: number };
    class ThrowingUpdateCache extends LruCache<string, number> {
      constructor(config: LruCacheOptionsEntity.Type) {
        super(config);
      }

      protected override onUpdate(): void {
        throw new Error(input.throwMessage);
      }
    }

    const cache = new ThrowingUpdateCache(input.cache);
    cache.set(input.key, input.firstValue);
    cache.set(input.key, input.secondValue);
    assert.strictEqual(cache.get(input.key), expected.value);
  },
  "ttl-before-expiry": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    cache.set(String(scenarioCase.input.key), Number(scenarioCase.input.value));
    assert.strictEqual(
      cache.get(String(scenarioCase.input.key)),
      Number(scenarioCase.expected.value),
    );
  },
  "ttl-expires-after-delay": (scenarioCase) => {
    const cache = createCache<string, number>(scenarioCase);
    cache.set(
      String(scenarioCase.input.key),
      Number(scenarioCase.input.value),
      { ttlMs: Number(scenarioCase.input.ttlMs) },
    );
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(
          cache.get(String(scenarioCase.input.key)),
          scenarioCase.expected.value ?? undefined,
        );
        resolve();
      }, Number(scenarioCase.input.waitMs));
    });
  },
} satisfies ScenarioRunnerMap;

function runCase<Shape extends ScenarioShape>(
  scenarioCase: ScenarioCaseByShape[Shape],
): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe("LruCache", () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
