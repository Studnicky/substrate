/**
 * Query string parameters object
 */
export interface QueryParamsInterface {
  [key: string]: boolean | null | number | string | undefined | (boolean | null | number | string | undefined)[];
}
