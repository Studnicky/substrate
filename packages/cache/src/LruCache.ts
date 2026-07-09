import type { LruCacheOptionsEntity } from './entities/LruCacheOptionsEntity.js';

import { CacheConfigError } from './errors/index.js';
import { LruCacheBuilder } from './LruCacheBuilder.js';

type EntryType<V> = {
  /** Expiry timestamp (ms since epoch) or `0` (no expiry sentinel). */
  'expiresAt': number;
  /** Staleness timestamp (ms since epoch) or `0` (no staleness configured sentinel). */
  'staleAt': number;
  'value': V;
};

type NodeType<K> = {
  'key': K;
  'next': NodeType<K> | undefined;
  'prev': NodeType<K> | undefined;
};

const noExpiry = 0;

/**
 * In-process LRU + TTL cache with O(1) promotion on read.
 *
 * The base class performs NO observability of its own — it exposes protected
 * lifecycle hooks that a consumer overrides to add logging, timing, or metrics.
 * Overrides must not throw or block; hooks are called synchronously and
 * exceptions propagate to the caller.
 *
 * @example Adding observability via hooks
 * ```typescript
 * class ObservedCache extends LruCache<string, number> {
 *   protected override onHit(key: string, value: number): void {
 *     console.log(`[cache] hit key=${key} value=${value}`);
 *   }
 *   protected override onMiss(key: string): void {
 *     console.log(`[cache] miss key=${key}`);
 *   }
 * }
 * ```
 */
export class LruCache<K, V> {
  readonly #capacity: number;
  readonly #defaultStaleMs: number | undefined;
  readonly #defaultTtlMs: number | undefined;
  readonly #entries: Map<string, EntryType<V>>;
  /** Maps internal (prefixed) string key → original caller key, for use in hooks. */
  readonly #keyMap: Map<string, K>;
  readonly #nodes: Map<string, NodeType<string>>;
  readonly #prefix: string;
  #head: NodeType<string> | undefined;
  #tail: NodeType<string> | undefined;

  static create<K = unknown, V = unknown>(options: LruCacheOptionsEntity.Type): LruCache<K, V> {
    // `new this(...)` so subclass factories return the subclass instance.
    return new this(options);
  }

  static builder<K = unknown, V = unknown>(): LruCacheBuilder<K, V> {
    const factory = (options: LruCacheOptionsEntity.Type): LruCache<K, V> => {
      const result = LruCache.create<K, V>(options);
      return result;
    };
    const result = LruCacheBuilder.create<K, V>(factory);
    return result;
  }

  protected constructor(options: LruCacheOptionsEntity.Type) {
    if (options.capacity <= 0 || !Number.isInteger(options.capacity)) {
      throw new CacheConfigError('capacity must be a positive integer');
    }

    this.#capacity = options.capacity;
    this.#defaultStaleMs = options.staleMs;
    this.#defaultTtlMs = options.ttlMs;
    this.#entries = new Map();
    this.#keyMap = new Map();
    this.#nodes = new Map();
    this.#prefix = options.prefix ?? '';
    this.#head = undefined;
    this.#tail = undefined;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override these to add logging, timing, or metrics. Overrides must not throw
  // or block; hooks fire synchronously after the relevant state mutation.
  // ---------------------------------------------------------------------------

  /** Fires when `get()` finds a live, non-expired entry. */
  protected onHit(_key: K, _value: V): void {}

  /**
   * Fires when `get()` finds a live entry that has passed its `staleMs`
   * threshold but has NOT hit its hard `ttlMs` expiry. The entry is still
   * promoted to MRU and its value returned, same as a hit — this fires
   * INSTEAD of `onHit`, never alongside it.
   */
  protected onStale(_key: K, _value: V): void {}

  /**
   * Fires when `get()` returns undefined — either because the key is absent or
   * because the entry was expired and lazily evicted. Use `onExpire` to
   * distinguish expired entries.
   */
  protected onMiss(_key: K): void {}

  /** Fires when `set()` inserts a NEW key (key was not previously present). */
  protected onSet(_key: K): void {}

  /** Fires when `set()` overwrites the value for an EXISTING key. */
  protected onUpdate(_key: K): void {}

  /**
   * Fires when an entry is removed to make room for a new one (capacity
   * eviction of the LRU tail). The evicted key is the one removed, not the
   * one being inserted.
   */
  protected onEvict(_key: K, _reason: 'capacity'): void {}

  /**
   * Fires when `get()` or `has()` encounters an entry whose TTL has elapsed
   * and lazily removes it. Called before the entry is dropped, while the key
   * is still known.
   */
  protected onExpire(_key: K): void {}

  /**
   * Fires when `delete()` removes an entry that actually existed. Not called
   * when delete() is a no-op for an absent key.
   */
  protected onDelete(_key: K): void {}

  /**
   * Fires when `clear()` empties the cache. `count` is the number of entries
   * present (including expired-but-not-yet-evicted ones) before the wipe.
   */
  protected onClear(_count: number): void {}

  /** Includes expired entries not yet lazily evicted. */
  public get size(): number {
    const result = this.#entries.size;
    return result;
  }

  /** Promotes entry to MRU on hit; returns undefined on miss or expiry (lazily evicts). */
  public get(key: K): V | undefined {
    const internalKey = this.buildInternalKey(key);
    const entry = this.#entries.get(internalKey);

    if (entry === undefined) {
      this.onMiss(key);
      return undefined;
    }

    if (LruCache.isExpired(entry)) {
      this.onExpire(key);
      this.removeEntry(internalKey);
      this.onMiss(key);
      return undefined;
    }

    this.promoteToHead(internalKey);

    if (entry.staleAt !== noExpiry && Date.now() > entry.staleAt) {
      this.onStale(key, entry.value);
    } else {
      this.onHit(key, entry.value);
    }

    return entry.value;
  }

  /**
   * Inserts each `[key, value]` pair in array order. The last entry in the array
   * ends up most-recently-used. An empty array is a no-op. `ttlMs` applies to all
   * entries in the batch with the same precedence as the per-call TTL in `set`.
   */
  public setMany(entries: readonly (readonly [K, V])[], ttlMs?: number): void {
    for (const [key, value] of entries) {
      const opts = ttlMs !== undefined ? { 'ttlMs': ttlMs } : undefined;
      this.set(key, value, opts);
    }
  }

  /** Stores value; promotes existing key to MRU or evicts LRU tail if at capacity. */
  public set(key: K, value: V, opts?: { 'staleMs'?: number; 'ttlMs'?: number }): void {
    const internalKey = this.buildInternalKey(key);
    const effectiveTtl = opts?.ttlMs ?? this.#defaultTtlMs;
    const expiresAt = effectiveTtl !== undefined ? Date.now() + effectiveTtl : noExpiry;
    const effectiveStale = opts?.staleMs ?? this.#defaultStaleMs;
    const staleAt = effectiveStale !== undefined ? Date.now() + effectiveStale : noExpiry;

    const existing = this.#entries.get(internalKey);

    if (existing !== undefined) {
      existing.expiresAt = expiresAt;
      existing.staleAt = staleAt;
      existing.value = value;
      this.promoteToHead(internalKey);
      this.onUpdate(key);
      return;
    }

    if (this.#entries.size >= this.#capacity && this.#tail !== undefined) {
      this.evictTail(this.#tail.key);
    }

    const entry: EntryType<V> = {
      'expiresAt': expiresAt,
      'staleAt': staleAt,
      'value': value
    };

    this.#entries.set(internalKey, entry);
    this.#keyMap.set(internalKey, key);

    const node: NodeType<string> = {
      'key': internalKey,
      'next': undefined,
      'prev': undefined
    };

    this.#nodes.set(internalKey, node);
    this.insertAtHead(node);
    this.onSet(key);
  }

  /** Returns true if key exists and has not expired; lazily evicts expired entries. */
  public has(key: K): boolean {
    const internalKey = this.buildInternalKey(key);
    const entry = this.#entries.get(internalKey);

    if (entry === undefined) {
      return false;
    }

    if (LruCache.isExpired(entry)) {
      this.onExpire(key);
      this.removeEntry(internalKey);
      return false;
    }

    return true;
  }

  public delete(key: K): boolean {
    const internalKey = this.buildInternalKey(key);
    const existed = this.#entries.has(internalKey);

    if (existed) {
      this.removeEntry(internalKey);
      this.onDelete(key);
    }

    return existed;
  }

  /**
   * Removes every entry for which `predicate(key, value)` returns `true`,
   * using the same internal removal path as `delete()` and firing `onDelete`
   * for each one removed. Mirrors `delete()`'s own expiry handling: entries
   * are evaluated and removed regardless of TTL expiry (lazy eviction still
   * happens independently via `get()`/`has()`). Returns the count removed.
   */
  public deleteWhere(predicate: (key: K, value: V) => boolean): number {
    let removed = 0;

    for (const [internalKey, entry] of this.#entries) {
      const originalKey = this.#keyMap.get(internalKey);

      if (originalKey === undefined) {
        continue;
      }

      if (predicate(originalKey, entry.value)) {
        this.removeEntry(internalKey);
        this.onDelete(originalKey);
        removed += 1;
      }
    }

    return removed;
  }

  public clear(): void {
    const count = this.#entries.size;
    this.#entries.clear();
    this.#keyMap.clear();
    this.#nodes.clear();
    this.#head = undefined;
    this.#tail = undefined;
    this.onClear(count);
  }

  private static isExpired<V>(entry: EntryType<V>): boolean {
    if (entry.expiresAt === noExpiry) {
      return false;
    }

    return Date.now() > entry.expiresAt;
  }

  private buildInternalKey(key: K): string {
    const raw = String(key);

    return this.#prefix.length > 0 ? `${this.#prefix}:${raw}` : raw;
  }

  private insertAtHead(node: NodeType<string>): void {
    node.next = this.#head;
    node.prev = undefined;

    if (this.#head !== undefined) {
      this.#head.prev = node;
    }

    this.#head = node;

    if (this.#tail === undefined) {
      this.#tail = node;
    }
  }

  private promoteToHead(key: string): void {
    const node = this.#nodes.get(key);

    if (node === undefined || node === this.#head) {
      return;
    }

    this.unlinkNode(node);
    node.next = undefined;
    node.prev = undefined;
    this.insertAtHead(node);
  }

  private unlinkNode(node: NodeType<string>): void {
    if (node.prev !== undefined) {
      node.prev.next = node.next;
    } else {
      this.#head = node.next;
    }

    if (node.next !== undefined) {
      node.next.prev = node.prev;
    } else {
      this.#tail = node.prev;
    }

    node.next = undefined;
    node.prev = undefined;
  }

  private removeEntry(key: string): void {
    this.#entries.delete(key);
    this.#keyMap.delete(key);
    const node = this.#nodes.get(key);

    if (node !== undefined) {
      this.unlinkNode(node);
      this.#nodes.delete(key);
    }
  }

  private evictTail(key: string): void {
    const originalKey = this.#keyMap.get(key);
    this.#entries.delete(key);
    this.#keyMap.delete(key);
    const node = this.#nodes.get(key);

    if (node !== undefined) {
      this.unlinkNode(node);
      this.#nodes.delete(key);
    }

    if (originalKey !== undefined) {
      this.onEvict(originalKey, 'capacity');
    }
  }
}
