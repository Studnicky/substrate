import type { ObjectSchemaShapeInterface } from '../interfaces/ObjectSchemaShapeInterface.js';
import type { IdentityType } from './IdentityType.js';

/**
 * The schema literal `Compose.extend` returns: `TSchema` with `TExtension`'s
 * `properties` and `required` merged in, `TExtension` taking precedence on
 * key collision.
 *
 * @module
 */
export type ExtendSchemaType<TSchema extends ObjectSchemaShapeInterface, TExtension extends ObjectSchemaShapeInterface> = IdentityType<
  Omit<TSchema, 'properties' | 'required'> & {
    'properties': NonNullable<TExtension['properties']> & Omit<NonNullable<TSchema['properties']>, keyof NonNullable<TExtension['properties']>>;
    'required': (keyof NonNullable<TSchema['properties']> | keyof NonNullable<TExtension['properties']>)[];
  }
>;
