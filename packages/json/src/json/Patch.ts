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

interface PatchSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class PatchInstance {
  static belongsTo<TInstance>(
    constructor: PatchSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class Patch {
  readonly #operations: readonly PatchOperationInterface[];

  private static readonly operationKeys = new Set(['from', 'op', 'path', 'value']);

  /** Validate and normalize an unknown operation into its canonical wire contract. */
  private static parseOperation(candidate: unknown): PatchOperationInterface | undefined {
    if (!JsonObject.is(candidate)) {
      return undefined;
    }

    const candidateKeys = Object.keys(candidate);
    const candidateKeyLength = candidateKeys.length;
    for (let index = 0; index < candidateKeyLength; index += 1) {
      const key = candidateKeys[index];
      if (key === undefined) {
        continue;
      }
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
   * Canonical entry point — validates operations and returns a `Patch` instance
   * (or the subclass instance when called on a subclass, e.g. `SubClass.create(...)`).
   */
  public static create<TInstance extends Patch = Patch>(
    this: PatchSubclassInterface<TInstance>,
    operations: unknown = []
  ): TInstance {
    const result: unknown = Reflect.construct(this, [operations]);
    if (!PatchInstance.belongsTo(this, result)) {
      throw new TypeError('Patch.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(operations: unknown = []) {
    const candidates = Array.isArray(operations) ? Array.from<unknown>(operations) : [operations];
    const ops: PatchOperationInterface[] = [];
    const operationLength = candidates.length;
    for (let i = 0; i < operationLength; i += 1) {
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
    const operations: PatchOperationInterface[] = [];
    const operationLength = this.#operations.length;
    for (let index = 0; index < operationLength; index += 1) {
      const operation = this.#operations[index];
      if (operation !== undefined) {
        operations.push(structuredClone(operation));
      }
    }
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
    const operationLength = this.#operations.length;
    for (let index = 0; index < operationLength; index += 1) {
      const op = this.#operations[index];
      if (op === undefined) {
        continue;
      }
      const operation = structuredClone(op);
      this.applyOperation(target, operation);
    }

    const result = target;
    return result;
  }

  /** Return `true` when the patch has no operations. */
  public isEmpty(): boolean {
    const result = this.#operations.length === 0;
    return result;
  }

  /** Human-readable summary of operations. */
  public toString(): string {
    const descriptions: string[] = [];
    const operationLength = this.#operations.length;
    for (let index = 0; index < operationLength; index += 1) {
      const operation = this.#operations[index];
      if (operation !== undefined) {
        descriptions.push(this.describeOp(operation));
      }
    }
    const result = descriptions.join(', ');
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

    const result = path.slice(1).split('/').map((part) =>
    { const result = part.replace(ESCAPED_SLASH_PATTERN, '/').replace(ESCAPED_TILDE_PATTERN, '~'); return result; }
    );
    return result;
  }

  /** Read the value at `path` from `target`. */
  protected getValue(target: Record<string, unknown>, path: string): unknown {
    const parts = this.parsePath(path);
    let current: unknown = target;

    const partLength = parts.length;
    for (let i = 0; i < partLength; i += 1) {
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

  readonly #operationAppliers = new Map<string, (target: Record<string, unknown>, operation: PatchOperationInterface) => void>([
    ['add', (target, operation) => { this.applyAdd(target, operation); }],
    ['copy', (target, operation) => { this.applyCopy(target, operation); }],
    ['move', (target, operation) => { this.applyMove(target, operation); }],
    ['remove', (target, operation) => { this.applyRemove(target, operation); }],
    ['replace', (target, operation) => { this.applyReplace(target, operation); }],
    ['test', (target, operation) => { this.applyTest(target, operation); }]
  ]);

  private static readonly operationDescriptions = new Map<string, { 'includesSource': boolean; 'includesValue': boolean; 'label': string }>([
    ['add', { 'includesSource': false, 'includesValue': true, 'label': 'ADD' }],
    ['copy', { 'includesSource': true, 'includesValue': false, 'label': 'COPY' }],
    ['move', { 'includesSource': true, 'includesValue': false, 'label': 'MOVE' }],
    ['remove', { 'includesSource': false, 'includesValue': false, 'label': 'REMOVE' }],
    ['replace', { 'includesSource': false, 'includesValue': true, 'label': 'REPLACE' }],
    ['test', { 'includesSource': false, 'includesValue': true, 'label': 'TEST' }]
  ]);

  /** Apply a single RFC-6902 operation to `target`. */
  protected applyOperation(target: Record<string, unknown>, op: PatchOperationInterface): void {
    const applier = this.#operationAppliers.get(op.op);

    if (applier === undefined) {
      throw new PatchError(`Unknown patch operation: ${String(op.op)}`, String(op.op), op.path);
    }
    applier(target, op);
  }

  /** Produce a human-readable description of a single operation. */
  protected describeOp(op: PatchOperationInterface): string {
    const description = Patch.operationDescriptions.get(op.op);
    if (description !== undefined) {
      const source = description.includesSource ? `${op.from ?? '?'} → ` : '';
      const value = description.includesValue ? ` = ${JSON.stringify(op.value)}` : '';
      const result = `${description.label} ${source}${op.path}${value}`;
      return result;
    }
    const result = `${String(op.op).toUpperCase()} ${op.path}`;
    return result;
  }
}
