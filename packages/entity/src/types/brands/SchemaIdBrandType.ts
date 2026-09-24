/**
 * Phantom brand for the `$id` JSON Schema constraint keyword.
 * Carries the schema $id literal so different schema identities are incompatible.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const SCHEMA_ID: unique symbol;

export type SchemaIdBrandType<Id extends string> = IdentityType<{ [SCHEMA_ID]: Id }> & string;
