import type { ConformanceGroupInterface } from './ConformanceGroupInterface.js';

/** One loaded suite JSON file, path relative to the vendored suite root. */
export interface ConformanceSuiteFileInterface {
  readonly 'groups': readonly ConformanceGroupInterface[];
  readonly 'relativePath': string;
}
