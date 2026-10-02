import { readFileSync, writeFileSync } from 'node:fs';

import { ConformanceError } from './ConformanceError.js';

/** Reads and writes JSON files, surfacing every platform failure as a `ConformanceError`. */
export class ConformanceJsonFile {
  /** Parses the file at `path` into an unvalidated value; the caller narrows it. */
  public static read(path: string): unknown {
    try {
      const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
      return parsed;
    } catch (error) {
      throw new ConformanceError(`cannot read JSON file ${path}`, error);
    }
  }

  /** Serialises `value` as two-space-indented JSON with a trailing newline. */
  public static write(path: string, value: readonly object[]): void {
    try {
      writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    } catch (error) {
      throw new ConformanceError(`cannot write JSON file ${path}`, error);
    }
  }
}
