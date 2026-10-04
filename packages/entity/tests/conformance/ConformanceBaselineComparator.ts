import type { ConformanceBaselineEntryInterface } from './interfaces/ConformanceBaselineEntryInterface.js';
import type { ConformanceFailureInterface } from './interfaces/ConformanceFailureInterface.js';

interface ConformanceBaselineDiffInterface {
  readonly 'regressions': readonly ConformanceFailureInterface[];
  readonly 'resolved': readonly ConformanceBaselineEntryInterface[];
}

/** Compares an actual failing-case set against a recorded baseline of known, justified gaps. */
export class ConformanceBaselineComparator {
  /**
   * `regressions` are actual failures not recorded in the baseline — a new gap the CI gate rejects.
   * `resolved` are baseline entries that no longer fail — a stale baseline entry the CI gate also rejects,
   * so the baseline stays an accurate, current list rather than an accumulating pile of old exclusions.
   */
  public static diff(
    actualFailures: readonly ConformanceFailureInterface[],
    baseline: readonly ConformanceBaselineEntryInterface[]
  ): ConformanceBaselineDiffInterface {
    const baselineKeys = new Set(baseline.map(ConformanceBaselineComparator.key));
    const actualKeys = new Set(actualFailures.map(ConformanceBaselineComparator.key));

    const regressions: ConformanceFailureInterface[] = [];
    const actualCount = actualFailures.length;
    for (let index = 0; index < actualCount; index += 1) {
      const failure = actualFailures[index]!;
      if (!baselineKeys.has(ConformanceBaselineComparator.key(failure))) {
        regressions.push(failure);
      }
    }

    const resolved: ConformanceBaselineEntryInterface[] = [];
    const baselineCount = baseline.length;
    for (let index = 0; index < baselineCount; index += 1) {
      const entry = baseline[index]!;
      if (!actualKeys.has(ConformanceBaselineComparator.key(entry))) {
        resolved.push(entry);
      }
    }

    const result: ConformanceBaselineDiffInterface = { 'regressions': regressions, 'resolved': resolved };
    return result;
  }

  private static key(entry: ConformanceBaselineEntryInterface): string {
    const result = `${entry.relativePath}\u0000${entry.groupDescription}\u0000${entry.caseDescription}`;
    return result;
  }
}
