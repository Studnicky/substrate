import type { QueryParametersEntity } from '../entities/QueryParametersEntity.js';

/**
 * Query parameters accepted by URL construction, including `undefined` values that are omitted.
 *
 * `QueryParametersEntity` owns the JSON-safe scalar-and-array form. This runtime contract adds
 * omission markers used by `UrlQueryString` while preserving that canonical value definition.
 */
export interface QueryParametersInterface {
  [key: string]:
    | Exclude<QueryParametersEntity.Type[string], readonly unknown[]>
    | undefined
    | readonly (Exclude<QueryParametersEntity.Type[string], readonly unknown[]> | undefined)[];
}
