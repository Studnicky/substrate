import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

import { FormatValidators } from './FormatValidators.js';
import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

interface ScalarAssertionInterface {
  readonly 'check': (value: unknown) => boolean;
  readonly 'error': (value: unknown, instancePath: string, schemaPath: string) => EntityValidationErrorInterface;
}

/** Compiles `type`, `const`, `enum`, and every string/number-only keyword into one specialised closure pair. */
export class ScalarNodeCompiler {
  public static compile(plan: SchemaNodePlanInterface): CompiledNodeInterface | undefined {
    const assertions = ScalarNodeCompiler.buildAssertions(plan);
    if (assertions.length === 0) {
      return undefined;
    }
    const check = (value: unknown): boolean => {
      const count = assertions.length;
      for (let index = 0; index < count; index += 1) {
        if (!assertions[index]!.check(value)) {
          return false;
        }
      }
      return true;
    };
    const collect = (value: unknown, _context: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface[] => {
      const errors: EntityValidationErrorInterface[] = [];
      const count = assertions.length;
      for (let index = 0; index < count; index += 1) {
        const assertion = assertions[index]!;
        if (!assertion.check(value)) {
          errors.push(assertion.error(value, instancePath, schemaPath));
        }
      }
      return errors;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static buildAssertions(plan: SchemaNodePlanInterface): readonly ScalarAssertionInterface[] {
    const assertions: ScalarAssertionInterface[] = [];
    ScalarNodeCompiler.pushType(assertions, plan);
    ScalarNodeCompiler.pushConst(assertions, plan);
    ScalarNodeCompiler.pushEnum(assertions, plan);
    ScalarNodeCompiler.pushStringKeywords(assertions, plan);
    ScalarNodeCompiler.pushNumberKeywords(assertions, plan);
    return assertions;
  }

  private static pushType(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const types = plan.type;
    if (types === undefined) {
      return;
    }
    const check = (value: unknown): boolean => {
      const result = Predicates.matchesAnyType([...types], value);
      return result;
    };
    const error = (_value: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface => {
      const keywordValue = types.length === 1 ? types[0] : types;
      const result = ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, 'type'), { 'keyword': 'type', 'keywordValue': keywordValue }, { 'type': keywordValue }
      );
      return result;
    };
    assertions.push({ 'check': check, 'error': error });
  }

  private static pushConst(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const constant = plan.const;
    if (constant === undefined) {
      return;
    }
    const check = (value: unknown): boolean => {
      const result = Predicates.areDeeplyEqual(value, constant.value);
      return result;
    };
    const error = (_value: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface => {
      const result = ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, 'const'), { 'keyword': 'const' }, { 'allowedValue': constant.value }
      );
      return result;
    };
    assertions.push({ 'check': check, 'error': error });
  }

  private static pushEnum(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const values = plan.enum;
    if (values === undefined) {
      return;
    }
    const check = (value: unknown): boolean => {
      const result = Predicates.satisfiesEnum(value, [...values]);
      return result;
    };
    const error = (_value: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface => {
      const result = ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, 'enum'), { 'keyword': 'enum' }, { 'allowedValues': values }
      );
      return result;
    };
    assertions.push({ 'check': check, 'error': error });
  }

  private static pushStringKeywords(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const { contentEncoding, contentMediaType, format, 'maximumLength': maximumLengthValue, 'minimumLength': minimumLengthValue, pattern } = plan;
    const compiledPattern = pattern === undefined ? undefined : new RegExp(pattern, 'u');
    if (minimumLengthValue !== undefined) {
      const predicate = (value: string): boolean => { const result = Predicates.satisfiesMinimumLength(value, minimumLengthValue); return result; };
      assertions.push(ScalarNodeCompiler.stringAssertion('minLength', minimumLengthValue, predicate));
    }
    if (maximumLengthValue !== undefined) {
      const predicate = (value: string): boolean => { const result = Predicates.satisfiesMaximumLength(value, maximumLengthValue); return result; };
      assertions.push(ScalarNodeCompiler.stringAssertion('maxLength', maximumLengthValue, predicate));
    }
    if (compiledPattern !== undefined) {
      const predicate = (value: string): boolean => { const result = Predicates.checkPattern(value, compiledPattern); return result; };
      assertions.push(ScalarNodeCompiler.stringAssertion('pattern', pattern!, predicate));
    }
    if (format !== undefined) {
      const predicate = (value: string): boolean => { const result = FormatValidators.test(format, value); return result; };
      assertions.push(ScalarNodeCompiler.stringAssertion('format', format, predicate));
    }
    if (contentEncoding !== undefined) {
      const predicate = (value: string): boolean => { const result = Predicates.satisfiesContentEncoding(value, contentEncoding); return result; };
      assertions.push(ScalarNodeCompiler.stringAssertion('contentEncoding', contentEncoding, predicate));
    }
    if (contentMediaType !== undefined) {
      const predicate = (value: string): boolean => { const result = Predicates.satisfiesContentMediaType(value, contentMediaType, contentEncoding); return result; };
      assertions.push(ScalarNodeCompiler.stringAssertion('contentMediaType', contentMediaType, predicate));
    }
  }

  private static stringAssertion(
    keyword: string, keywordValue: unknown, predicate: (value: string) => boolean
  ): ScalarAssertionInterface {
    const check = (value: unknown): boolean => {
      const result = !Predicates.isString(value) || predicate(value);
      return result;
    };
    const error = (_value: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface => {
      const result = ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, keyword), { 'keyword': keyword, 'keywordValue': keywordValue }, { 'limit': keywordValue }
      );
      return result;
    };
    return { 'check': check, 'error': error };
  }

  private static pushNumberKeywords(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const { exclusiveMaximum, exclusiveMinimum, maximum, minimum, multipleOf } = plan;
    if (minimum !== undefined) {
      const predicate = (value: number): boolean => { const result = Predicates.checkMinimum(value, minimum, false); return result; };
      assertions.push(ScalarNodeCompiler.numberAssertion('minimum', minimum, predicate));
    }
    if (maximum !== undefined) {
      const predicate = (value: number): boolean => { const result = Predicates.checkMaximum(value, maximum, false); return result; };
      assertions.push(ScalarNodeCompiler.numberAssertion('maximum', maximum, predicate));
    }
    if (exclusiveMinimum !== undefined) {
      const predicate = (value: number): boolean => { const result = Predicates.checkMinimum(value, exclusiveMinimum, true); return result; };
      assertions.push(ScalarNodeCompiler.numberAssertion('exclusiveMinimum', exclusiveMinimum, predicate));
    }
    if (exclusiveMaximum !== undefined) {
      const predicate = (value: number): boolean => { const result = Predicates.checkMaximum(value, exclusiveMaximum, true); return result; };
      assertions.push(ScalarNodeCompiler.numberAssertion('exclusiveMaximum', exclusiveMaximum, predicate));
    }
    if (multipleOf !== undefined) {
      const predicate = (value: number): boolean => { const result = Predicates.checkMultipleOf(value, multipleOf); return result; };
      assertions.push(ScalarNodeCompiler.numberAssertion('multipleOf', multipleOf, predicate));
    }
  }

  private static numberAssertion(keyword: string, keywordValue: number, predicate: (value: number) => boolean): ScalarAssertionInterface {
    const check = (value: unknown): boolean => {
      const result = !Predicates.isNumberType(value) || predicate(value);
      return result;
    };
    const error = (_value: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface => {
      const result = ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, keyword), { 'keyword': keyword, 'keywordValue': keywordValue }, { 'limit': keywordValue }
      );
      return result;
    };
    return { 'check': check, 'error': error };
  }
}
