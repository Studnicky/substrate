/**
 * @studnicky/json — JSON/object value-tools.
 *
 * Named exports, one class per file:
 * - Clone      — deep clone (Map/Set/Date aware) + shallow clone
 * - Draft      — Proxy-based "mutate a draft, get an immutable result" primitive
 * - Frozen     — cycle-safe deep freeze
 * - Hash       — FNV-1a 32-bit hash for arbitrary in-memory values
 * - ImmutableSnapshot — detached deeply frozen snapshot
 * - Merge      — V8-monomorphic deep merge
 * - Patch      — RFC-6902 JSON Patch (add/remove/replace/move/copy/test)
 * - JsonError  — abstract base error for all json package errors
 * - PatchError — error thrown when a patch operation fails
 * - Path       — JSON Pointer → access notation + proto-safe dot-path get
 * - Sort       — natural sort + length comparators
 * - StructuralHash — schema hash with metadata-key stripping
 */

export { FrozenMutationError, ImmutableSnapshotError, JsonError, PatchError } from './errors/index.js';
export { Clone } from './json/index.js';
export { Draft } from './json/index.js';
export { Frozen } from './json/index.js';
export { Hash } from './json/index.js';
export { ImmutableSnapshot } from './json/index.js';
export { Merge } from './json/index.js';
export { Patch } from './json/index.js';
export { Path } from './json/index.js';
export { Sort } from './json/index.js';
export { StructuralHash } from './json/index.js';
