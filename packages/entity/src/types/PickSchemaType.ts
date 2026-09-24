import type { ObjectSchemaShapeInterface } from '../interfaces/ObjectSchemaShapeInterface.js';
import type { IdentityType } from './IdentityType.js';

/**
 * The schema literal `Compose.pick` returns: the same schema with `properties`
 * and `required` narrowed to `TKeys`. A single-level intersection over the
 * schema's own two fields, not a walk into nested property schemas.
 *
 * @module
 */
export type PickSchemaType<
  TSchema extends ObjectSchemaShapeInterface,
  TKeys extends keyof NonNullable<TSchema['properties']>
> = IdentityType<
  Omit<TSchema, 'properties' | 'required'> & {
    'properties': Pick<NonNullable<TSchema['properties']>, TKeys>;
    'required': Extract<NonNullable<TSchema['required']>[number], TKeys>[];
  }
>;
