import type { PathWildcardResultEntity } from '../entities/PathWildcardResultEntity.js';

/** Wildcard sentinel returned when `[*]` is encountered in a path expression. */
export interface PathWildcardResultInterface {
  'array': unknown[];
  'isWildcard': PathWildcardResultEntity.Type['isWildcard'];
  'remainingPath': PathWildcardResultEntity.Type['remainingPath'];
}
