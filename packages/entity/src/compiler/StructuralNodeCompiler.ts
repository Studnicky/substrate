import { JsonObject, Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface, ValidationExecutionContextInterface } from './interfaces/CompilerExecutionStateInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { PatternApplicatorInterface } from './interfaces/PatternApplicatorInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { StructuralApplicatorsInterface } from './interfaces/StructuralApplicatorsInterface.js';

import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles every object-shaped keyword: `properties` through `dependentSchemas`, marking evaluated property keys. */
export class StructuralNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    if (!StructuralNodeCompiler.hasAnyKeyword(plan)) {
      return undefined;
    }
    const result = StructuralNodeCompiler.buildEvaluators(plan, compileChild);
    return result;
  }

  private static hasAnyKeyword(plan: SchemaNodePlanInterface): boolean {
    const flags = [
      plan.properties.size > 0, plan.patternProperties.size > 0, plan.required.length > 0,
      plan.additionalProperties !== undefined, plan.propertyNames !== undefined,
      plan.minimumProperties !== undefined, plan.maximumProperties !== undefined,
      plan.dependentRequired.size > 0, plan.dependentSchemas.size > 0
    ];
    const result = flags.some((flag) => { return flag; });
    return result;
  }

  /** Compiles the child pieces once, then closes each keyword-group step over them — no threaded state object. */
  private static buildEvaluators(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface {
    const applicators: StructuralApplicatorsInterface = {
      'additionalNode': StructuralNodeCompiler.compileAdditionalProperties(plan, compileChild),
      'patterns': StructuralNodeCompiler.compilePatterns(plan, compileChild),
      'properties': StructuralNodeCompiler.compileProperties(plan, compileChild),
      'propertyNamesNode': plan.propertyNames === undefined ? undefined : compileChild(plan.propertyNames, 'propertyNames')
    };
    const dependentSchemas = StructuralNodeCompiler.compileDependentSchemas(plan, compileChild);
    const defaults = StructuralNodeCompiler.extractDefaults(plan);

    const checkSize = StructuralNodeCompiler.makeSizeChecker(plan);
    const collectSize = StructuralNodeCompiler.makeSizeCollector(plan);
    const checkRequired = StructuralNodeCompiler.makeRequiredChecker(plan);
    const collectRequired = StructuralNodeCompiler.makeRequiredCollector(plan);
    const checkDependentRequired = StructuralNodeCompiler.makeDependentRequiredChecker(plan);
    const collectDependentRequired = StructuralNodeCompiler.makeDependentRequiredCollector(plan);
    const checkProperties = StructuralNodeCompiler.makePropertiesChecker(applicators);
    const collectProperties = StructuralNodeCompiler.makePropertiesCollector(applicators);
    const checkDependentSchemas = StructuralNodeCompiler.makeDependentSchemasChecker(dependentSchemas);
    const collectDependentSchemas = StructuralNodeCompiler.makeDependentSchemasCollector(dependentSchemas);

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!Predicates.isRecord(value)) { return true; }
      StructuralNodeCompiler.fillDefaults(value, defaults, context);
      if (!checkSize(value)) { return false; }
      if (!checkRequired(value)) { return false; }
      if (!checkDependentRequired(value)) { return false; }
      if (!checkProperties(value, context, evaluated)) { return false; }
      if (!checkDependentSchemas(value, context, evaluated)) { return false; }
      return true;
    };

    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPathPrefix: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!Predicates.isRecord(value)) { return []; }
      StructuralNodeCompiler.fillDefaults(value, defaults, context);
      const errors: EntityValidationErrorInterface[] = [];
      errors.push(...collectSize(value, instancePath, schemaPathPrefix));
      errors.push(...collectRequired(value, instancePath, schemaPathPrefix));
      errors.push(...collectDependentRequired(value, instancePath, schemaPathPrefix));
      errors.push(...collectProperties(value, context, instancePath, schemaPathPrefix, evaluated));
      errors.push(...collectDependentSchemas(value, context, instancePath, schemaPathPrefix, evaluated));
      return errors;
    };

    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static compileProperties(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): ReadonlyMap<string, CompiledNodeInterface> {
    const result = new Map<string, CompiledNodeInterface>();
    plan.properties.forEach((subschema, name) => {
      result.set(name, compileChild(subschema, `properties/${name}`));
    });
    return result;
  }

  private static compilePatterns(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): readonly PatternApplicatorInterface[] {
    const result: PatternApplicatorInterface[] = [];
    plan.patternProperties.forEach((subschema, pattern) => {
      result.push({ 'matcher': new RegExp(pattern, 'u'), 'node': compileChild(subschema, `patternProperties/${pattern}`), 'pattern': pattern });
    });
    return result;
  }

  private static compileAdditionalProperties(
    plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    if (plan.additionalProperties === undefined) {
      return undefined;
    }
    const result = compileChild(plan.additionalProperties, 'additionalProperties');
    return result;
  }

  private static extractDefaults(plan: SchemaNodePlanInterface): ReadonlyMap<string, unknown> {
    const result = new Map<string, unknown>();
    plan.properties.forEach((subschema, name) => {
      if (Predicates.isRecord(subschema) && Reflect.has(subschema, 'default')) {
        result.set(name, Reflect.get(subschema, 'default'));
      }
    });
    return result;
  }

  /** Clones and writes each declared default onto a missing key; execution-path only, gated by `options.fillDefaults`. */
  private static fillDefaults(value: Record<string, unknown>, defaults: ReadonlyMap<string, unknown>, context: ValidationExecutionContextInterface): void {
    if (!context.options.fillDefaults || defaults.size === 0) { return; }
    defaults.forEach((defaultValue, key) => {
      if (!StructuralNodeCompiler.isPresent(value, key)) {
        JsonObject.write(value, key, structuredClone(defaultValue));
      }
    });
  }

  private static compileDependentSchemas(
    plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface
  ): ReadonlyMap<string, CompiledNodeInterface> {
    const result = new Map<string, CompiledNodeInterface>();
    plan.dependentSchemas.forEach((subschema, name) => {
      result.set(name, compileChild(subschema, `dependentSchemas/${name}`));
    });
    return result;
  }

  private static makeSizeChecker(plan: SchemaNodePlanInterface): (value: Record<string, unknown>) => boolean {
    return (value) => {
      const count = Object.keys(value).length;
      if (plan.minimumProperties !== undefined && count < plan.minimumProperties) { return false; }
      if (plan.maximumProperties !== undefined && count > plan.maximumProperties) { return false; }
      return true;
    };
  }

  private static makeSizeCollector(
    plan: SchemaNodePlanInterface
  ): (value: Record<string, unknown>, instancePath: string, schemaPathPrefix: string) => EntityValidationErrorInterface[] {
    return (value, instancePath, schemaPathPrefix) => {
      const count = Object.keys(value).length;
      const errors: EntityValidationErrorInterface[] = [];
      if (plan.minimumProperties !== undefined && count < plan.minimumProperties) {
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPathPrefix, 'minProperties'),
          { 'keyword': 'minProperties', 'keywordValue': plan.minimumProperties }, { 'limit': plan.minimumProperties }
        ));
      }
      if (plan.maximumProperties !== undefined && count > plan.maximumProperties) {
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPathPrefix, 'maxProperties'),
          { 'keyword': 'maxProperties', 'keywordValue': plan.maximumProperties }, { 'limit': plan.maximumProperties }
        ));
      }
      return errors;
    };
  }

  /** A key counts as present only with an own, defined value — matching `JSON.stringify`'s own-enumerable, undefined-dropping projection. */
  private static isPresent(value: Record<string, unknown>, key: string): boolean {
    const result = Object.hasOwn(value, key) && Reflect.get(value, key) !== undefined;
    return result;
  }

  private static makeRequiredChecker(plan: SchemaNodePlanInterface): (value: Record<string, unknown>) => boolean {
    return (value) => {
      const count = plan.required.length;
      for (let index = 0; index < count; index += 1) {
        if (!StructuralNodeCompiler.isPresent(value, plan.required[index]!)) { return false; }
      }
      return true;
    };
  }

  private static makeRequiredCollector(
    plan: SchemaNodePlanInterface
  ): (value: Record<string, unknown>, instancePath: string, schemaPathPrefix: string) => EntityValidationErrorInterface[] {
    return (value, instancePath, schemaPathPrefix) => {
      const errors: EntityValidationErrorInterface[] = [];
      const count = plan.required.length;
      for (let index = 0; index < count; index += 1) {
        const key = plan.required[index]!;
        if (!StructuralNodeCompiler.isPresent(value, key)) {
          errors.push(ValidationErrorFactory.build(
            instancePath, SchemaPointer.append(schemaPathPrefix, 'required'), { 'keyword': 'required', 'missingProperty': key }, { 'missingProperty': key }
          ));
        }
      }
      return errors;
    };
  }

  /** Pure own-property checks with no side effects — a missing trigger short-circuits, evaluation order is inconsequential. */
  private static makeDependentRequiredChecker(plan: SchemaNodePlanInterface): (value: Record<string, unknown>) => boolean {
    return (value) => {
      let allSatisfied = true;
      plan.dependentRequired.forEach((siblings, trigger) => {
        if (!StructuralNodeCompiler.isPresent(value, trigger)) { return; }
        const siblingCount = siblings.length;
        for (let siblingIndex = 0; siblingIndex < siblingCount; siblingIndex += 1) {
          if (!StructuralNodeCompiler.isPresent(value, siblings[siblingIndex]!)) { allSatisfied = false; }
        }
      });
      return allSatisfied;
    };
  }

  private static makeDependentRequiredCollector(plan: SchemaNodePlanInterface): (
    value: Record<string, unknown>, instancePath: string, schemaPathPrefix: string
  ) => EntityValidationErrorInterface[] {
    return (value, instancePath, schemaPathPrefix) => {
      const errors: EntityValidationErrorInterface[] = [];
      plan.dependentRequired.forEach((siblings, trigger) => {
        if (!StructuralNodeCompiler.isPresent(value, trigger)) { return; }
        const missing: string[] = [];
        const siblingCount = siblings.length;
        for (let siblingIndex = 0; siblingIndex < siblingCount; siblingIndex += 1) {
          const sibling = siblings[siblingIndex]!;
          if (!StructuralNodeCompiler.isPresent(value, sibling)) { missing.push(sibling); }
        }
        if (missing.length === 0) { return; }
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPathPrefix, 'dependentRequired'),
          { 'dependentProperty': trigger, 'keyword': 'dependentRequired', 'missingDependentProperties': missing }, { 'deps': siblings, 'property': trigger }
        ));
      });
      return errors;
    };
  }

  /** Closes over the compiled applicators so both the bailing checker and the error-collecting walk stay within the parameter budget. */
  private static makePropertiesChecker(
    applicators: StructuralApplicatorsInterface
  ): (value: Record<string, unknown>, context: ValidationExecutionContextInterface, evaluated: EvaluatedTrackerInterface | undefined) => boolean {
    // `undefined` on a `properties`/`patternProperties` failure; otherwise whether either matched the key.
    const matchNamedOrPattern = (key: string, propertyValue: unknown, context: ValidationExecutionContextInterface): boolean | undefined => {
      let matched = false;
      const namedNode = applicators.properties.get(key);
      if (namedNode !== undefined) {
        if (!namedNode.check(propertyValue, context)) { return undefined; }
        matched = true;
      }
      const patternCount = applicators.patterns.length;
      for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
        const entry = applicators.patterns[patternIndex]!;
        if (!entry.matcher.test(key)) { continue; }
        if (!entry.node.check(propertyValue, context)) { return undefined; }
        matched = true;
      }
      return matched;
    };

    // `undefined` on the first failure; otherwise whether any applicator matched the key.
    const matchKey = (key: string, propertyValue: unknown, context: ValidationExecutionContextInterface): boolean | undefined => {
      const namedOrPatternMatched = matchNamedOrPattern(key, propertyValue, context);
      if (namedOrPatternMatched === undefined) { return undefined; }
      let matched = namedOrPatternMatched;
      if (!matched && applicators.additionalNode !== undefined) {
        if (!applicators.additionalNode.check(propertyValue, context)) { return undefined; }
        matched = true;
      }
      if (applicators.propertyNamesNode !== undefined && !applicators.propertyNamesNode.check(key, context)) { return undefined; }
      return matched;
    };

    return (value, context, evaluated) => {
      const keys = Object.keys(value);
      const count = keys.length;
      for (let index = 0; index < count; index += 1) {
        const key = keys[index]!;
        const matched = matchKey(key, Reflect.get(value, key), context);
        if (matched === undefined) { return false; }
        if (matched && evaluated !== undefined) { evaluated.properties.add(key); }
      }
      return true;
    };
  }

  private static makePropertiesCollector(applicators: StructuralApplicatorsInterface): (
    value: Record<string, unknown>, context: ValidationExecutionContextInterface, instancePath: string, schemaPathPrefix: string,
    evaluated: EvaluatedTrackerInterface | undefined
  ) => EntityValidationErrorInterface[] {
    return (value, context, instancePath, schemaPathPrefix, evaluated) => {
      // Collects one key's errors against every applicator; unlike `matchKey`, never short-circuits.
      const collectKey = (key: string, propertyValue: unknown, propertyPath: string): EntityValidationErrorInterface[] => {
        const errors: EntityValidationErrorInterface[] = [];
        let matched = false;
        const namedNode = applicators.properties.get(key);
        if (namedNode !== undefined) {
          matched = true;
          errors.push(...namedNode.collect(propertyValue, context, propertyPath, SchemaPointer.append(schemaPathPrefix, `properties/${key}`)));
        }
        const patternCount = applicators.patterns.length;
        for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
          const entry = applicators.patterns[patternIndex]!;
          if (!entry.matcher.test(key)) { continue; }
          matched = true;
          errors.push(...entry.node.collect(propertyValue, context, propertyPath, SchemaPointer.append(schemaPathPrefix, `patternProperties/${entry.pattern}`)));
        }
        if (!matched && applicators.additionalNode !== undefined) {
          matched = true;
          errors.push(...applicators.additionalNode.collect(propertyValue, context, propertyPath, SchemaPointer.append(schemaPathPrefix, 'additionalProperties')));
        }
        if (applicators.propertyNamesNode !== undefined) {
          errors.push(...applicators.propertyNamesNode.collect(key, context, propertyPath, SchemaPointer.append(schemaPathPrefix, 'propertyNames')));
        }
        if (matched && evaluated !== undefined) { evaluated.properties.add(key); }
        return errors;
      };

      const errors: EntityValidationErrorInterface[] = [];
      const keys = Object.keys(value);
      const count = keys.length;
      for (let index = 0; index < count; index += 1) {
        const key = keys[index]!;
        const propertyValue = Reflect.get(value, key);
        const escapedKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
        const propertyPath = `${instancePath}/${escapedKey}`;
        errors.push(...collectKey(key, propertyValue, propertyPath));
      }
      return errors;
    };
  }

  /** Runs every triggered `dependentSchemas` entry unconditionally — matches the applicator's own no-short-circuit contract. */
  private static makeDependentSchemasChecker(dependentSchemas: ReadonlyMap<string, CompiledNodeInterface>): (
    value: Record<string, unknown>, context: ValidationExecutionContextInterface, evaluated: EvaluatedTrackerInterface | undefined
  ) => boolean {
    return (value, context, evaluated) => {
      let allSatisfied = true;
      dependentSchemas.forEach((node, trigger) => {
        if (!StructuralNodeCompiler.isPresent(value, trigger)) { return; }
        if (!node.check(value, context, evaluated)) { allSatisfied = false; }
      });
      return allSatisfied;
    };
  }

  private static makeDependentSchemasCollector(dependentSchemas: ReadonlyMap<string, CompiledNodeInterface>): (
    value: Record<string, unknown>, context: ValidationExecutionContextInterface, instancePath: string, schemaPathPrefix: string,
    evaluated: EvaluatedTrackerInterface | undefined
  ) => EntityValidationErrorInterface[] {
    return (value, context, instancePath, schemaPathPrefix, evaluated) => {
      const errors: EntityValidationErrorInterface[] = [];
      dependentSchemas.forEach((node, trigger) => {
        if (!StructuralNodeCompiler.isPresent(value, trigger)) { return; }
        errors.push(...node.collect(value, context, instancePath, SchemaPointer.append(schemaPathPrefix, `dependentSchemas/${trigger}`), evaluated));
      });
      return errors;
    };
  }
}
