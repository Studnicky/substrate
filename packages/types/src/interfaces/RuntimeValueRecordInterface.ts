import type { JSONSchema7Type } from 'json-schema';

import type { RuntimeValueArrayInterface } from './RuntimeValueArrayInterface.js';
import type { RuntimeValueDateInterface } from './RuntimeValueDateInterface.js';
import type { RuntimeValueMapInterface } from './RuntimeValueMapInterface.js';
import type { RuntimeValueSetInterface } from './RuntimeValueSetInterface.js';

export interface RuntimeValueRecordInterface {
  readonly [key: string]: JSONSchema7Type | undefined | RuntimeValueArrayInterface | RuntimeValueDateInterface | RuntimeValueMapInterface | RuntimeValueSetInterface;
}
