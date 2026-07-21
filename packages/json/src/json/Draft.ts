/**
 * Draft — Immer-style "mutate a draft, get an immutable result" primitive.
 *
 * `Draft.produce` wraps a base value in a recursive, memoized `Proxy` (the
 * "draft"). Writes made to the draft inside `recipe` land on a copy-on-write
 * shadow, never on `base`. The returned value is a new plain object/array
 * reflecting only the paths that were written — every untouched branch is the
 * *same reference* as in `base` (structural sharing), so callers can cheaply
 * diff subtrees via `===`.
 *
 * `Draft.producePatch` runs the same mechanics and additionally returns the
 * RFC-6902 patch (this package's own `PatchOperationInterface` shape — see
 * `Patch.ts`) describing the difference between `base` and the result.
 * Replaying that patch through `Patch.create(patch).apply(base)` reproduces
 * `next`.
 *
 * Only plain objects and arrays are drafted (nested access recurses into a
 * new memoized proxy on first touch). Non-plain values — functions, Map,
 * Set, Date, class instances — pass through as direct references, matching
 * `Clone`'s type dispatch and Immer's own default (non-plugin) behaviour.
 *
 * Subclass `Draft` and override any `protected static` step to customise
 * draftability or diffing.
 */

import type { JSONSchema7Type } from 'json-schema';

import { JsonValue } from '@studnicky/types';

import type { DraftNodeInterface } from '../interfaces/DraftNodeInterface.js';
import type { PatchOperationInterface } from '../interfaces/PatchOperationInterface.js';

import { SLASH_PATTERN, TILDE_PATTERN } from '../constants/JsonPointerConstants.js';
import { DataType } from './DataType.js';

export class Draft {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise draft behaviour
  // ---------------------------------------------------------------------------

  /** Return `true` when `value` should be wrapped in a nested draft proxy. */
  protected static isDraftable(value: unknown): value is Record<string, unknown> | unknown[] {
    return Array.isArray(value) || DataType.isPlainObject(value);
  }

  /** Return a canonical JSON value or reject a non-JSON draft patch operand. */
  protected static requireJsonValue(value: unknown): JSONSchema7Type {
    if (!JsonValue.is(value)) {
      throw new TypeError('Draft patches require finite, acyclic JSON values');
    }

    return value;
  }

  /** Create a fresh draft node wrapping `base`. */
  protected static createNode(base: unknown): DraftNodeInterface {
    return {
      'base': base,
      'children': new Map<PropertyKey, DraftNodeInterface>(),
      'copy': undefined,
      'isArray': Array.isArray(base),
      'proxies': new Map<PropertyKey, unknown>()
    };
  }

  /** Copy-on-write: create `node.copy` from `node.base` on first mutation. */
  protected static ensureCopy(node: DraftNodeInterface): Record<PropertyKey, unknown> | unknown[] {
    if (node.copy === undefined) {
      if (Array.isArray(node.base)) {
        node.copy = Array.from<unknown>(node.base);
      } else if (DataType.isRecord(node.base)) {
        node.copy = { ...node.base };
      } else {
        node.copy = {};
      }
    }

    return node.copy;
  }

  /** Return `true` when `node` or any descendant carries a write. */
  protected static isDirty(node: DraftNodeInterface): boolean {
    if (node.copy !== undefined) {
      return true;
    }

    for (const child of node.children.values()) {
      if (this.isDirty(child)) {
        return true;
      }
    }

    return false;
  }

  /** Return (creating if needed) the memoized child proxy for `node[key]`. */
  protected static getChildProxy(node: DraftNodeInterface, key: PropertyKey, value: unknown): unknown {
    const existingChild = node.children.get(key);

    if (existingChild !== undefined && existingChild.base === value) {
      return node.proxies.get(key);
    }

    const childNode = this.createNode(value);
    const childProxy = this.createProxy(childNode);

    node.children.set(key, childNode);
    node.proxies.set(key, childProxy);

    return childProxy;
  }

  /** Build the `Proxy` handler for a single draft node. */
  protected static createProxy(node: DraftNodeInterface): object {
    const target: Record<PropertyKey, unknown> | unknown[] = node.isArray ? [] : {};

    const deletePropertyHandler = (_target: Record<PropertyKey, unknown> | unknown[], prop: PropertyKey): boolean => {
      const copy = this.ensureCopy(node);

      node.children.delete(prop);
      node.proxies.delete(prop);
      Reflect.deleteProperty(copy, prop);

      return true;
    };

    const getHandler = (_target: Record<PropertyKey, unknown> | unknown[], prop: PropertyKey): unknown => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return undefined;
      }

      const value: unknown = Reflect.get(source, prop, source);

      if (typeof prop === 'symbol' || !this.isDraftable(value)) {
        return value;
      }

      return this.getChildProxy(node, prop, value);
    };

    const getOwnPropertyDescriptorHandler = (_target: Record<PropertyKey, unknown> | unknown[], prop: PropertyKey): PropertyDescriptor | undefined => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return undefined;
      }

      const descriptor = Reflect.getOwnPropertyDescriptor(source, prop);

      if (descriptor === undefined) {
        return undefined;
      }

      descriptor.configurable = !(node.isArray && prop === 'length');

      return descriptor;
    };

    const hasHandler = (_target: Record<PropertyKey, unknown> | unknown[], prop: PropertyKey): boolean => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return false;
      }

      return Reflect.has(source, prop);
    };

    const ownKeysHandler = (_target: Record<PropertyKey, unknown> | unknown[]): ArrayLike<string | symbol> => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return [];
      }

      return Reflect.ownKeys(source);
    };

    const setHandler = (_target: Record<PropertyKey, unknown> | unknown[], prop: PropertyKey, value: unknown): boolean => {
      const copy = this.ensureCopy(node);

      node.children.delete(prop);
      node.proxies.delete(prop);
      Reflect.set(copy, prop, value);

      return true;
    };

    const handler: ProxyHandler<Record<PropertyKey, unknown> | unknown[]> = {
      'deleteProperty': deletePropertyHandler,
      'get': getHandler,
      'getOwnPropertyDescriptor': getOwnPropertyDescriptorHandler,
      'has': hasHandler,
      'ownKeys': ownKeysHandler,
      'set': setHandler
    };

    return new Proxy(target, handler);
  }

  /** Recursively resolve a node to its finalized (structurally-shared) value. */
  protected static finalize(node: DraftNodeInterface): unknown {
    const childEntries: [PropertyKey, DraftNodeInterface, boolean][] = [];
    let anyChildDirty = false;

    for (const [key, childNode] of node.children.entries()) {
      const dirty = this.isDirty(childNode);

      childEntries.push([key, childNode, dirty]);

      if (dirty) {
        anyChildDirty = true;
      }
    }

    if (node.copy === undefined && !anyChildDirty) {
      return node.base;
    }

    const source = node.copy ?? node.base;
    let result: Record<PropertyKey, unknown> | unknown[];

    if (Array.isArray(source)) {
      result = Array.from<unknown>(source);
    } else if (DataType.isRecord(source)) {
      result = { ...source };
    } else {
      return source;
    }

    for (const [key, childNode, dirty] of childEntries) {
      if (dirty) {
        Reflect.set(result, key, this.finalize(childNode));
      }
    }

    return result;
  }

  /** Escape a JSON Pointer path segment (RFC-6901 `~0`/`~1`). */
  protected static escapeSegment(segment: string): string {
    const result = segment.replace(TILDE_PATTERN, '~0').replace(SLASH_PATTERN, '~1');
    return result;
  }

  /** Diff two arbitrary values, dispatching to `diffArray`/`diffObject` or emitting `replace`. */
  protected static diffValues(base: unknown, next: unknown, path: string, ops: PatchOperationInterface[]): void {
    if (base === next) {
      return;
    }

    if (Array.isArray(base) && Array.isArray(next)) {
      this.diffArray(base, next, path, ops);
      return;
    }

    if (DataType.isPlainObject(base) && DataType.isPlainObject(next)) {
      this.diffObject(base, next, path, ops);
      return;
    }

    ops.push({ 'op': 'replace', 'path': path, 'value': this.requireJsonValue(next) });
  }

  /** Diff two arrays index-wise, or emit a single `replace` when the length changed. */
  protected static diffArray(base: unknown[], next: unknown[], path: string, ops: PatchOperationInterface[]): void {
    if (base.length !== next.length) {
      ops.push({ 'op': 'replace', 'path': path, 'value': this.requireJsonValue(next) });
      return;
    }

    const len = base.length;
    for (let i = 0; i < len; i += 1) {
      this.diffValues(base[i], next[i], `${path}/${i}`, ops);
    }
  }

  /** Diff two plain objects key-by-key, emitting `add`/`remove`/`replace` operations. */
  protected static diffObject(
    base: Record<string, unknown>,
    next: Record<string, unknown>,
    path: string,
    ops: PatchOperationInterface[]
  ): void {
    for (const key of Object.keys(base)) {
      if (!(key in next)) {
        ops.push({ 'op': 'remove', 'path': `${path}/${this.escapeSegment(key)}` });
      }
    }

    for (const key of Object.keys(next)) {
      const childPath = `${path}/${this.escapeSegment(key)}`;

      if (!(key in base)) {
        const value = next[key];
        ops.push({ 'op': 'add', 'path': childPath, 'value': this.requireJsonValue(value) });
        continue;
      }

      this.diffValues(base[key], next[key], childPath, ops);
    }
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Mutate a draft proxy of `base` inside `recipe` and return a new value
   * reflecting only the written paths.
   *
   * Unchanged branches are the same reference as in `base` (structural
   * sharing); `base` itself is never mutated. A recipe that writes nothing
   * returns `base` itself (reference identity).
   */
  public static produce<T>(base: T, recipe: (draft: T) => void): T;
  public static produce(base: unknown, recipe: (draft: never) => void): unknown;
  public static produce(base: unknown, recipe: (draft: never) => void): unknown {
    const rootNode = this.createNode(base);
    const proxy = this.createProxy(rootNode);

    Reflect.apply(recipe, undefined, [proxy]);

    return this.finalize(rootNode);
  }

  /**
   * Same mechanics as `produce`, additionally returning the RFC-6902 patch
   * (`PatchOperationInterface[]`) describing the difference between `base` and
   * the result. `Patch.create(patch).apply(base)` reproduces `next`.
   */
  public static producePatch<T>(
    base: T,
    recipe: (draft: T) => void
  ): { 'next': T; 'patch': PatchOperationInterface[] };
  public static producePatch(
    base: unknown,
    recipe: (draft: never) => void
  ): { 'next': unknown; 'patch': PatchOperationInterface[] };
  public static producePatch(
    base: unknown,
    recipe: (draft: never) => void
  ): { 'next': unknown; 'patch': PatchOperationInterface[] } {
    this.requireJsonValue(base);
    const next: unknown = Reflect.apply(this.produce, this, [base, recipe]);
    this.requireJsonValue(next);
    const ops: PatchOperationInterface[] = [];

    this.diffValues(base, next, '', ops);

    return { 'next': next, 'patch': ops };
  }
}
