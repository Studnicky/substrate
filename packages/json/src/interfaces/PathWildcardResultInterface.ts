import type { PathWildcardResultEntity } from '../entities/PathWildcardResultEntity.js';

/** Wildcard sentinel returned during path traversal. */
export interface PathWildcardResultInterface extends PathWildcardResultEntity.Type {
  'array': unknown[];
}
