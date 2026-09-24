import type { EntityValidateFunctionInterface } from '../../src/interfaces/EntityValidateFunctionInterface.js';
import type { ConformanceCompileFunctionInterface } from './interfaces/ConformanceCompileFunctionInterface.js';
import type { ConformanceFailureInterface } from './interfaces/ConformanceFailureInterface.js';
import type { ConformanceReportInterface } from './interfaces/ConformanceReportInterface.js';
import type { ConformanceSuiteFileInterface } from './interfaces/ConformanceSuiteFileInterface.js';

/** Runs loaded suite files against any compiler matching the entity engine seam and reports pass/fail per case. */
export class ConformanceRunner {
  /** Compiles once per group (schema), validates every case in that group, and tallies the result. */
  public static run(
    engineName: string,
    files: readonly ConformanceSuiteFileInterface[],
    compile: ConformanceCompileFunctionInterface
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
        const validate = ConformanceRunner.compileGroup(compile, group.schema);
        const caseCount = group.tests.length;
        for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
          const testCase = group.tests[caseIndex]!;
          total += 1;
          const outcome = ConformanceRunner.evaluateCase(validate, testCase.data, testCase.valid);
          if (outcome === undefined) {
            passed += 1;
            continue;
          }
          failures.push({
            'relativePath': file.relativePath,
            'groupDescription': group.description,
            'caseDescription': testCase.description,
            'expectedValid': testCase.valid,
            'reason': outcome
          });
        }
      }
    }

    const result: ConformanceReportInterface = {
      'engineName': engineName,
      'total': total,
      'passed': passed,
      'failed': failures.length,
      'failures': failures
    };
    return result;
  }

  /** Compiles a group's schema, wrapping a synchronous compile-time throw as an always-failing validator. */
  private static compileGroup(
    compile: ConformanceCompileFunctionInterface,
    schema: unknown
  ): EntityValidateFunctionInterface<unknown> | { readonly 'compileError': string } {
    try {
      const result = compile(schema as object);
      return result;
    } catch (error) {
      const result = { 'compileError': ConformanceRunner.describeError(error) };
      return result;
    }
  }

  /** Returns `undefined` on a passing case, or a failure reason string. */
  private static evaluateCase(
    validate: EntityValidateFunctionInterface<unknown> | { readonly 'compileError': string },
    data: unknown,
    expectedValid: boolean
  ): string | undefined {
    if ('compileError' in validate) {
      return `compile failed: ${validate.compileError}`;
    }
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
    const result = errors.map((error) => `${error.keyword} at '${error.instancePath}'`).join('; ');
    return result;
  }

  private static describeError(error: unknown): string {
    const result = error instanceof Error ? error.message : String(error);
    return result;
  }
}
