import { Predicates } from '@studnicky/types/node';
import { resolve } from 'node:path';

import type { ConformanceBaselineEntryInterface } from './interfaces/ConformanceBaselineEntryInterface.js';
import type { ConformanceReportInterface } from './interfaces/ConformanceReportInterface.js';

import { ConformanceError } from './ConformanceError.js';
import { ConformanceJsonFile } from './ConformanceJsonFile.js';

/** Persists each engine's known-failure baseline as `<engineName>-known-failures.json` inside one directory. */
export class ConformanceBaselineStore {
  /** Loads the recorded known failures for `engineName`. */
  public static read(baselineDir: string, engineName: string): readonly ConformanceBaselineEntryInterface[] {
    const path = resolve(baselineDir, `${engineName}-known-failures.json`);
    const parsed = ConformanceJsonFile.read(path);
    if (ConformanceBaselineStore.isEntryList(parsed)) {
      return parsed;
    }
    throw new ConformanceError(`baseline file ${path} is not an array of baseline entries`);
  }

  /** Records `report`'s failing cases as the new known-failure baseline. */
  public static write(baselineDir: string, report: ConformanceReportInterface): void {
    const entries: ConformanceBaselineEntryInterface[] = [];
    const failureCount = report.failures.length;
    for (let index = 0; index < failureCount; index += 1) {
      const failure = report.failures[index]!;
      entries.push({
        'caseDescription': failure.caseDescription,
        'groupDescription': failure.groupDescription,
        'relativePath': failure.relativePath
      });
    }
    ConformanceJsonFile.write(resolve(baselineDir, `${report.engineName}-known-failures.json`), entries);
  }

  private static isEntryList(value: unknown): value is readonly ConformanceBaselineEntryInterface[] {
    if (Array.isArray(value)) {
      const entries: readonly unknown[] = value;
      const entryCount = entries.length;
      for (let index = 0; index < entryCount; index += 1) {
        const entry = entries[index];
        if (Predicates.isObject(entry) && typeof entry.caseDescription === 'string' && typeof entry.groupDescription === 'string' && typeof entry.relativePath === 'string') {
          continue;
        }
        return false;
      }
      return true;
    }
    return false;
  }
}
