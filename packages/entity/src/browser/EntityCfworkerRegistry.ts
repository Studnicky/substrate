/**
 * EntityCfworkerRegistry — eval-free JSON Schema 2020-12 validator for the browser.
 *
 * `@cfworker/json-schema` interprets a schema at validate time instead of compiling
 * it to a JIT function, so it never calls `Function`/`eval` and stays valid under a
 * `script-src` CSP with no `unsafe-eval`. `useDefaults` isn't part of the JSON Schema
 * spec, so intake and create fill declared `properties` defaults before interpretation
 * runs, matching the Node registry's default-filling timing.
 *
 * @module
 */
import type { OutputUnit } from '@cfworker/json-schema';

import { Validator } from '@cfworker/json-schema';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { SchemaCompilerInterface } from '../interfaces/SchemaCompilerInterface.js';
import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import { ENTITY_CFWORKER_CONSTANTS } from './constants/EntityCfworkerConstants.js';
import { QUOTED_VALUE_PATTERN } from './constants/QuotedValuePattern.js';

interface MutableValidateFunctionInterface<TValidated> {
  (data: unknown): data is TValidated;
  'errors': readonly EntityValidationErrorInterface[] | null;
}

class EntityCfworkerCompiler {
  public static createCompiler(fillDefaults: boolean): SchemaCompilerInterface {
    const cache = new Map<string, MutableValidateFunctionInterface<unknown>>();

    const compile = <TValidated>(schema: object): EntityValidateFunctionInterface<TValidated> => {
      const id = EntityCfworkerCompiler.schemaId(schema);
      if (id !== undefined) {
        const existing = cache.get(id);
        if (existing !== undefined) {
          return existing as MutableValidateFunctionInterface<TValidated>;
        }
      }
      const validator = new Validator(schema, ENTITY_CFWORKER_CONSTANTS.schemaDraft, false);
      const predicate = ((data: unknown): data is TValidated => {
        if (fillDefaults) {
          EntityCfworkerCompiler.applyDefaults(data, schema, schema);
        }
        const outcome = validator.validate(data);
        predicate.errors = outcome.valid ? null : EntityCfworkerCompiler.leafErrors(outcome.errors).map(EntityCfworkerCompiler.toEntityError);
        return outcome.valid;
      }) as MutableValidateFunctionInterface<TValidated>;
      predicate.errors = null;
      if (id !== undefined) {
        cache.set(id, predicate);
      }
      return predicate;
    };

    const getSchema = <TValidated>(key: string): EntityValidateFunctionInterface<TValidated> | undefined => {
      const result = cache.get(key) as MutableValidateFunctionInterface<TValidated> | undefined;
      return result;
    };

    const result: SchemaCompilerInterface = { 'compile': compile, 'getSchema': getSchema };
    return result;
  }

  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value);
    return result;
  }

  private static schemaId(schema: object): string | undefined {
    const id: unknown = Reflect.get(schema, '$id');
    const result = typeof id === 'string' ? id : undefined;
    return result;
  }

  /** Resolves a local `$ref` pointer within the same schema document. */
  private static resolveLocalReference(schema: Record<string, unknown>, rootSchema: object): Record<string, unknown> | undefined {
    const reference = schema.$ref;
    if (typeof reference !== 'string' || !reference.startsWith('#')) {
      return undefined;
    }
    if (reference === '#') {
      const result = EntityCfworkerCompiler.isPlainObject(rootSchema) ? rootSchema : undefined;
      return result;
    }
    if (!reference.startsWith('#/')) {
      return undefined;
    }
    const segments = reference.slice(2).split('/');
    let target: unknown = rootSchema;
    const segmentCount = segments.length;
    for (let index = 0; index < segmentCount; index += 1) {
      const segment = segments[index]!.replaceAll('~1', '/').replaceAll('~0', '~');
      if (!EntityCfworkerCompiler.isPlainObject(target)) {
        return undefined;
      }
      target = Reflect.get(target, segment);
    }
    const result = EntityCfworkerCompiler.isPlainObject(target) ? target : undefined;
    return result;
  }

  /** Collects every properties-bearing schema fragment reachable through `$ref` and `allOf`. */
  private static compositionSchemas(
    schema: Record<string, unknown>,
    rootSchema: object,
    seen: ReadonlySet<object>
  ): readonly Record<string, unknown>[] {
    if (seen.has(schema)) {
      return [];
    }
    const nextSeen = new Set(seen);
    nextSeen.add(schema);
    const result: Record<string, unknown>[] = [schema];
    const referenced = EntityCfworkerCompiler.resolveLocalReference(schema, rootSchema);
    if (referenced !== undefined) {
      result.push(...EntityCfworkerCompiler.compositionSchemas(referenced, rootSchema, nextSeen));
    }
    const allOf = schema.allOf;
    if (Array.isArray(allOf)) {
      const branchCount = allOf.length;
      for (let index = 0; index < branchCount; index += 1) {
        const branch: unknown = allOf[index];
        if (EntityCfworkerCompiler.isPlainObject(branch)) {
          result.push(...EntityCfworkerCompiler.compositionSchemas(branch, rootSchema, nextSeen));
        }
      }
    }
    return result;
  }

  /** Fills declared `properties` defaults onto missing keys, mirroring the Node registry's `useDefaults` timing. */
  private static applyDefaults(value: unknown, schema: object, rootSchema: object): void {
    if (!EntityCfworkerCompiler.isPlainObject(value) || !EntityCfworkerCompiler.isPlainObject(schema)) {
      return;
    }
    const fragments = EntityCfworkerCompiler.compositionSchemas(schema, rootSchema, new Set());
    const fragmentCount = fragments.length;
    for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex += 1) {
      const properties = fragments[fragmentIndex]!.properties;
      if (!EntityCfworkerCompiler.isPlainObject(properties)) {
        continue;
      }
      const propertyNames = Object.keys(properties);
      const propertyCount = propertyNames.length;
      for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
        const key = propertyNames[propertyIndex]!;
        const propertySchema = Reflect.get(properties, key);
        if (!EntityCfworkerCompiler.isPlainObject(propertySchema)) {
          continue;
        }
        const hasKey = Reflect.has(value, key);
        if (!hasKey && Reflect.has(propertySchema, 'default')) {
          Reflect.set(value, key, structuredClone(propertySchema.default));
        }
        if (Reflect.has(value, key)) {
          EntityCfworkerCompiler.applyDefaults(Reflect.get(value, key), propertySchema, rootSchema);
        }
      }
    }
  }

  /**
   * Drops composite-keyword summary units (`properties`, `items`, `dependentSchemas`, …) that only
   * announce a nested failure exists. `allErrors` mode reports only the leaf diagnostic; a summary
   * unit is redundant once a more specific descendant unit — one whose `keywordLocation` extends
   * its own — is present in the same result.
   */
  private static leafErrors(errors: readonly OutputUnit[]): readonly OutputUnit[] {
    const errorCount = errors.length;
    const result: OutputUnit[] = [];
    for (let candidateIndex = 0; candidateIndex < errorCount; candidateIndex += 1) {
      const candidate = errors[candidateIndex]!;
      let hasMoreSpecificDescendant = false;
      for (let otherIndex = 0; otherIndex < errorCount; otherIndex += 1) {
        if (otherIndex === candidateIndex) {
          continue;
        }
        if (errors[otherIndex]!.keywordLocation.startsWith(`${candidate.keywordLocation}/`)) {
          hasMoreSpecificDescendant = true;
          break;
        }
      }
      if (!hasMoreSpecificDescendant) {
        result.push(candidate);
      }
    }
    return result;
  }

  /** Extracts the structured diagnostic parameters the Node registry reports for the same keywords. */
  private static diagnosticParameters(unit: OutputUnit): Readonly<Record<string, unknown>> {
    if (unit.keyword === 'required') {
      const match = QUOTED_VALUE_PATTERN.exec(unit.error);
      if (match?.[1] !== undefined) {
        return { 'missingProperty': match[1] };
      }
    }
    if (unit.keyword === 'additionalProperties') {
      const match = QUOTED_VALUE_PATTERN.exec(unit.error);
      if (match?.[1] !== undefined) {
        return { 'additionalProperty': match[1] };
      }
    }
    return {};
  }

  /** Converts a cfworker output unit into the diagnostic entity consumers expect. */
  private static toEntityError(unit: OutputUnit): EntityValidationErrorInterface {
    const instancePath = unit.instanceLocation === '#' ? '' : decodeURIComponent(unit.instanceLocation.slice(1));
    const diagnostic: Record<string, unknown> = {
      'instancePath': instancePath,
      'keyword': unit.keyword,
      'message': unit.error,
      'schemaPath': unit.keywordLocation
    };
    Reflect.set(diagnostic, ENTITY_CFWORKER_CONSTANTS.errorDiagnosticParametersKey, EntityCfworkerCompiler.diagnosticParameters(unit));
    const result = diagnostic as unknown as EntityValidationErrorInterface;
    return result;
  }
}

/** The isolated interpretation-backed compilers that back assertion, intake, and creation. */
export const EntityCfworkerRegistry: SchemaRegistrySetInterface = {
  'assert': EntityCfworkerCompiler.createCompiler(false),
  'create': EntityCfworkerCompiler.createCompiler(true),
  'intake': EntityCfworkerCompiler.createCompiler(true)
};
