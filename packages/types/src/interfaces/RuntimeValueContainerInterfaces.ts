import type { JSONSchema7Type } from 'json-schema';

import type { RuntimeValueDateInterface } from './RuntimeValueDateInterface.js';

/**
 * The Array/Map/Record/Set runtime-value contracts are mutually recursive by
 * definition (each may nest the others), so they are declared together here —
 * splitting them across files would force a circular import between them.
 */
export interface RuntimeValueArrayInterface extends ReadonlyArray<
  JSONSchema7Type | undefined | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface
> {}

export interface RuntimeValueMapInterface extends ReadonlyMap<
  JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface,
  JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface
> {}

export interface RuntimeValueRecordInterface {
  readonly [key: string]: JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueSetInterface;
}

export interface RuntimeValueSetInterface extends ReadonlySet<
  JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface
> {}
