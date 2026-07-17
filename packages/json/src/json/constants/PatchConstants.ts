import type { PatchOpVariantType } from '../../types/index.js';

/** RFC-6902 JSON Patch operation names accepted by {@link Patch}. */
export const VALID_OPS = new Set<PatchOpVariantType>(['add', 'copy', 'move', 'remove', 'replace', 'test']);

/** Matches a valid RFC-6901 array index segment (`0` or a non-zero-leading decimal), used by {@link Patch}. */
export const ARRAY_INDEX_PATTERN = /^(?:0|[1-9]\d*)$/u;
