import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompilerExecutionStateInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

import { FormatValidators } from './FormatValidators.js';
import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles `format` as an assertion — only when the schema's own dialect opts into the format-assertion vocabulary. */
export class FormatAssertionNodeCompiler {
  public static compile(plan: SchemaNodePlanInterface, enabled: boolean): CompiledNodeInterface | undefined {
    if (!enabled || plan.format === undefined) { return undefined; }
    const format = plan.format;
    const check = (value: unknown): boolean => {
      const result = !Predicates.isString(value) || FormatValidators.test(format, value);
      return result;
    };
    const collect = (value: unknown, _context: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface[] => {
      if (check(value)) { return []; }
      const result = [ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, 'format'), { 'keyword': 'format', 'keywordValue': format }, { 'format': format }
      )];
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }
}
