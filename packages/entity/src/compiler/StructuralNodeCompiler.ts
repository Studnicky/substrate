import { JsonObject, Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

interface PatternEntryInterface {
  readonly 'matcher': RegExp;
  readonly 'node': CompiledNodeInterface;
  readonly 'pattern': string;
}

/** Compiles every object-shaped keyword: `properties` through `dependentSchemas`, marking evaluated property keys. */
export class StructuralNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    const hasKeywords = plan.properties.size > 0 || plan.patternProperties.size > 0 || plan.required.length > 0
      || plan.additionalProperties !== undefined || plan.propertyNames !== undefined
      || plan.minimumProperties !== undefined || plan.maximumProperties !== undefined
      || plan.dependentRequired.size > 0 || plan.dependentSchemas.size > 0;
    if (!hasKeywords) {
      return undefined;
    }

    const properties = StructuralNodeCompiler.compileProperties(plan, compileChild);
    const patterns = StructuralNodeCompiler.compilePatterns(plan, compileChild);
    const additionalNode = StructuralNodeCompiler.compileAdditionalProperties(plan, compileChild);
    const propertyNamesNode = plan.propertyNames === undefined ? undefined : compileChild(plan.propertyNames, 'propertyNames');
    const dependentSchemas = StructuralNodeCompiler.compileDependentSchemas(plan, compileChild);
    const defaults = StructuralNodeCompiler.extractDefaults(plan);
    const required = plan.required;
    const { 'maximumProperties': maxProperties, 'minimumProperties': minProperties } = plan;
    const dependentRequired = plan.dependentRequired;

    const parts = {
      'additionalNode': additionalNode, 'dependentRequired': dependentRequired, 'dependentSchemas': dependentSchemas, 'maximumProperties': maxProperties, 'minimumProperties': minProperties,
      'patterns': patterns, 'properties': properties, 'propertyNamesNode': propertyNamesNode, 'required': required
    };

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!Predicates.isRecord(value)) {
        return true;
      }
      StructuralNodeCompiler.fillDefaults(value, defaults, context);
      const bailResult = StructuralNodeCompiler.collectAll(value, context, '', '', evaluated, parts, true);
      const result = bailResult === undefined;
      return result;
    };

    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPathPrefix: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!Predicates.isRecord(value)) {
        return [];
      }
      StructuralNodeCompiler.fillDefaults(value, defaults, context);
      const errors = StructuralNodeCompiler.collectAll(value, context, instancePath, schemaPathPrefix, evaluated, parts, false);
      const result = errors ?? [];
      return result;
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

  private static compilePatterns(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): readonly PatternEntryInterface[] {
    const result: PatternEntryInterface[] = [];
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
      if (!Reflect.has(value, key)) {
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

  /** Runs every applicator once; returns `undefined` on full pass (bail mode) or the collected error list. */
  private static collectAll(
    value: Record<string, unknown>,
    context: ValidationExecutionContextInterface,
    instancePath: string,
    schemaPathPrefix: string,
    evaluated: EvaluatedTrackerInterface | undefined,
    parts: {
      'additionalNode': CompiledNodeInterface | undefined;
      'dependentRequired': ReadonlyMap<string, readonly string[]>;
      'dependentSchemas': ReadonlyMap<string, CompiledNodeInterface>;
      'maximumProperties': number | undefined;
      'minimumProperties': number | undefined;
      'patterns': readonly PatternEntryInterface[];
      'properties': ReadonlyMap<string, CompiledNodeInterface>;
      'propertyNamesNode': CompiledNodeInterface | undefined;
      'required': readonly string[];
    },
    bail: boolean
  ): EntityValidationErrorInterface[] | undefined {
    const errors: EntityValidationErrorInterface[] = [];
    const keys = Object.keys(value);

    if (parts.minimumProperties !== undefined && keys.length < parts.minimumProperties) {
      if (bail) { return []; }
      errors.push(ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPathPrefix, 'minProperties'),
        { 'keyword': 'minProperties', 'keywordValue': parts.minimumProperties }, { 'limit': parts.minimumProperties }
      ));
    }
    if (parts.maximumProperties !== undefined && keys.length > parts.maximumProperties) {
      if (bail) { return []; }
      errors.push(ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPathPrefix, 'maxProperties'),
        { 'keyword': 'maxProperties', 'keywordValue': parts.maximumProperties }, { 'limit': parts.maximumProperties }
      ));
    }

    const requiredCount = parts.required.length;
    for (let index = 0; index < requiredCount; index += 1) {
      const key = parts.required[index]!;
      if (!Reflect.has(value, key)) {
        if (bail) { return []; }
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPathPrefix, 'required'),
          { 'keyword': 'required', 'missingProperty': key }, { 'missingProperty': key }
        ));
      }
    }

    parts.dependentRequired.forEach((siblings, trigger) => {
      if (!Reflect.has(value, trigger)) {
        return;
      }
      const missing: string[] = [];
      const siblingCount = siblings.length;
      for (let siblingIndex = 0; siblingIndex < siblingCount; siblingIndex += 1) {
        const sibling = siblings[siblingIndex]!;
        if (!Reflect.has(value, sibling)) {
          missing.push(sibling);
        }
      }
      if (missing.length > 0 && !bail) {
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPathPrefix, 'dependentRequired'),
          { 'dependentProperty': trigger, 'keyword': 'dependentRequired', 'missingDependentProperties': missing },
          { 'deps': siblings, 'property': trigger }
        ));
      } else if (missing.length > 0) {
        errors.push(ValidationErrorFactory.build(instancePath, schemaPathPrefix, { 'keyword': 'dependentRequired' }));
      }
    });
    if (bail && errors.length > 0) { return []; }

    const keyCount = keys.length;
    for (let index = 0; index < keyCount; index += 1) {
      const key = keys[index]!;
      const propertyValue = Reflect.get(value, key);
      const escapedKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
      const propertyPath = `${instancePath}/${escapedKey}`;
      let matched = false;
      const namedNode = parts.properties.get(key);
      if (namedNode !== undefined) {
        matched = true;
        if (bail) {
          if (!namedNode.check(propertyValue, context)) { return []; }
        } else {
          errors.push(...namedNode.collect(propertyValue, context, propertyPath, SchemaPointer.append(schemaPathPrefix, `properties/${key}`)));
        }
      }
      const patternCount = parts.patterns.length;
      for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
        const entry = parts.patterns[patternIndex]!;
        if (!entry.matcher.test(key)) { continue; }
        matched = true;
        if (bail) {
          if (!entry.node.check(propertyValue, context)) { return []; }
        } else {
          errors.push(...entry.node.collect(propertyValue, context, propertyPath, SchemaPointer.append(schemaPathPrefix, `patternProperties/${entry.pattern}`)));
        }
      }
      if (!matched && parts.additionalNode !== undefined) {
        matched = true;
        if (bail) {
          if (!parts.additionalNode.check(propertyValue, context)) { return []; }
        } else {
          errors.push(...parts.additionalNode.collect(propertyValue, context, propertyPath, SchemaPointer.append(schemaPathPrefix, 'additionalProperties')));
        }
      }
      if (parts.propertyNamesNode !== undefined) {
        if (bail) {
          if (!parts.propertyNamesNode.check(key, context)) { return []; }
        } else {
          errors.push(...parts.propertyNamesNode.collect(key, context, propertyPath, SchemaPointer.append(schemaPathPrefix, 'propertyNames')));
        }
      }
      if (matched && evaluated !== undefined) {
        evaluated.properties.add(key);
      }
    }

    parts.dependentSchemas.forEach((node, trigger) => {
      if (!Reflect.has(value, trigger)) { return; }
      if (bail) {
        if (!node.check(value, context, evaluated)) { errors.push(ValidationErrorFactory.build(instancePath, schemaPathPrefix, { 'keyword': 'dependentSchemas' })); }
        return;
      }
      errors.push(...node.collect(value, context, instancePath, SchemaPointer.append(schemaPathPrefix, `dependentSchemas/${trigger}`), evaluated));
    });

    if (bail) {
      const result = errors.length === 0 ? undefined : [];
      return result;
    }
    return errors;
  }
}
