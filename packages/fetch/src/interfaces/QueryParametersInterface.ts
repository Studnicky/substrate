/**
 * Query string parameters object
 */
export interface QueryParametersInterface {
  [key: string]: boolean | null | number | string | undefined | (boolean | null | number | string | undefined)[];
}
