/**
 * Patch — RFC-6902 JSON Patch operations.
 *
 * Supports: add, remove, replace, move, copy, test.
 * Paths must be JSON Pointer strings (RFC-6901): `/foo/bar`, `/items/0`.
 *
 * Subclass `Patch` and override any `protected` step to customise patch
 * behaviour.
 */

import { JsonObject, JsonValue } from '@studnicky/types';

import type { PatchOperationInterface } from '../interfaces/PatchOperationInterface.js';

import { ESCAPED_SLASH_PATTERN, ESCAPED_TILDE_PATTERN } from '../constants/JsonPointerConstants.js';
import { PatchOperationCoreEntity } from '../entities/PatchOperationCoreEntity.js';
import { PatchError } from '../errors/PatchError.js';
import { ARRAY_INDEX_PATTERN } from './constants/PatchConstants.js';
import { DataType } from './DataType.js';

export class Patch {
  readonly #operations: readonly PatchOperationInterface[];

  private static readonly operationKeys = new Set(['from', 'op', 'path', 'value']);

  /** Validate and normalize an unknown operation into its canonical wire contract. */
  private static parseOperation(candidate: unknown): PatchOperationInterface | undefined {
    if (!JsonObject.is(candidate)) {
      return undefined;
    }

    for (const key of Object.keys(candidate)) {
      if (!Patch.operationKeys.has(key)) {
        return undefined;
      }
    }

    const coreCandidate = {
      ...(Reflect.has(candidate, 'from') ? { 'from': Reflect.get(candidate, 'from') } : {}),
      'op': Reflect.get(candidate, 'op'),
      'path': Reflect.get(candidate, 'path')
    };

    if (!PatchOperationCoreEntity.validate(coreCandidate)) {
      return undefined;
    }

    if (!Reflect.has(candidate, 'value')) {
      return coreCandidate;
    }

    const value: unknown = Reflect.get(candidate, 'value');
    if (!JsonValue.is(value)) {
      return undefined;
    }

    return { ...coreCandidate, 'value': value };
  }

  /**
   * Canonical entry point — validates operations and returns a `Patch` instance.
   *
   * Subclasses inherit this as `SubClass.create(...)`; `new this(...)` resolves
   * to the receiver's concrete class.
   */
  public static create(operations: unknown = []): Patch {
    return new this(operations);
  }

  protected constructor(operations: unknown = []) {
    const candidates = Array.isArray(operations) ? Array.from<unknown>(operations) : [operations];
    const ops: PatchOperationInterface[] = [];
    const opsLen = candidates.length;
    for (let i = 0; i < opsLen; i += 1) {
      const candidate = candidates[i];

      const operation = Patch.parseOperation(candidate);
      if (operation === undefined) {
        const operationName: unknown = candidate !== null && typeof candidate === 'object'
          ? Reflect.get(candidate, 'op')
          : candidate;
        const operationPath: unknown = candidate !== null && typeof candidate === 'object'
          ? Reflect.get(candidate, 'path')
          : undefined;

        throw new PatchError(
          `Invalid patch operation "${String(operationName)}"`,
          String(operationName),
          typeof operationPath === 'string' ? operationPath : ''
        );
      }

      ops.push(operation);
    }

    this.#operations = structuredClone(ops);
  }

  /** Return a deeply isolated projection of the patch operations. */
  public get operations(): readonly PatchOperationInterface[] {
    const operations = this.#operations.map((operation) => {
      const snapshot = structuredClone(operation);
      return snapshot;
    });
    return operations;
  }

  // ---------------------------------------------------------------------------
  // Instance methods
  // ---------------------------------------------------------------------------

  /**
   * Apply this patch to `target` (mutates target in-place, per RFC-6902).
   *
   * Throws `PatchError` if any operation cannot be applied.
   */
  public apply(target: Record<string, unknown>): Record<string, unknown> {
    for (const op of this.#operations) {
      const operation = structuredClone(op);
      this.applyOperation(target, operation);
    }

    return target;
  }

  /** Return `true` when the patch has no operations. */
  public isEmpty(): boolean {
    return this.#operations.length === 0;
  }

  /** Human-readable summary of operations. */
  public toString(): string {
    const result = this.#operations
      .map((op) => { const result = this.describeOp(op); return result; })
      .join(', ');
    return result;
  }

  // ---------------------------------------------------------------------------
  // Protected implementation steps — override to customise behaviour
  // ---------------------------------------------------------------------------

  /** Parse a JSON Pointer string into path segments. */
  protected parsePath(path: string): string[] {
    if (!path.startsWith('/') && path !== '') {
      throw new PatchError(`Path must start with /: ${path}`, 'parsePath', path);
    }
    if (path === '' || path === '/') {
      return [];
    }

    return path.slice(1).split('/').map((part) =>
    { const result = part.replace(ESCAPED_SLASH_PATTERN, '/').replace(ESCAPED_TILDE_PATTERN, '~'); return result; }
    );
  }

  /** Read the value at `path` from `target`. */
  protected getValue(target: Record<string, unknown>, path: string): unknown {
    const parts = this.parsePath(path);
    let current: unknown = target;

    const partsLen = parts.length;
    for (let i = 0; i < partsLen; i++) {
      const part = parts[i]!;

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }

      if (!Reflect.has(current, part)) {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }
      current = Reflect.get(current, part);
    }

    return current;
  }

  /** Return `true` when `path` resolves to a value in `target`. */
  protected hasValue(target: Record<string, unknown>, path: string): boolean {
    try {
      this.getValue(target, path);

      return true;
    } catch {
      return false;
    }
  }

  /** Write `value` at `path` in `target`, creating intermediate objects. */
  protected setValue(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      // Replace root — not applicable to in-place mutation; caller must handle
      return;
    }

    let current: unknown = target;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (part === undefined) {
        break;
      }

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Intermediate path not traversable: ${path}`, 'setValue', path);
      }

      if (!Reflect.has(current, part)) {
        Reflect.set(current, part, {});
      }
      current = Reflect.get(current, part);
    }

    const lastPart = parts.at(-1);

    if (lastPart === undefined) {
      return;
    }

    if (current === null || typeof current !== 'object') {
      throw new PatchError(`Cannot set on non-object at: ${path}`, 'setValue', path);
    }

    Reflect.set(current, lastPart, value);
  }

  /** Remove the value at `path` from `target`. */
  protected removeValue(target: Record<string, unknown>, path: string): void {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      return;
    }

    let current: unknown = target;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (part === undefined) {
        break;
      }

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Path not found: ${path}`, 'removeValue', path);
      }

      if (!Reflect.has(current, part)) {
        throw new PatchError(`Path not found: ${path}`, 'removeValue', path);
      }
      current = Reflect.get(current, part);
    }

    const lastPart = parts.at(-1);

    if (lastPart === undefined) {
      return;
    }

    if (current === null || typeof current !== 'object') {
      throw new PatchError(`Cannot remove from non-object: ${path}`, 'removeValue', path);
    }

    if (Array.isArray(current)) {
      if (!ARRAY_INDEX_PATTERN.test(lastPart)) {
        throw new PatchError(`Invalid array index in path: ${path}`, 'removeValue', path);
      }

      current.splice(parseInt(lastPart, 10), 1);
    } else {
      Reflect.deleteProperty(current, lastPart);
    }
  }

  /** Apply a single RFC-6902 `add` operation. */
  private applyAdd(target: Record<string, unknown>, op: PatchOperationInterface): void {
    this.setValue(target, op.path, op.value);
  }

  /**
   * Traverse `path` once and resolve the container/key to write for a
   * `replace` operation. Throws `PatchError` when any segment of `path`
   * (intermediate or final) does not already exist. Returns `undefined`
   * for the root path (replace-in-place on root is a no-op, matching
   * `setValue`'s root handling).
   */
  private resolveReplaceTarget(
    target: Record<string, unknown>,
    path: string
  ): { 'container': object; 'key': string } | undefined {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      return undefined;
    }

    let current: unknown = target;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (part === undefined) {
        break;
      }

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Cannot replace non-existent path: ${path}`, 'replace', path);
      }

      if (!Reflect.has(current, part)) {
        throw new PatchError(`Cannot replace non-existent path: ${path}`, 'replace', path);
      }
      current = Reflect.get(current, part);
    }

    const lastPart = parts.at(-1);

    if (lastPart === undefined) {
      return undefined;
    }

    if (current === null || typeof current !== 'object') {
      throw new PatchError(`Cannot replace non-existent path: ${path}`, 'replace', path);
    }

    if (!Reflect.has(current, lastPart)) {
      throw new PatchError(`Cannot replace non-existent path: ${path}`, 'replace', path);
    }

    return { 'container': current, 'key': lastPart };
  }

  /** Apply a single RFC-6902 `replace` operation. */
  private applyReplace(target: Record<string, unknown>, op: PatchOperationInterface): void {
    const resolved = this.resolveReplaceTarget(target, op.path);

    if (resolved === undefined) {
      return;
    }
    Reflect.set(resolved.container, resolved.key, op.value);
  }

  /** Apply a single RFC-6902 `remove` operation. */
  private applyRemove(target: Record<string, unknown>, op: PatchOperationInterface): void {
    this.removeValue(target, op.path);
  }

  /** Apply a single RFC-6902 `copy` operation. */
  private applyCopy(target: Record<string, unknown>, op: PatchOperationInterface): void {
    if (op.from === undefined) {
      throw new PatchError('copy operation requires "from"', op.op, op.path);
    }
    const copied = this.getValue(target, op.from);

    this.setValue(target, op.path, copied);
  }

  /** Apply a single RFC-6902 `move` operation. */
  private applyMove(target: Record<string, unknown>, op: PatchOperationInterface): void {
    if (op.from === undefined) {
      throw new PatchError('move operation requires "from"', op.op, op.path);
    }
    const moved = this.getValue(target, op.from);

    this.removeValue(target, op.from);
    this.setValue(target, op.path, moved);
  }

  /** Apply a single RFC-6902 `test` operation. */
  private applyTest(target: Record<string, unknown>, op: PatchOperationInterface): void {
    const actual = this.getValue(target, op.path);

    if (!DataType.deepEqual(actual, op.value)) {
      throw new PatchError(
        `Test failed at ${op.path}: expected ${String(op.value)}, got ${String(actual)}`,
        op.op,
        op.path
      );
    }
  }

  private static readonly operationAppliers: Record<
    string,
    (self: Patch, target: Record<string, unknown>, op: PatchOperationInterface) => void
  > = {
    'add': (self, target, op) => { self.applyAdd(target, op); },
    'copy': (self, target, op) => { self.applyCopy(target, op); },
    'move': (self, target, op) => { self.applyMove(target, op); },
    'remove': (self, target, op) => { self.applyRemove(target, op); },
    'replace': (self, target, op) => { self.applyReplace(target, op); },
    'test': (self, target, op) => { self.applyTest(target, op); }
  };

  /** Apply a single RFC-6902 operation to `target`. */
  protected applyOperation(target: Record<string, unknown>, op: PatchOperationInterface): void {
    const applier = Patch.operationAppliers[op.op];

    if (applier === undefined) {
      throw new PatchError(`Unknown patch operation: ${String(op.op)}`, String(op.op), op.path);
    }
    applier(this, target, op);
  }

  /** Produce a human-readable description of a single operation. */
  protected describeOp(op: PatchOperationInterface): string {
    switch (op.op) {
      case 'add':
        return `ADD ${op.path} = ${JSON.stringify(op.value)}`;
      case 'copy':
        return `COPY ${op.from ?? '?'} → ${op.path}`;
      case 'move':
        return `MOVE ${op.from ?? '?'} → ${op.path}`;
      case 'remove':
        return `REMOVE ${op.path}`;
      case 'replace':
        return `REPLACE ${op.path} = ${JSON.stringify(op.value)}`;
      case 'test':
        return `TEST ${op.path} = ${JSON.stringify(op.value)}`;
      default:
        return `${String(op.op).toUpperCase()} ${op.path}`;
    }
  }
}
