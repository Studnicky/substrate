import type { LruCacheOptionsEntity } from './entities/LruCacheOptionsEntity.js';

import { CacheConfigError } from './errors/index.js';

type EntryType<V> = {
  /** Expiry timestamp (ms since epoch) or `0` (no expiry sentinel). */
  'expiresAt': number;
  'value': V;
};

type NodeType<K> = {
  'key': K;
  'next': NodeType<K> | undefined;
  'prev': NodeType<K> | undefined;
};

const noExpiry = 0;

/** In-process LRU + TTL cache with O(1) promotion on read. */
export class LruCache<K, V> {
  readonly #capacity: number;
  readonly #defaultTtlMs: number | undefined;
  readonly #entries: Map<string, EntryType<V>>;
  readonly #nodes: Map<string, NodeType<string>>;
  readonly #prefix: string;
  #head: NodeType<string> | undefined;
  #tail: NodeType<string> | undefined;

  public constructor(options: LruCacheOptionsEntity.Type) {
    if (options.capacity <= 0 || !Number.isInteger(options.capacity)) {
      throw new CacheConfigError('capacity must be a positive integer');
    }

    this.#capacity = options.capacity;
    this.#defaultTtlMs = options.ttlMs;
    this.#entries = new Map();
    this.#nodes = new Map();
    this.#prefix = options.prefix ?? '';
    this.#head = undefined;
    this.#tail = undefined;
  }

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
      return undefined;
    }

    if (LruCache.isExpired(entry)) {
      this.removeEntry(internalKey);
      return undefined;
    }

    this.promoteToHead(internalKey);

    return entry.value;
  }

  /** Stores value; promotes existing key to MRU or evicts LRU tail if at capacity. */
  public set(key: K, value: V, ttlMs?: number): void {
    const internalKey = this.buildInternalKey(key);
    const effectiveTtl = ttlMs ?? this.#defaultTtlMs;
    const expiresAt = effectiveTtl !== undefined ? Date.now() + effectiveTtl : noExpiry;

    const existing = this.#entries.get(internalKey);

    if (existing !== undefined) {
      existing.expiresAt = expiresAt;
      existing.value = value;
      this.promoteToHead(internalKey);
      return;
    }

    if (this.#entries.size >= this.#capacity && this.#tail !== undefined) {
      this.evictTail(this.#tail.key);
    }

    const entry: EntryType<V> = {
      'expiresAt': expiresAt,
      'value': value
    };

    this.#entries.set(internalKey, entry);

    const node: NodeType<string> = {
      'key': internalKey,
      'next': undefined,
      'prev': undefined
    };

    this.#nodes.set(internalKey, node);
    this.insertAtHead(node);
  }

  /** Returns true if key exists and has not expired; lazily evicts expired entries. */
  public has(key: K): boolean {
    const internalKey = this.buildInternalKey(key);
    const entry = this.#entries.get(internalKey);

    if (entry === undefined) {
      return false;
    }

    if (LruCache.isExpired(entry)) {
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
    }

    return existed;
  }

  public clear(): void {
    this.#entries.clear();
    this.#nodes.clear();
    this.#head = undefined;
    this.#tail = undefined;
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
    const node = this.#nodes.get(key);

    if (node !== undefined) {
      this.unlinkNode(node);
      this.#nodes.delete(key);
    }
  }

  private evictTail(key: string): void {
    this.#entries.delete(key);
    const node = this.#nodes.get(key);

    if (node !== undefined) {
      this.unlinkNode(node);
      this.#nodes.delete(key);
    }
  }
}
