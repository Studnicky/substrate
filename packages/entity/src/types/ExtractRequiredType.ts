/**
 * Extracts the union of a schema literal's `required` field names, or `never`
 * when absent.
 *
 * @module
 */
export type ExtractRequiredType<TSchema>
  = TSchema extends { 'required': readonly (infer TRequired extends string)[] }
    ? TRequired
    : never;
