/**
 * Extracts a schema literal's `properties` map, or `never` when absent.
 *
 * @module
 */
export type ExtractPropertiesType<TSchema>
  = TSchema extends { readonly 'properties': infer TProperties extends Record<string, unknown> }
    ? TProperties
    : never;
