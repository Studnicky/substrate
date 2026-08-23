/**
 * Patch — RFC-6902 JSON Patch operations.
 *
 * Supports: add, remove, replace, move, copy, test.
 * Paths must be JSON Pointer strings (RFC-6901): `/foo/bar`, `/items/0`.
 * Parse externally supplied operations through `PatchOperationEntity.intake`
 * or `PatchOperationsEntity.intake` before constructing a patch.
 *
 * Subclass `Patch` and override any `protected` step to customise patch
 * behaviour.
 */

import type { PatchOperationEntity } from '../entities/PatchOperationEntity.js';
import type { PatchOperationsEntity } from '../entities/PatchOperationsEntity.js';

import { ESCAPED_SLASH_PATTERN, ESCAPED_TILDE_PATTERN } from '../constants/JsonPointerConstants.js';
import { JsonObjectEntity } from '../entities/JsonObjectEntity.js';
import { JsonValueEntity } from '../entities/JsonValueEntity.js';
import { PatchError } from '../errors/PatchError.js';
import { ARRAY_INDEX_PATTERN } from './constants/PatchConstants.js';
import { DataType } from './DataType.js';

interface PatchSubclassInterface<TInstance extends Patch> extends Function {
  readonly 'prototype': TInstance;
}

class PatchInstance {
  static belongsTo<TInstance extends Patch>(
    constructor: PatchSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class Patch {
  readonly #operations: readonly PatchOperationEntity.Type[];

  /**
   * Canonical entry point — builds a `Patch` instance from parsed operations
   * (or the subclass instance when called on a subclass, e.g. `SubClass.create(...)`).
   */
  public static create<TInstance extends Patch = Patch>(
    this: PatchSubclassInterface<TInstance>,
    operations: PatchOperationEntity.Type | PatchOperationsEntity.Type = []
  ): TInstance {
    const result: unknown = Reflect.construct(this, [operations]);
    if (result === null || typeof result !== 'object' || !PatchInstance.belongsTo(this, result)) {
      throw new TypeError('Patch.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(operations: PatchOperationEntity.Type | PatchOperationsEntity.Type = []) {
    const parsedOperations = Array.isArray(operations) ? operations : [operations];
    this.#operations = structuredClone<PatchOperationEntity.Type[]>(Array.from(parsedOperations));
  }

  /** Return a deeply isolated projection of the patch operations. */
  public get operations(): readonly PatchOperationEntity.Type[] {
    const operations: PatchOperationEntity.Type[] = [];
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
   * Apply this patch to a parsed JSON object (mutates it in-place, per RFC-6902).
   *
   * Throws `PatchError` if any operation cannot be applied.
   */
  public apply(target: JsonObjectEntity.Type): JsonObjectEntity.Type {
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
  protected getValue(target: JsonObjectEntity.Type, path: string): JsonValueEntity.Type {
    const parts = this.parsePath(path);
    let current: JsonValueEntity.Type = target;

    const partLength = parts.length;
    for (let i = 0; i < partLength; i += 1) {
      const part = parts[i]!;

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }

      if (!Reflect.has(current, part)) {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }
      const rawValue: unknown = Reflect.get(current, part);
      if (!JsonValueEntity.validate(rawValue)) {
        throw new PatchError(`Path contains a non-JSON value: ${path}`, 'getValue', path);
      }
      current = rawValue;
    }

    return current;
  }

  /** Return `true` when `path` resolves to a value in `target`. */
  protected hasValue(target: JsonObjectEntity.Type, path: string): boolean {
    try {
      this.getValue(target, path);

      return true;
    } catch {
      return false;
    }
  }

  /** Write `value` at `path` in `target`, creating intermediate objects. */
  protected setValue(target: JsonObjectEntity.Type, path: string, value: JsonValueEntity.Type): void {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      // Replace root — not applicable to in-place mutation; caller must handle
      return;
    }

    let current: JsonValueEntity.Type = target;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (part === undefined) {
        break;
      }

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Intermediate path not traversable: ${path}`, 'setValue', path);
      }

      if (!Reflect.has(current, part)) {
        Reflect.set(current, part, JsonObjectEntity.create());
      }
      const rawValue: unknown = Reflect.get(current, part);
      if (!JsonValueEntity.validate(rawValue)) {
        throw new PatchError(`Intermediate path contains a non-JSON value: ${path}`, 'setValue', path);
      }
      current = rawValue;
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
  protected removeValue(target: JsonObjectEntity.Type, path: string): void {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      return;
    }

    let current: JsonValueEntity.Type = target;

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
      const rawValue: unknown = Reflect.get(current, part);
      if (!JsonValueEntity.validate(rawValue)) {
        throw new PatchError(`Path contains a non-JSON value: ${path}`, 'removeValue', path);
      }
      current = rawValue;
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
      const { 'deleteProperty': removeProperty } = Reflect;
      removeProperty(current, lastPart);
    }
  }

  /** Apply a single RFC-6902 `add` operation. */
  private applyAdd(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    this.setValue(target, op.path, this.requireValue(op));
  }

  /**
   * Traverse `path` once and resolve the container/key to write for a
   * `replace` operation. Throws `PatchError` when any segment of `path`
   * (intermediate or final) does not already exist. Returns `undefined`
   * for the root path (replace-in-place on root is a no-op, matching
   * `setValue`'s root handling).
   */
  private resolveReplaceTarget(
    target: JsonObjectEntity.Type,
    path: string
  ): { 'container': JsonObjectEntity.Type | JsonValueEntity.Type[]; 'key': string } | undefined {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      return undefined;
    }

    let current: JsonValueEntity.Type = target;

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
      const rawValue: unknown = Reflect.get(current, part);
      if (!JsonValueEntity.validate(rawValue)) {
        throw new PatchError(`Cannot replace a non-JSON path: ${path}`, 'replace', path);
      }
      current = rawValue;
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
  private applyReplace(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    const resolved = this.resolveReplaceTarget(target, op.path);

    if (resolved === undefined) {
      return;
    }
    Reflect.set(resolved.container, resolved.key, this.requireValue(op));
  }

  /** Apply a single RFC-6902 `remove` operation. */
  private applyRemove(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    this.removeValue(target, op.path);
  }

  /** Apply a single RFC-6902 `copy` operation. */
  private applyCopy(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    const copied = this.getValue(target, this.requireFrom(op));

    this.setValue(target, op.path, copied);
  }

  /** Apply a single RFC-6902 `move` operation. */
  private applyMove(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    const from = this.requireFrom(op);
    const moved = this.getValue(target, from);

    this.removeValue(target, from);
    this.setValue(target, op.path, moved);
  }

  /** Apply a single RFC-6902 `test` operation. */
  private applyTest(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    const actual = this.getValue(target, op.path);

    const expected = this.requireValue(op);
    if (!DataType.deepEqual(actual, expected)) {
      throw new PatchError(
        `Test failed at ${op.path}: expected ${String(expected)}, got ${String(actual)}`,
        op.op,
        op.path
      );
    }
  }

  readonly #operationAppliers = new Map<string, (target: JsonObjectEntity.Type, operation: PatchOperationEntity.Type) => void>([
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
  protected applyOperation(target: JsonObjectEntity.Type, op: PatchOperationEntity.Type): void {
    const applier = this.#operationAppliers.get(op.op);

    if (applier === undefined) {
      throw new PatchError(`Unknown patch operation: ${String(op.op)}`, String(op.op), op.path);
    }
    applier(target, op);
  }

  /** Produce a human-readable description of a single operation. */
  protected describeOp(op: PatchOperationEntity.Type): string {
    const description = Patch.operationDescriptions.get(op.op);
    if (description !== undefined) {
      const source = description.includesSource ? `${this.requireFrom(op)} → ` : '';
      const value = description.includesValue ? ` = ${JSON.stringify(this.requireValue(op))}` : '';
      const result = `${description.label} ${source}${op.path}${value}`;
      return result;
    }
    const result = `${String(op.op).toUpperCase()} ${op.path}`;
    return result;
  }

  /** Return an operation's schema-required JSON operand. */
  private requireValue(operation: PatchOperationEntity.Type): JsonValueEntity.Type {
    if (!('value' in operation)) {
      throw new PatchError(`${operation.op} operation requires "value"`, operation.op, operation.path);
    }
    return operation.value;
  }

  /** Return an operation's schema-required source pointer. */
  private requireFrom(operation: PatchOperationEntity.Type): string {
    if (!('from' in operation)) {
      throw new PatchError(`${operation.op} operation requires "from"`, operation.op, operation.path);
    }
    return operation.from;
  }
}
