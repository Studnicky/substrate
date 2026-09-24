import { globSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import type { ConformanceGroupInterface } from './interfaces/ConformanceGroupInterface.js';
import type { ConformanceSuiteFileInterface } from './interfaces/ConformanceSuiteFileInterface.js';

/** Loads the vendored official JSON Schema Test Suite's draft2020-12 fixtures from disk. */
export class ConformanceSuiteLoader {
  /** Every required (non-`optional/`) suite file, sorted for stable output. */
  public static loadRequired(suiteRoot: string): readonly ConformanceSuiteFileInterface[] {
    const result = ConformanceSuiteLoader.loadPattern(suiteRoot, 'tests/draft2020-12/*.json');
    return result;
  }

  /** Every `optional/` suite file excluding `optional/format/**` and `optional/format-assertion.json`. */
  public static loadOptionalCore(suiteRoot: string): readonly ConformanceSuiteFileInterface[] {
    const allOptional = ConformanceSuiteLoader.loadPattern(suiteRoot, 'tests/draft2020-12/optional/*.json');
    const result = allOptional.filter((file) => file.relativePath !== 'optional/format-assertion.json');
    return result;
  }

  /** Every `optional/format/**` suite file. */
  public static loadOptionalFormat(suiteRoot: string): readonly ConformanceSuiteFileInterface[] {
    const result = ConformanceSuiteLoader.loadPattern(suiteRoot, 'tests/draft2020-12/optional/format/*.json');
    return result;
  }

  /** `optional/format-assertion.json` alone. */
  public static loadOptionalFormatAssertion(suiteRoot: string): readonly ConformanceSuiteFileInterface[] {
    const result = ConformanceSuiteLoader.loadPattern(suiteRoot, 'tests/draft2020-12/optional/format-assertion.json');
    return result;
  }

  private static loadPattern(suiteRoot: string, pattern: string): readonly ConformanceSuiteFileInterface[] {
    const matches = globSync(pattern, { 'cwd': suiteRoot }).toSorted();
    const result: ConformanceSuiteFileInterface[] = [];
    const matchCount = matches.length;
    for (let index = 0; index < matchCount; index += 1) {
      const absolutePath = resolve(suiteRoot, matches[index]!);
      const relativePath = relative(resolve(suiteRoot, 'tests/draft2020-12'), absolutePath);
      const groups = JSON.parse(readFileSync(absolutePath, 'utf8')) as readonly ConformanceGroupInterface[];
      result.push({ 'relativePath': relativePath, 'groups': groups });
    }
    return result;
  }
}
