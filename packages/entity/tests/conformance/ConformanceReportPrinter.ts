import type { ConformanceReportInterface } from './interfaces/ConformanceReportInterface.js';

/** Renders a conformance report to a human-readable multi-line string. */
export class ConformanceReportPrinter {
  public static render(report: ConformanceReportInterface): string {
    const lines: string[] = [];
    lines.push(`${report.engineName}: ${String(report.passed)}/${String(report.total)} passed, ${String(report.failed)} failed`);
    const failureCount = report.failures.length;
    for (let index = 0; index < failureCount; index += 1) {
      const failure = report.failures[index]!;
      lines.push(`  FAIL ${failure.relativePath} :: ${failure.groupDescription} :: ${failure.caseDescription} (expected valid=${String(failure.expectedValid)}) — ${failure.reason}`);
    }
    const result = lines.join('\n');
    return result;
  }

  /** Renders only the summary line, no per-case failures. */
  public static renderSummary(report: ConformanceReportInterface): string {
    const result = `${report.engineName}: ${String(report.passed)}/${String(report.total)} passed, ${String(report.failed)} failed`;
    return result;
  }
}
