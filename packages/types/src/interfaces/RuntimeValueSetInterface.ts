import type { JSONSchema7Type } from 'json-schema';

import type { RuntimeValueArrayInterface } from './RuntimeValueArrayInterface.js';
import type { RuntimeValueDateInterface } from './RuntimeValueDateInterface.js';
import type { RuntimeValueMapInterface } from './RuntimeValueMapInterface.js';
import type { RuntimeValueRecordInterface } from './RuntimeValueRecordInterface.js';

export interface RuntimeValueSetInterface extends ReadonlySet<
  JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueRecordInterface | RuntimeValueSetInterface
> {}
