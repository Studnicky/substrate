import { NS_PER_UNIT } from '../../constants/index.js';
import { Timing } from '../Timing.js';

/** Browser timing tracker backed by the monotonic Performance API. */
export class BrowserTiming extends Timing {
  protected override readHrtime(): bigint {
    const milliseconds = globalThis.performance.now();
    const wholeMilliseconds = Math.trunc(milliseconds);
    const fractionalNanoseconds = Math.round((milliseconds - wholeMilliseconds) * NS_PER_UNIT.ms);
    const result = (BigInt(wholeMilliseconds) * BigInt(NS_PER_UNIT.ms)) + BigInt(fractionalNanoseconds);

    return result;
  }
}
