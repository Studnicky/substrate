import type { ObjectSchemaShapeInterface } from '../interfaces/ObjectSchemaShapeInterface.js';
import type { IdentityType } from './IdentityType.js';

/**
 * The schema literal `Compose.require` returns: the same schema with every
 * property key listed in `required`.
 *
 * @module
 */
export type RequiredSchemaType<TSchema extends ObjectSchemaShapeInterface> = IdentityType<
  Omit<TSchema, 'required'> & { 'required': (keyof NonNullable<TSchema['properties']>)[] }
>;
