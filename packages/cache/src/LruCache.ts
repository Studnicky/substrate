import { HookInvoker } from '@studnicky/errors';

import type { LruCacheNodeTimingEntity } from './entities/LruCacheNodeTimingEntity.js';

import { LruCacheOptionsEntity } from './entities/LruCacheOptionsEntity.js';
import { CacheConfigError } from './errors/index.js';

interface LruCacheNodeInterface<K, V> {
  /** Expiry timestamp (ms since epoch) or `0` (no expiry sentinel). */
  'expiresAt': LruCacheNodeTimingEntity.Type['expiresAt'];
  'key': K;
  'next': LruCacheNodeInterface<K, V> | undefined;
  'prev': LruCacheNodeInterface<K, V> | undefined;
  /** Staleness timestamp (ms since epoch) or `0` (no staleness configured sentinel). */
  'staleAt': LruCacheNodeTimingEntity.Type['staleAt'];
  'value': V;
}

const noExpiry = 0;

/**
 * Silently swallows hook failures instead of letting `HookInvoker`'s default
 * (throwing) behavior propagate. Unlike `Batch`/`EntityStore`, which record
 * hook errors for later inspection, `LruCache` hooks are pure observability
 * side channels with no consumer-facing error surface — a broken hook must
 * never affect cache read/write behavior.
 */
class LruCacheHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

/**
 * In-process LRU + TTL cache with O(1) promotion on read.
 *
 * The base class performs NO observability of its own — it exposes protected
 * lifecycle hooks that a consumer overrides to add logging, timing, or metrics.
 * Overrides must not throw or block; hooks are called synchronously after the
 * relevant state mutation.
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
  protected readonly hooks: HookInvoker = new LruCacheHookInvoker();
  readonly #capacity: number;
  readonly #defaultStaleMs: number | undefined;
  readonly #defaultTtlMs: number | undefined;
  readonly #nodes: Map<K, LruCacheNodeInterface<K, V>>;
  #head: LruCacheNodeInterface<K, V> | undefined;
  #tail: LruCacheNodeInterface<K, V> | undefined;

  static create<K = unknown, V = unknown>(options: LruCacheOptionsEntity.Type): LruCache<K, V> {
    // `new this(...)` so subclass factories return the subclass instance.
    return new this(options);
  }

  protected constructor(options: LruCacheOptionsEntity.Type) {
    if (!LruCacheOptionsEntity.validate(options)) {
      const messages = (LruCacheOptionsEntity.validate.errors ?? [])
        .map((error) => { return error.message ?? String(error); })
        .join('; ');
      throw new CacheConfigError(messages.length > 0 ? messages : 'invalid options');
    }

    this.#capacity = options.capacity;
    this.#defaultStaleMs = options.staleMs;
    this.#defaultTtlMs = options.ttlMs;
    this.#nodes = new Map();
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
    const result = this.#nodes.size;
    return result;
  }

  /** Promotes entry to MRU on hit; returns undefined on miss or expiry (lazily evicts). */
  public get(key: K): V | undefined {
    const result = this.tryGet(key);
    return result.value;
  }

  /**
   * Single-traversal presence-and-value lookup: distinguishes "not present"
   * from "present with value `undefined`" without a caller needing a separate
   * `has()` call. Same promotion/expiry/staleness semantics as `get()` — `get()`
   * is implemented in terms of this method.
   */
  public tryGet(key: K): { readonly 'found': boolean; readonly 'value': V | undefined } {
    const node = this.#nodes.get(key);

    if (node === undefined) {
      this.hooks.invoke('onMiss', () => {
        const result = this.onMiss(key);
        return result;
      });
      return { 'found': false, 'value': undefined };
    }

    if (LruCache.isExpired(node)) {
      this.hooks.invoke('onExpire', () => {
        const result = this.onExpire(key);
        return result;
      });
      this.removeEntry(key);
      this.hooks.invoke('onMiss', () => {
        const result = this.onMiss(key);
        return result;
      });
      return { 'found': false, 'value': undefined };
    }

    this.promoteToHead(node);

    if (node.staleAt !== noExpiry && Date.now() > node.staleAt) {
      this.hooks.invoke('onStale', () => {
        const result = this.onStale(key, node.value);
        return result;
      });
    } else {
      this.hooks.invoke('onHit', () => {
        const result = this.onHit(key, node.value);
        return result;
      });
    }

    return { 'found': true, 'value': node.value };
  }

  /** Stores value; promotes existing key to MRU or evicts LRU tail if at capacity. */
  public set(key: K, value: V, opts?: { 'staleMs'?: number; 'ttlMs'?: number }): void {
    const effectiveTtl = opts?.ttlMs ?? this.#defaultTtlMs;
    const expiresAt = effectiveTtl !== undefined ? Date.now() + effectiveTtl : noExpiry;
    const effectiveStale = opts?.staleMs ?? this.#defaultStaleMs;
    const staleAt = effectiveStale !== undefined ? Date.now() + effectiveStale : noExpiry;

    const existing = this.#nodes.get(key);

    if (existing !== undefined) {
      existing.expiresAt = expiresAt;
      existing.staleAt = staleAt;
      existing.value = value;
      this.promoteToHead(existing);
      this.hooks.invoke('onUpdate', () => {
        const result = this.onUpdate(key);
        return result;
      });
      return;
    }

    if (this.#nodes.size >= this.#capacity && this.#tail !== undefined) {
      this.evictTail(this.#tail);
    }

    const node: LruCacheNodeInterface<K, V> = {
      'expiresAt': expiresAt,
      'key': key,
      'next': undefined,
      'prev': undefined,
      'staleAt': staleAt,
      'value': value
    };

    this.#nodes.set(key, node);
    this.insertAtHead(node);
    this.hooks.invoke('onSet', () => {
      const result = this.onSet(key);
      return result;
    });
  }

  /** Returns true if key exists and has not expired; lazily evicts expired entries. */
  public has(key: K): boolean {
    const node = this.#nodes.get(key);

    if (node === undefined) {
      return false;
    }

    if (LruCache.isExpired(node)) {
      this.hooks.invoke('onExpire', () => {
        const result = this.onExpire(key);
        return result;
      });
      this.removeEntry(key);
      return false;
    }

    return true;
  }

  public delete(key: K): boolean {
    const existed = this.#nodes.has(key);

    if (existed) {
      this.removeEntry(key);
      this.hooks.invoke('onDelete', () => {
        const result = this.onDelete(key);
        return result;
      });
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

    for (const [key, node] of this.#nodes) {
      if (predicate(key, node.value)) {
        this.removeEntry(key);
        this.hooks.invoke('onDelete', () => {
          const result = this.onDelete(key);
          return result;
        });
        removed += 1;
      }
    }

    return removed;
  }

  public clear(): void {
    const count = this.#nodes.size;
    this.#nodes.clear();
    this.#head = undefined;
    this.#tail = undefined;
    this.hooks.invoke('onClear', () => {
      const result = this.onClear(count);
      return result;
    });
  }

  private static isExpired<K, V>(node: LruCacheNodeInterface<K, V>): boolean {
    if (node.expiresAt === noExpiry) {
      return false;
    }

    return Date.now() > node.expiresAt;
  }

  private insertAtHead(node: LruCacheNodeInterface<K, V>): void {
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

  private promoteToHead(node: LruCacheNodeInterface<K, V>): void {
    if (node === this.#head) {
      return;
    }

    this.unlinkNode(node);
    node.next = undefined;
    node.prev = undefined;
    this.insertAtHead(node);
  }

  private unlinkNode(node: LruCacheNodeInterface<K, V>): void {
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

  private removeEntry(key: K): void {
    const node = this.#nodes.get(key);

    if (node !== undefined) {
      this.unlinkNode(node);
      this.#nodes.delete(key);
    }
  }

  private evictTail(node: LruCacheNodeInterface<K, V>): void {
    this.unlinkNode(node);
    this.#nodes.delete(node.key);
    this.hooks.invoke('onEvict', () => {
      const result = this.onEvict(node.key, 'capacity');
      return result;
    });
  }
}
