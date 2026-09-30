import type { EntityValidateFunctionInterface } from '../../src/interfaces/EntityValidateFunctionInterface.js';
import type { ConformanceCompilerInterface } from './interfaces/ConformanceCompilerInterface.js';
import type { ConformanceFailureInterface } from './interfaces/ConformanceFailureInterface.js';
import type { ConformanceGroupInterface } from './interfaces/ConformanceGroupInterface.js';
import type { ConformanceReportInterface } from './interfaces/ConformanceReportInterface.js';
import type { ConformanceSuiteFileInterface } from './interfaces/ConformanceSuiteFileInterface.js';

/** Runs loaded suite files against any compiler matching the entity engine seam and reports pass/fail per case. */
export class ConformanceRunner {
  /** Compiles once per group (schema), validates every case in that group, and tallies the result. */
  public static run(
    engineName: string,
    files: readonly ConformanceSuiteFileInterface[],
    compiler: ConformanceCompilerInterface,
    remoteSchemas?: ReadonlyMap<string, object | boolean>
  ): ConformanceReportInterface {
    const failures: ConformanceFailureInterface[] = [];
    let total = 0;
    let passed = 0;

    const fileCount = files.length;
    for (let fileIndex = 0; fileIndex < fileCount; fileIndex += 1) {
      const file = files[fileIndex]!;
      const groupCount = file.groups.length;
      for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const group = file.groups[groupIndex]!;
        const outcomes = ConformanceRunner.evaluateGroup(compiler, group, remoteSchemas);
        const caseCount = group.tests.length;
        for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
          const testCase = group.tests[caseIndex]!;
          const outcome = outcomes[caseIndex];
          total += 1;
          if (outcome === undefined) {
            passed += 1;
          } else {
            failures.push({
              'caseDescription': testCase.description,
              'expectedValid': testCase.valid,
              'groupDescription': group.description,
              'reason': outcome,
              'relativePath': file.relativePath
            });
          }
        }
      }
    }

    const result: ConformanceReportInterface = {
      'engineName': engineName,
      'failed': failures.length,
      'failures': failures,
      'passed': passed,
      'total': total
    };
    return result;
  }

  /** Compiles a group's schema once and returns each case's outcome: `undefined` on a pass, else a failure reason. A synchronous compile-time throw fails every case in the group. */
  private static evaluateGroup(
    compiler: ConformanceCompilerInterface,
    group: ConformanceGroupInterface,
    remoteSchemas: ReadonlyMap<string, object | boolean> | undefined
  ): readonly (string | undefined)[] {
    const caseCount = group.tests.length;
    const result: (string | undefined)[] = [];
    try {
      const validate = compiler.compile(group.schema, remoteSchemas);
      for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
        const testCase = group.tests[caseIndex]!;
        result.push(ConformanceRunner.evaluateCase(validate, testCase.data, testCase.valid));
      }
    } catch (error) {
      const reason = `compile failed: ${ConformanceRunner.describeError(error)}`;
      result.length = 0;
      for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
        result.push(reason);
      }
    }
    return result;
  }

  /** Returns `undefined` on a passing case, or a failure reason string. */
  private static evaluateCase(
    validate: EntityValidateFunctionInterface<unknown>,
    data: unknown,
    expectedValid: boolean
  ): string | undefined {
    try {
      const actualValid = validate(data);
      if (actualValid === expectedValid) {
        return undefined;
      }
      const result = actualValid
        ? 'accepted data the suite expects rejected'
        : `rejected data the suite expects accepted (${ConformanceRunner.describeValidateErrors(validate)})`;
      return result;
    } catch (error) {
      return `validate threw: ${ConformanceRunner.describeError(error)}`;
    }
  }

  private static describeValidateErrors(validate: EntityValidateFunctionInterface<unknown>): string {
    const errors = validate.errors;
    if (errors === null || errors === undefined || errors.length === 0) {
      return 'no errors reported';
    }
    const result = errors.map((error) => {
      const description = `${error.keyword} at '${error.instancePath}'`;
      return description;
    }).join('; ');
    return result;
  }

  private static describeError(error: unknown): string {
    const result = error instanceof Error ? error.message : String(error);
    return result;
  }
}
