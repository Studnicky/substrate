import type { JsonValueEntity } from '../entities/JsonValueEntity.js';
import type { PathWildcardResultEntity } from '../entities/PathWildcardResultEntity.js';

/** Wildcard sentinel returned when `[*]` is encountered in a path expression. */
export interface PathWildcardResultInterface {
  'array': JsonValueEntity.Type[];
  'isWildcard': PathWildcardResultEntity.Type['isWildcard'];
  'remainingPath': PathWildcardResultEntity.Type['remainingPath'];
}
