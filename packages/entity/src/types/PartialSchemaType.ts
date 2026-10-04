import type { IdentityType } from './IdentityType.js';

/**
 * The schema literal `Compose.partial` returns: the same schema with an empty
 * `required` array, so every property becomes optional.
 *
 * @module
 */
export type PartialSchemaType<TSchema> = IdentityType<Omit<TSchema, 'required'> & { 'required': never[] }>;
