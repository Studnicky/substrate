import type { ConformanceFailureInterface } from './ConformanceFailureInterface.js';

/** The pass/fail tally and every failing case for one engine's run against one suite selection. */
export interface ConformanceReportInterface {
  readonly 'engineName': string;
  readonly 'failed': number;
  readonly 'failures': readonly ConformanceFailureInterface[];
  readonly 'passed': number;
  readonly 'total': number;
}
