import { Predicates } from '@studnicky/types/node';
import { globSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import type { ConformanceGroupInterface } from './interfaces/ConformanceGroupInterface.js';
import type { ConformanceSuiteFileInterface } from './interfaces/ConformanceSuiteFileInterface.js';

import { ConformanceError } from './ConformanceError.js';
import { ConformanceJsonFile } from './ConformanceJsonFile.js';
import { CONFORMANCE_SUITE_PATTERNS } from './constants/CONFORMANCE_SUITE_PATTERNS.js';

/** Loads the vendored official JSON Schema Test Suite's draft2020-12 fixtures from disk. */
export class ConformanceSuiteLoader {
  /** Every `optional/` suite file excluding `optional/format/**` and `optional/format-assertion.json`. */
  public static loadOptionalCore(suiteRoot: string): readonly ConformanceSuiteFileInterface[] {
    const allOptional = ConformanceSuiteLoader.loadPattern(suiteRoot, CONFORMANCE_SUITE_PATTERNS.optionalCore);
    const result = allOptional.filter((file) => {
      const isCore = file.relativePath !== 'optional/format-assertion.json';
      return isCore;
    });
    return result;
  }

  /** Every suite file matching `pattern` (relative to `suiteRoot`), sorted for stable output. */
  public static loadPattern(suiteRoot: string, pattern: string): readonly ConformanceSuiteFileInterface[] {
    const matches = ConformanceSuiteLoader.glob(pattern, suiteRoot);
    const result: ConformanceSuiteFileInterface[] = [];
    const matchCount = matches.length;
    for (let index = 0; index < matchCount; index += 1) {
      const absolutePath = resolve(suiteRoot, matches[index]!);
      const relativePath = relative(resolve(suiteRoot, 'tests/draft2020-12'), absolutePath);
      const parsed = ConformanceJsonFile.read(absolutePath);
      if (ConformanceSuiteLoader.isGroupList(parsed)) {
        result.push({ 'groups': parsed, 'relativePath': relativePath });
      } else {
        throw new ConformanceError(`suite file ${absolutePath} is not an array of test groups`);
      }
    }
    return result;
  }

  /** Every vendored `remotes/**` file, keyed by the `http://localhost:1234/...` URI the suite's own tests address it by. */
  public static loadRemotes(suiteRoot: string): ReadonlyMap<string, object | boolean> {
    const remotesRoot = resolve(suiteRoot, 'remotes');
    const matches = ConformanceSuiteLoader.glob('**/*.json', remotesRoot);
    const result = new Map<string, object | boolean>();
    const matchCount = matches.length;
    for (let index = 0; index < matchCount; index += 1) {
      const relativePath = matches[index]!;
      const absolutePath = resolve(remotesRoot, relativePath);
      const uri = `http://localhost:1234/${relativePath.split(sep).join('/')}`;
      const remote = ConformanceJsonFile.read(absolutePath);
      if (typeof remote === 'boolean' || Predicates.isObject(remote)) {
        result.set(uri, remote);
      } else {
        throw new ConformanceError(`remote file ${absolutePath} is not a schema document`);
      }
    }
    return result;
  }

  private static glob(pattern: string, cwd: string): readonly string[] {
    try {
      const result = globSync(pattern, { 'cwd': cwd }).toSorted();
      return result;
    } catch (error) {
      throw new ConformanceError(`cannot list ${pattern} under ${cwd}`, error);
    }
  }

  private static isGroupList(value: unknown): value is readonly ConformanceGroupInterface[] {
    if (Array.isArray(value)) {
      const groups: readonly unknown[] = value;
      const groupCount = groups.length;
      for (let index = 0; index < groupCount; index += 1) {
        const group = groups[index];
        if (Predicates.isObject(group) && Array.isArray(group.tests)) {
          continue;
        }
        return false;
      }
      return true;
    }
    return false;
  }
}
