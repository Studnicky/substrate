import { Timing } from '../Timing.js';

/** Browser timing tracker backed by the monotonic Performance API. */
export class BrowserTiming extends Timing {
  protected override readHrtime(): bigint {
    const result = this.readPerformanceHrtime();

    return result;
  }
}
