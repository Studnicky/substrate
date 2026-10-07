
import { Predicates } from '#runtime';

import type { EntityDiagnosticRenderContextInterface } from '../interfaces/EntityDiagnosticRenderContextInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompilerExecutionStateInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

import { SchemaPattern } from '../SchemaPattern.js';
import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

interface ScalarAssertionInterface {
  readonly 'check': (value: unknown) => boolean;
  readonly 'error': (value: unknown, instancePath: string, schemaPath: string) => EntityValidationErrorInterface;
  readonly 'errorAtRenderedSchemaBase': (value: unknown, instancePath: string, renderedSchemaBase: string) => EntityValidationErrorInterface;
  readonly 'schemaPathSuffix': string;
}

interface ScalarAssertionErrorBuildersInterface {
  readonly 'error': (value: unknown, instancePath: string, schemaPath: string) => EntityValidationErrorInterface;
  readonly 'errorAtRenderedSchemaBase': (value: unknown, instancePath: string, renderedSchemaBase: string) => EntityValidationErrorInterface;
}

/** Compiles `type`, `const`, `enum`, and every string/number-only keyword into one specialised closure pair. */
export class ScalarNodeCompiler {
  public static compile(plan: SchemaNodePlanInterface): CompiledNodeInterface | undefined {
    const specialised = ScalarNodeCompiler.compileStringMinimumLength(plan);
    if (specialised !== undefined) {
      return specialised;
    }
    const typeSpecialised = ScalarNodeCompiler.compileTypeOnly(plan);
    if (typeSpecialised !== undefined) {
      return typeSpecialised;
    }
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
    const appendErrors = (
      value: unknown, instancePath: string, schemaPath: string, output: EntityValidationErrorInterface[]
    ): void => {
      const count = assertions.length;
      for (let index = 0; index < count; index += 1) {
        const assertion = assertions[index]!;
        if (!assertion.check(value)) {
          output.push(assertion.error(value, instancePath, schemaPath));
        }
      }
    };
    const appendErrorsAtRenderedSchemaBase = (
      value: unknown, instancePath: string, renderedSchemaBase: string, output: EntityValidationErrorInterface[]
    ): void => {
      const count = assertions.length;
      for (let index = 0; index < count; index += 1) {
        const assertion = assertions[index]!;
        if (!assertion.check(value)) {
          output.push(assertion.errorAtRenderedSchemaBase(value, instancePath, renderedSchemaBase));
        }
      }
    };
    const appendStaticErrors = ScalarNodeCompiler.createStaticAppender(assertions, plan.schemaPointer);
    const collect = (value: unknown, _context: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface[] => {
      const errors: EntityValidationErrorInterface[] = [];
      appendErrors(value, instancePath, schemaPath, errors);
      return errors;
    };
    const result = {
      'appendErrors': appendErrors,
      'appendErrorsAtRenderedSchemaBase': appendErrorsAtRenderedSchemaBase,
      'appendStaticErrors': appendStaticErrors,
      'check': check,
      'collect': collect
    };
    return result;
  }

  private static createStaticAppender(
    assertions: readonly ScalarAssertionInterface[], schemaPointer: string
  ): (value: unknown, instancePath: string, output: EntityValidationErrorInterface[]) => void {
    const schemaPaths: string[] = [];
    const count = assertions.length;
    for (let index = 0; index < count; index += 1) {
      schemaPaths.push(SchemaPointer.append(schemaPointer, assertions[index]!.schemaPathSuffix));
    }
    const appendStaticErrors = (
      value: unknown, instancePath: string, output: EntityValidationErrorInterface[]
    ): void => {
      for (let index = 0; index < count; index += 1) {
        const assertion = assertions[index]!;
        if (!assertion.check(value)) {
          output.push(assertion.error(value, instancePath, schemaPaths[index]!));
        }
      }
    };
    return appendStaticErrors;
  }

  private static compileStringMinimumLength(plan: SchemaNodePlanInterface): CompiledNodeInterface | undefined {
    const types = plan.type;
    const minimumLength = plan.minimumLength;
    const hasOnlyMinimumLength = ScalarNodeCompiler.hasNoOtherScalarAssertions(plan);
    const isSingleStringType = types?.length === 1 && types[0] === 'string';
    if (!isSingleStringType || minimumLength === undefined || !hasOnlyMinimumLength) {
      return undefined;
    }
    const typeRenderContext = { 'keyword': 'type', 'keywordValue': 'string' };
    const minimumLengthRenderContext = { 'keyword': 'minLength', 'keywordValue': minimumLength };
    const staticTypeSchemaPath = SchemaPointer.append(plan.schemaPointer, 'type');
    const staticMinimumLengthSchemaPath = SchemaPointer.append(plan.schemaPointer, 'minLength');
    const check = (value: unknown): boolean => {
      const result = Predicates.isString(value) && Predicates.satisfiesMinimumLength(value, minimumLength);
      return result;
    };
    const appendErrors = (
      value: unknown, instancePath: string, schemaPath: string, output: EntityValidationErrorInterface[]
    ): void => {
      if (!Predicates.isString(value)) {
        output.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPath, 'type'), typeRenderContext, { 'type': 'string' }
        ));
        return;
      }
      if (!Predicates.satisfiesMinimumLength(value, minimumLength)) {
        output.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPath, 'minLength'), minimumLengthRenderContext, { 'limit': minimumLength }
        ));
      }
    };
    const appendErrorsAtRenderedSchemaBase = (
      value: unknown, instancePath: string, renderedSchemaBase: string, output: EntityValidationErrorInterface[]
    ): void => {
      if (!Predicates.isString(value)) {
        output.push(ValidationErrorFactory.build(
          instancePath, `${renderedSchemaBase}/type`, typeRenderContext, { 'type': 'string' }
        ));
        return;
      }
      if (!Predicates.satisfiesMinimumLength(value, minimumLength)) {
        output.push(ValidationErrorFactory.build(
          instancePath, `${renderedSchemaBase}/minLength`, minimumLengthRenderContext, { 'limit': minimumLength }
        ));
      }
    };
    const appendStaticErrors = (
      value: unknown, instancePath: string, output: EntityValidationErrorInterface[]
    ): void => {
      if (!Predicates.isString(value)) {
        output.push(ValidationErrorFactory.build(instancePath, staticTypeSchemaPath, typeRenderContext, { 'type': 'string' }));
        return;
      }
      if (!Predicates.satisfiesMinimumLength(value, minimumLength)) {
        output.push(ValidationErrorFactory.build(instancePath, staticMinimumLengthSchemaPath, minimumLengthRenderContext, { 'limit': minimumLength }));
      }
    };
    const collect = (value: unknown, _context: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface[] => {
      const errors: EntityValidationErrorInterface[] = [];
      appendErrors(value, instancePath, schemaPath, errors);
      return errors;
    };
    const result = {
      'appendErrors': appendErrors,
      'appendErrorsAtRenderedSchemaBase': appendErrorsAtRenderedSchemaBase,
      'appendStaticErrors': appendStaticErrors,
      'check': check,
      'collect': collect
    };
    return result;
  }

  private static compileTypeOnly(plan: SchemaNodePlanInterface): CompiledNodeInterface | undefined {
    const types = plan.type;
    if (types === undefined || !ScalarNodeCompiler.hasNoOtherScalarAssertions(plan)) {
      return undefined;
    }
    const schemaTypes = [...types];
    const keywordValue = types.length === 1 ? types[0] : types;
    const renderContext = { 'keyword': 'type', 'keywordValue': keywordValue };
    const staticTypeSchemaPath = SchemaPointer.append(plan.schemaPointer, 'type');
    const check = (value: unknown): boolean => {
      const result = Predicates.matchesAnyType(schemaTypes, value);
      return result;
    };
    const appendErrors = (
      value: unknown, instancePath: string, schemaPath: string, output: EntityValidationErrorInterface[]
    ): void => {
      if (!Predicates.matchesAnyType(schemaTypes, value)) {
        output.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPath, 'type'), renderContext, { 'type': keywordValue }
        ));
      }
    };
    const appendErrorsAtRenderedSchemaBase = (
      value: unknown, instancePath: string, renderedSchemaBase: string, output: EntityValidationErrorInterface[]
    ): void => {
      if (!Predicates.matchesAnyType(schemaTypes, value)) {
        output.push(ValidationErrorFactory.build(
          instancePath, `${renderedSchemaBase}/type`, renderContext, { 'type': keywordValue }
        ));
      }
    };
    const appendStaticErrors = (
      value: unknown, instancePath: string, output: EntityValidationErrorInterface[]
    ): void => {
      if (!Predicates.matchesAnyType(schemaTypes, value)) {
        output.push(ValidationErrorFactory.build(instancePath, staticTypeSchemaPath, renderContext, { 'type': keywordValue }));
      }
    };
    const collect = (value: unknown, _context: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface[] => {
      const errors: EntityValidationErrorInterface[] = [];
      appendErrors(value, instancePath, schemaPath, errors);
      return errors;
    };
    const result = {
      'appendErrors': appendErrors,
      'appendErrorsAtRenderedSchemaBase': appendErrorsAtRenderedSchemaBase,
      'appendStaticErrors': appendStaticErrors,
      'check': check,
      'collect': collect
    };
    return result;
  }

  private static hasNoOtherScalarAssertions(plan: SchemaNodePlanInterface): boolean {
    const scalarAssertions = [
      plan.const, plan.enum, plan.maximumLength, plan.minimumLength, plan.pattern,
      plan.exclusiveMaximum, plan.exclusiveMinimum, plan.maximum, plan.minimum, plan.multipleOf
    ];
    const result = scalarAssertions.every((assertion): boolean => {
      const isUndefined = assertion === undefined;
      return isUndefined;
    });
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

  private static createAssertionErrorBuilders(
    keyword: string,
    renderContext: EntityDiagnosticRenderContextInterface,
    createParameters: () => Readonly<Record<string, unknown>>
  ): ScalarAssertionErrorBuildersInterface {
    const error = (_value: unknown, instancePath: string, schemaPath: string): EntityValidationErrorInterface => {
      const result = ValidationErrorFactory.build(instancePath, SchemaPointer.append(schemaPath, keyword), renderContext, createParameters());
      return result;
    };
    const errorAtRenderedSchemaBase = (
      _value: unknown, instancePath: string, renderedSchemaBase: string
    ): EntityValidationErrorInterface => {
      const result = ValidationErrorFactory.build(instancePath, `${renderedSchemaBase}/${keyword}`, renderContext, createParameters());
      return result;
    };
    return { 'error': error, 'errorAtRenderedSchemaBase': errorAtRenderedSchemaBase };
  }

  private static pushType(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const types = plan.type;
    if (types === undefined) {
      return;
    }
    const schemaTypes = [...types];
    const check = (value: unknown): boolean => {
      const result = Predicates.matchesAnyType(schemaTypes, value);
      return result;
    };
    const keywordValue = types.length === 1 ? types[0] : types;
    const errors = ScalarNodeCompiler.createAssertionErrorBuilders(
      'type', { 'keyword': 'type', 'keywordValue': keywordValue }, () => { return { 'type': keywordValue }; }
    );
    assertions.push({
      'check': check,
      'error': errors.error,
      'errorAtRenderedSchemaBase': errors.errorAtRenderedSchemaBase,
      'schemaPathSuffix': 'type'
    });
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
    const errors = ScalarNodeCompiler.createAssertionErrorBuilders(
      'const', { 'keyword': 'const' }, () => { return { 'allowedValue': constant.value }; }
    );
    assertions.push({
      'check': check,
      'error': errors.error,
      'errorAtRenderedSchemaBase': errors.errorAtRenderedSchemaBase,
      'schemaPathSuffix': 'const'
    });
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
    const errors = ScalarNodeCompiler.createAssertionErrorBuilders(
      'enum', { 'keyword': 'enum' }, () => { return { 'allowedValues': values }; }
    );
    assertions.push({
      'check': check,
      'error': errors.error,
      'errorAtRenderedSchemaBase': errors.errorAtRenderedSchemaBase,
      'schemaPathSuffix': 'enum'
    });
  }

  /** `format`, `contentEncoding`, `contentMediaType` are annotations in 2020-12; they never assert. */
  private static pushStringKeywords(assertions: ScalarAssertionInterface[], plan: SchemaNodePlanInterface): void {
    const { 'maximumLength': maximumLengthValue, 'minimumLength': minimumLengthValue, pattern } = plan;
    const compiledPattern = pattern === undefined ? undefined : SchemaPattern.compile(pattern);
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
  }

  private static stringAssertion(
    keyword: string, keywordValue: unknown, predicate: (value: string) => boolean
  ): ScalarAssertionInterface {
    const renderContext = { 'keyword': keyword, 'keywordValue': keywordValue };
    const check = (value: unknown): boolean => {
      const result = !Predicates.isString(value) || predicate(value);
      return result;
    };
    const errors = ScalarNodeCompiler.createAssertionErrorBuilders(
      keyword, renderContext, () => { return { 'limit': keywordValue }; }
    );
    return {
      'check': check,
      'error': errors.error,
      'errorAtRenderedSchemaBase': errors.errorAtRenderedSchemaBase,
      'schemaPathSuffix': keyword
    };
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
    const errors = ScalarNodeCompiler.createAssertionErrorBuilders(
      keyword, { 'keyword': keyword, 'keywordValue': keywordValue }, () => { return { 'limit': keywordValue }; }
    );
    return {
      'check': check,
      'error': errors.error,
      'errorAtRenderedSchemaBase': errors.errorAtRenderedSchemaBase,
      'schemaPathSuffix': keyword
    };
  }
}
