import type { ObjectSchemaShapeInterface } from '../interfaces/ObjectSchemaShapeInterface.js';
import type { IdentityType } from './IdentityType.js';

/**
 * The schema literal `Compose.omit` returns: the same schema with `TKeys`
 * removed from `properties` and `required`.
 *
 * @module
 */
export type OmitSchemaType<
  TSchema extends ObjectSchemaShapeInterface,
  TKeys extends keyof NonNullable<TSchema['properties']>
> = IdentityType<
  Omit<TSchema, 'properties' | 'required'> & {
    'properties': Omit<NonNullable<TSchema['properties']>, TKeys>;
    'required': Exclude<NonNullable<TSchema['required']>[number], TKeys>[];
  }
>;
