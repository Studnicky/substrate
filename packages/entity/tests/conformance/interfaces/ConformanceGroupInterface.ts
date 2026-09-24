import type { ConformanceCaseInterface } from './ConformanceCaseInterface.js';

/** One `{description, schema, tests}` group from an official JSON Schema Test Suite file. A schema may be a boolean per 2020-12. */
export interface ConformanceGroupInterface {
  readonly 'description': string;
  readonly 'schema': unknown;
  readonly 'tests': readonly ConformanceCaseInterface[];
}
