import type { JSONSchema7Type } from 'json-schema';

import type { RuntimeValueDateInterface } from './RuntimeValueDateInterface.js';
import type { RuntimeValueMapInterface } from './RuntimeValueMapInterface.js';
import type { RuntimeValueRecordInterface } from './RuntimeValueRecordInterface.js';
import type { RuntimeValueSetInterface } from './RuntimeValueSetInterface.js';

export interface RuntimeValueArrayInterface extends ReadonlyArray<
  JSONSchema7Type | undefined | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface
> {}
