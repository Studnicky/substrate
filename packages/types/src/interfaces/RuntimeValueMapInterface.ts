import type { JSONSchema7Type } from 'json-schema';

import type { RuntimeValueArrayInterface } from './RuntimeValueArrayInterface.js';
import type { RuntimeValueDateInterface } from './RuntimeValueDateInterface.js';
import type { RuntimeValueRecordInterface } from './RuntimeValueRecordInterface.js';
import type { RuntimeValueSetInterface } from './RuntimeValueSetInterface.js';

export interface RuntimeValueMapInterface extends ReadonlyMap<
  JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface,
  JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface
> {}
