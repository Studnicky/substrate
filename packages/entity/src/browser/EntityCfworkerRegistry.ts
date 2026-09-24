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
import { JsonObject } from '@studnicky/types/browser';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { SchemaCompilerInterface } from '../interfaces/SchemaCompilerInterface.js';
import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import { EntityDiagnostics } from '../EntityDiagnostics.js';
import { SchemaId } from '../SchemaId.js';
import { ARRAY_INDEX_SEGMENT_PATTERN } from './constants/ArrayIndexSegmentPattern.js';
import { ENTITY_CFWORKER_CONSTANTS } from './constants/EntityCfworkerConstants.js';
import { QUOTED_VALUE_PATTERN } from './constants/QuotedValuePattern.js';

interface MutableValidateFunctionInterface<TValidated> {
  (data: unknown): data is TValidated;
  'errors': readonly EntityValidationErrorInterface[] | null;
}

/** Marks a value the JSON Schema data model cannot represent (`undefined`, a function, a `bigint`, a `symbol`). */
const UNREPRESENTABLE = Symbol('unrepresentable-json-instance');

class EntityCfworkerCompiler {
  public static createCompiler(fillDefaults: boolean): SchemaCompilerInterface {
    const cache = new Map<string, MutableValidateFunctionInterface<unknown>>();

    const compile = <TValidated>(schema: object | boolean): EntityValidateFunctionInterface<TValidated> => {
      const id = SchemaId.of(schema);
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
        const instance = EntityCfworkerCompiler.toJsonInstance(data, schema, schema);
        if (instance === UNREPRESENTABLE) {
          predicate.errors = [EntityCfworkerCompiler.unrepresentableInstanceError(schema)];
          return false;
        }
        const outcome = validator.validate(instance);
        predicate.errors = outcome.valid
          ? null
          : EntityCfworkerCompiler.leafErrors(outcome.errors, schema).map((unit) => {
            const entityError = EntityCfworkerCompiler.toEntityError(unit, schema);
            return entityError;
          });
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

  /** Declared properties across `$ref`/`allOf` composition; a `required`-only key maps to `undefined` (no subschema). */
  private static declaredProperties(schema: unknown, rootSchema: object | boolean): ReadonlyMap<string, unknown> {
    const result = new Map<string, unknown>();
    if (!EntityCfworkerCompiler.isPlainObject(schema)) {
      return result;
    }
    const composed = EntityCfworkerCompiler.compositionSchemas(schema, rootSchema, new Set());
    const composedCount = composed.length;
    for (let index = 0; index < composedCount; index += 1) {
      const fragment = composed[index]!;
      const properties = fragment.properties;
      if (EntityCfworkerCompiler.isPlainObject(properties)) {
        const keys = Object.keys(properties);
        const keyCount = keys.length;
        for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
          const key = keys[keyIndex]!;
          if (!result.has(key)) {
            result.set(key, Reflect.get(properties, key));
          }
        }
      }
      const required = fragment.required;
      if (Array.isArray(required)) {
        const requiredCount = required.length;
        for (let requiredIndex = 0; requiredIndex < requiredCount; requiredIndex += 1) {
          const key: unknown = required[requiredIndex];
          if (typeof key === 'string' && !result.has(key)) {
            result.set(key, undefined);
          }
        }
      }
    }
    return result;
  }

  /** Projects onto the JSON Schema data model so cfworker fails instead of throwing; `seen` memoizes copies against cyclic input. */
  private static toJsonInstance(value: unknown, schema: unknown, rootSchema: object | boolean, seen: Map<object, unknown> = new Map()): unknown {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      const result = Number.isFinite(value) ? value : null;
      return result;
    }
    const cached = typeof value === 'object' ? seen.get(value) : undefined;
    if (cached !== undefined) {
      return cached;
    }
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      seen.set(value, result);
      const itemSchema = EntityCfworkerCompiler.isPlainObject(schema) ? schema.items : undefined;
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const normalized = EntityCfworkerCompiler.toJsonInstance(value[index], itemSchema, rootSchema, seen);
        result.push(normalized === UNREPRESENTABLE ? null : normalized);
      }
      return result;
    }
    if (EntityCfworkerCompiler.isPlainObject(value)) {
      const result: Record<string, unknown> = {};
      seen.set(value, result);
      const declaredProperties = EntityCfworkerCompiler.declaredProperties(schema, rootSchema);
      const ownKeys = Object.keys(value);
      const ownKeySet = new Set(ownKeys);
      const ownKeyCount = ownKeys.length;
      for (let index = 0; index < ownKeyCount; index += 1) {
        const key = ownKeys[index]!;
        const normalized = EntityCfworkerCompiler.toJsonInstance(Reflect.get(value, key), declaredProperties.get(key), rootSchema, seen);
        if (normalized !== UNREPRESENTABLE) {
          JsonObject.write(result, key, normalized);
        }
      }
      const inheritedDeclared = [...declaredProperties.entries()].filter(([key]) => {
        const isInherited = !ownKeySet.has(key);
        return isInherited;
      });
      const inheritedCount = inheritedDeclared.length;
      for (let index = 0; index < inheritedCount; index += 1) {
        const [key, propertySchema] = inheritedDeclared[index]!;
        const normalized = EntityCfworkerCompiler.toJsonInstance(Reflect.get(value, key), propertySchema, rootSchema, seen);
        if (normalized !== UNREPRESENTABLE) {
          EntityCfworkerCompiler.definePresentNotOwnEnumerable(result, key, normalized);
        }
      }
      const undeclaredInheritedEnumerable = EntityCfworkerCompiler.inheritedEnumerableKeys(value, ownKeySet, declaredProperties);
      const undeclaredCount = undeclaredInheritedEnumerable.length;
      if (undeclaredCount > 0) {
        const prototypeProjection: Record<string, unknown> = {};
        for (let index = 0; index < undeclaredCount; index += 1) {
          const key = undeclaredInheritedEnumerable[index]!;
          const normalized = EntityCfworkerCompiler.toJsonInstance(Reflect.get(value, key), undefined, rootSchema, seen);
          if (normalized !== UNREPRESENTABLE) {
            JsonObject.write(prototypeProjection, key, normalized);
          }
        }
        // on the prototype, not as own keys, so Object.keys/minProperties/maxProperties stay own-key-only like Ajv
        Object.setPrototypeOf(result, prototypeProjection);
      }
      return result;
    }
    return UNREPRESENTABLE;
  }

  /** Every key `for...in` would visit: each prototype level's own enumerable keys, closest first, deduplicated (shadowing). */
  private static forInVisibleKeys(value: object): readonly string[] {
    const seenKeys = new Set<string>();
    const result: string[] = [];
    let level: object | null = value;
    while (level !== null) {
      const levelKeys = Object.keys(level);
      const levelKeyCount = levelKeys.length;
      for (let index = 0; index < levelKeyCount; index += 1) {
        const key = levelKeys[index]!;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          result.push(key);
        }
      }
      level = Object.getPrototypeOf(level) as object | null;
    }
    return result;
  }

  /** Undeclared keys `for...in` reaches but `Object.keys` misses on `value`: inherited and enumerable. */
  private static inheritedEnumerableKeys(value: object, ownKeySet: ReadonlySet<string>, declaredProperties: ReadonlyMap<string, unknown>): readonly string[] {
    const visibleKeys = EntityCfworkerCompiler.forInVisibleKeys(value);
    const result: string[] = [];
    const visibleKeyCount = visibleKeys.length;
    for (let index = 0; index < visibleKeyCount; index += 1) {
      const key = visibleKeys[index]!;
      if (!ownKeySet.has(key) && !declaredProperties.has(key)) {
        result.push(key);
      }
    }
    return result;
  }

  /** Declared but not own-enumerable, matching the source: visible to `in`/access, invisible to `Object.keys`. */
  private static definePresentNotOwnEnumerable(target: object, key: string, value: unknown): void {
    Object.defineProperty(target, key, { 'configurable': true, 'enumerable': false, 'value': value, 'writable': true });
  }

  /** Renders the type failure for a root instance the JSON Schema data model cannot represent at all. */
  private static unrepresentableInstanceError(schema: object | boolean): EntityValidationErrorInterface {
    const declaredType = EntityCfworkerCompiler.isPlainObject(schema) ? Reflect.get(schema, 'type') : undefined;
    const message = EntityDiagnostics.render({ 'keyword': 'type', 'keywordValue': declaredType }) ?? 'must be a valid JSON value';
    const diagnostic: Record<string, unknown> = {
      'instancePath': '',
      'keyword': 'type',
      'message': message,
      'schemaPath': '#/type'
    };
    JsonObject.write(diagnostic, ENTITY_CFWORKER_CONSTANTS.errorDiagnosticParametersKey, {});
    const result = diagnostic as unknown as EntityValidationErrorInterface;
    return result;
  }

  /** Resolves a JSON Pointer, rooted at `#`, against `rootSchema`. */
  private static resolveSchemaPointer(rootSchema: object | boolean, pointer: string): unknown {
    if (pointer === '#') {
      return rootSchema;
    }
    if (!pointer.startsWith('#/')) {
      return undefined;
    }
    const segments = pointer.slice(2).split('/');
    let target: unknown = rootSchema;
    const segmentCount = segments.length;
    for (let index = 0; index < segmentCount; index += 1) {
      const segment = decodeURIComponent(segments[index]!).replaceAll('~1', '/').replaceAll('~0', '~');
      if (typeof target !== 'object' || target === null) {
        return undefined;
      }
      target = Reflect.get(target, segment);
    }
    return target;
  }

  /** Resolves a local `$ref` pointer within the same schema document. */
  private static resolveLocalReference(schema: Record<string, unknown>, rootSchema: object | boolean): Record<string, unknown> | undefined {
    const reference = schema.$ref;
    if (typeof reference !== 'string' || !reference.startsWith('#')) {
      return undefined;
    }
    const target = EntityCfworkerCompiler.resolveSchemaPointer(rootSchema, reference);
    const result = EntityCfworkerCompiler.isPlainObject(target) ? target : undefined;
    return result;
  }

  /** Collects every properties-bearing schema fragment reachable through `$ref` and `allOf`. */
  private static compositionSchemas(
    schema: Record<string, unknown>,
    rootSchema: object | boolean,
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
  private static applyDefaults(value: unknown, schema: object | boolean, rootSchema: object | boolean): void {
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
          JsonObject.write(value, key, structuredClone(propertySchema.default));
        }
        if (Reflect.has(value, key)) {
          EntityCfworkerCompiler.applyDefaults(Reflect.get(value, key), propertySchema, rootSchema);
        }
      }
    }
  }

  /** Whether `propertyName` is declared in `properties` or matched by `patternProperties`, across composition. */
  private static accountsForProperty(schema: Record<string, unknown>, rootSchema: object | boolean, propertyName: string): boolean {
    const composed = EntityCfworkerCompiler.compositionSchemas(schema, rootSchema, new Set());
    const composedCount = composed.length;
    for (let index = 0; index < composedCount; index += 1) {
      const fragment = composed[index]!;
      const properties = fragment.properties;
      if (EntityCfworkerCompiler.isPlainObject(properties) && Reflect.has(properties, propertyName)) {
        return true;
      }
      const patternProperties = fragment.patternProperties;
      if (EntityCfworkerCompiler.isPlainObject(patternProperties)) {
        const patterns = Object.keys(patternProperties);
        const patternCount = patterns.length;
        for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
          if (new RegExp(patterns[patternIndex]!, 'u').test(propertyName)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** `additionalProperties` re-fires on a key whose own `properties`/`patternProperties` failure already reported it. */
  private static isRedundantAdditionalPropertiesUnit(unit: OutputUnit, rootSchema: object | boolean): boolean {
    const suffix = '/additionalProperties';
    if (unit.keyword !== 'additionalProperties' || !unit.keywordLocation.endsWith(suffix)) {
      return false;
    }
    const propertyName = QUOTED_VALUE_PATTERN.exec(unit.error)?.[1];
    if (propertyName === undefined) {
      return false;
    }
    const schemaPath = unit.keywordLocation.slice(0, -suffix.length);
    const fragment = EntityCfworkerCompiler.resolveSchemaPointer(rootSchema, schemaPath);
    if (!EntityCfworkerCompiler.isPlainObject(fragment)) {
      return false;
    }
    const result = EntityCfworkerCompiler.accountsForProperty(fragment, rootSchema, propertyName);
    return result;
  }

  /** Resolves the schema fragment actually declared at an instance path (`properties`/`items`, through `$ref`/`allOf`), to tell a real `false` failure apart from cfworker's phantom duplicate. */
  private static declaredSchemaAtInstancePath(rootSchema: object | boolean, instanceLocation: string): unknown {
    if (instanceLocation === '#') {
      return rootSchema;
    }
    const segments = instanceLocation.slice(2).split('/');
    let schema: unknown = rootSchema;
    const segmentCount = segments.length;
    for (let index = 0; index < segmentCount; index += 1) {
      if (!EntityCfworkerCompiler.isPlainObject(schema)) {
        return undefined;
      }
      const segment = decodeURIComponent(segments[index]!).replaceAll('~1', '/').replaceAll('~0', '~');
      schema = ARRAY_INDEX_SEGMENT_PATTERN.test(segment) ? schema.items : EntityCfworkerCompiler.declaredProperties(schema, rootSchema).get(segment);
    }
    return schema;
  }

  /** `additionalProperties: false` makes cfworker re-fire a `false` unit at a property's instance path even when the property is declared, not additional; the co-occurring `additionalProperties` unit naming it is the tell. */
  private static correlatesWithAdditionalProperties(unit: OutputUnit, errors: readonly OutputUnit[]): boolean {
    if (unit.keyword !== 'false' || unit.instanceLocation === '#') {
      return false;
    }
    const propertyName = decodeURIComponent(unit.instanceLocation.split('/').at(-1) ?? '');
    const result = errors.some((other) => {
      const isMatch = other.keyword === 'additionalProperties' && QUOTED_VALUE_PATTERN.exec(other.error)?.[1] === propertyName;
      return isMatch;
    });
    return result;
  }

  /** A `false` unit correlated with `additionalProperties: false` is phantom when the schema doesn't actually declare `false` at that position; otherwise it is a genuine failure cfworker double-fires and one copy is kept. */
  private static isPhantomFalseUnit(unit: OutputUnit, rootSchema: object | boolean): boolean {
    const declared = EntityCfworkerCompiler.declaredSchemaAtInstancePath(rootSchema, unit.instanceLocation);
    const result = declared !== false;
    return result;
  }

  /** Keywords whose own canonical message already describes the failure when their value is `false`; the `false` unit they trigger duplicates rather than refines it. */
  private static readonly OWN_MESSAGE_WRAPPER_KEYWORDS = new Set(['unevaluatedItems', 'unevaluatedProperties']);

  /** A `false` unit nested under an `unevaluatedItems`/`unevaluatedProperties: false` failure is a duplicate of that keyword's own diagnostic, not a more specific one. */
  private static isCoveredByOwnMessageWrapper(unit: OutputUnit, errors: readonly OutputUnit[]): boolean {
    if (unit.keyword !== 'false') {
      return false;
    }
    const result = errors.some((other) => {
      const isNested = other.instanceLocation === '#'
        ? unit.instanceLocation !== '#'
        : unit.instanceLocation.startsWith(`${other.instanceLocation}/`);
      const isMatch = EntityCfworkerCompiler.OWN_MESSAGE_WRAPPER_KEYWORDS.has(other.keyword) && isNested;
      return isMatch;
    });
    return result;
  }

  /** Keywords whose unit is a pass-through summary at the same instance position as the schema it delegates to, never a sibling branch result. */
  private static readonly INSTANCE_PASSTHROUGH_KEYWORDS = new Set(['$ref', 'anyOf', 'if', 'not', 'oneOf']);

  /** A `false`-unit's `keywordLocation` mirrors its instance path rather than its schema path, so nesting through either unit is judged by instance location instead. A pass-through wrapper (`$ref`, `anyOf`, ...) at the exact same instance position as a `false` failure is explained by it, matching how a non-boolean composition summary is already dropped in favor of its branch failures; an ordinary sibling branch unit sharing that position is not. */
  private static isDescendantUnit(candidate: OutputUnit, other: OutputUnit): boolean {
    if (other.keyword === 'false' && other.instanceLocation === candidate.instanceLocation
      && EntityCfworkerCompiler.INSTANCE_PASSTHROUGH_KEYWORDS.has(candidate.keyword)) {
      return true;
    }
    if (candidate.keyword === 'false' || other.keyword === 'false') {
      const result = candidate.instanceLocation === '#'
        ? other.instanceLocation !== '#'
        : other.instanceLocation.startsWith(`${candidate.instanceLocation}/`);
      return result;
    }
    const result = other.keywordLocation.startsWith(`${candidate.keywordLocation}/`);
    return result;
  }

  /** Keeps only the most specific failure per branch; drops summary wrappers a descendant unit already explains. */
  private static leafErrors(errors: readonly OutputUnit[], rootSchema: object | boolean): readonly OutputUnit[] {
    const seenAdditionalPropertiesFalseLocations = new Set<string>();
    const meaningful = errors.filter((unit) => {
      const correlatesWithAdditionalProperties = EntityCfworkerCompiler.correlatesWithAdditionalProperties(unit, errors);
      const isPhantom = correlatesWithAdditionalProperties && EntityCfworkerCompiler.isPhantomFalseUnit(unit, rootSchema);
      const isDuplicateClone = correlatesWithAdditionalProperties && !isPhantom
        && seenAdditionalPropertiesFalseLocations.has(unit.instanceLocation);
      const isMeaningful = (unit.keyword === 'false' || unit.keywordLocation !== unit.instanceLocation)
        && !isPhantom
        && !isDuplicateClone
        && !EntityCfworkerCompiler.isCoveredByOwnMessageWrapper(unit, errors)
        && !EntityCfworkerCompiler.isRedundantAdditionalPropertiesUnit(unit, rootSchema);
      if (isMeaningful && correlatesWithAdditionalProperties) {
        seenAdditionalPropertiesFalseLocations.add(unit.instanceLocation);
      }
      return isMeaningful;
    });
    const errorCount = meaningful.length;
    const result: OutputUnit[] = [];
    for (let candidateIndex = 0; candidateIndex < errorCount; candidateIndex += 1) {
      const candidate = meaningful[candidateIndex]!;
      let hasMoreSpecificDescendant = false;
      for (let otherIndex = 0; otherIndex < errorCount; otherIndex += 1) {
        if (otherIndex === candidateIndex) {
          continue;
        }
        if (EntityCfworkerCompiler.isDescendantUnit(candidate, meaningful[otherIndex]!)) {
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

  /** The `/contains`, `/minContains`, or `/maxContains` suffix a unit's `keywordLocation` carries, by keyword. */
  private static readonly CONTAINS_FAMILY_SUFFIXES = new Map<string, string>([
    ['contains', '/contains'],
    ['maxContains', '/maxContains'],
    ['minContains', '/minContains']
  ]);

  /** The `minimum`/`maximum` Ajv would use for a `contains`/`minContains`/`maxContains` unit: declared `minContains` (default 1) and `maxContains`. */
  private static containsParameters(unit: OutputUnit, rootSchema: object | boolean): { 'maximum': number | undefined; 'minimum': number } | undefined {
    const suffix = EntityCfworkerCompiler.CONTAINS_FAMILY_SUFFIXES.get(unit.keyword);
    if (suffix === undefined || !unit.keywordLocation.endsWith(suffix)) {
      return undefined;
    }
    const fragment = EntityCfworkerCompiler.resolveSchemaPointer(rootSchema, unit.keywordLocation.slice(0, -suffix.length));
    if (!EntityCfworkerCompiler.isPlainObject(fragment)) {
      return undefined;
    }
    const minimum = typeof fragment.minContains === 'number' ? fragment.minContains : 1;
    const maximum = typeof fragment.maxContains === 'number' ? fragment.maxContains : undefined;
    const result = { 'maximum': maximum, 'minimum': minimum };
    return result;
  }

  /** Ajv reports the full declared `dependentRequired[property]` array, not only the currently-missing keys. */
  private static dependentRequiredParameters(unit: OutputUnit, rootSchema: object | boolean): { 'deps': readonly string[]; 'property': string } | undefined {
    if (unit.keyword !== 'dependentRequired') {
      return undefined;
    }
    const trigger = QUOTED_VALUE_PATTERN.exec(unit.error)?.[1];
    if (trigger === undefined) {
      return undefined;
    }
    const suffix = '/dependantRequired';
    const schemaPath = unit.keywordLocation.endsWith(suffix) ? unit.keywordLocation.slice(0, -suffix.length) : undefined;
    const fragment = schemaPath === undefined ? undefined : EntityCfworkerCompiler.resolveSchemaPointer(rootSchema, schemaPath);
    if (!EntityCfworkerCompiler.isPlainObject(fragment) || !EntityCfworkerCompiler.isPlainObject(fragment.dependentRequired)) {
      return undefined;
    }
    const deps = Reflect.get(fragment.dependentRequired, trigger);
    if (!Array.isArray(deps)) {
      return undefined;
    }
    const declaredDeps = deps.filter((entry): entry is string => {
      const isString = typeof entry === 'string';
      return isString;
    });
    const result = { 'deps': declaredDeps, 'property': trigger };
    return result;
  }

  /** The schema-declared value a keyword's message renders, computed rather than pointer-resolved for `unevaluatedItems`. */
  private static keywordValue(unit: OutputUnit, rootSchema: object | boolean): unknown {
    if (unit.keyword !== 'unevaluatedItems') {
      const result = EntityCfworkerCompiler.resolveSchemaPointer(rootSchema, unit.keywordLocation);
      return result;
    }
    const suffix = '/unevaluatedItems';
    const fragment = unit.keywordLocation.endsWith(suffix)
      ? EntityCfworkerCompiler.resolveSchemaPointer(rootSchema, unit.keywordLocation.slice(0, -suffix.length))
      : undefined;
    const prefixItems = EntityCfworkerCompiler.isPlainObject(fragment) ? fragment.prefixItems : undefined;
    const result = Array.isArray(prefixItems) ? prefixItems.length : 0;
    return result;
  }

  /** Maps a cfworker keyword onto the render key Ajv uses for the same failure, so both engines share one message. */
  private static renderKeyword(unit: OutputUnit, diagnosticParameters: Readonly<Record<string, unknown>>): string {
    if (diagnosticParameters.containsMinimum !== undefined) {
      return 'contains';
    }
    const result = unit.keyword === 'false' ? 'false schema' : unit.keyword;
    return result;
  }

  /** Extracts the structured diagnostic parameters the Node registry reports for the same keywords. */
  private static diagnosticParameters(unit: OutputUnit, rootSchema: object | boolean): Readonly<Record<string, unknown>> {
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
    const contains = EntityCfworkerCompiler.containsParameters(unit, rootSchema);
    if (contains !== undefined) {
      return { 'containsMaximum': contains.maximum, 'containsMinimum': contains.minimum };
    }
    const dependentRequired = EntityCfworkerCompiler.dependentRequiredParameters(unit, rootSchema);
    if (dependentRequired !== undefined) {
      return { 'dependentProperty': dependentRequired.property, 'missingDependentProperties': dependentRequired.deps };
    }
    return {};
  }

  /** Converts a cfworker output unit into the diagnostic entity consumers expect. */
  private static toEntityError(unit: OutputUnit, rootSchema: object | boolean): EntityValidationErrorInterface {
    const instancePath = unit.instanceLocation === '#' ? '' : decodeURIComponent(unit.instanceLocation.slice(1));
    const diagnosticParameters = EntityCfworkerCompiler.diagnosticParameters(unit, rootSchema);
    const keywordValue = EntityCfworkerCompiler.keywordValue(unit, rootSchema);
    const renderKeyword = EntityCfworkerCompiler.renderKeyword(unit, diagnosticParameters);
    const canonicalMessage = EntityDiagnostics.render({
      'additionalProperty': typeof diagnosticParameters.additionalProperty === 'string' ? diagnosticParameters.additionalProperty : undefined,
      'containsMaximum': typeof diagnosticParameters.containsMaximum === 'number' ? diagnosticParameters.containsMaximum : undefined,
      'containsMinimum': typeof diagnosticParameters.containsMinimum === 'number' ? diagnosticParameters.containsMinimum : undefined,
      'dependentProperty': typeof diagnosticParameters.dependentProperty === 'string' ? diagnosticParameters.dependentProperty : undefined,
      'keyword': renderKeyword,
      'keywordValue': keywordValue,
      'missingDependentProperties': Array.isArray(diagnosticParameters.missingDependentProperties) ? diagnosticParameters.missingDependentProperties as readonly string[] : undefined,
      'missingProperty': typeof diagnosticParameters.missingProperty === 'string' ? diagnosticParameters.missingProperty : undefined
    });
    const diagnostic: Record<string, unknown> = {
      'instancePath': instancePath,
      'keyword': unit.keyword,
      'message': canonicalMessage ?? unit.error,
      'schemaPath': unit.keywordLocation
    };
    JsonObject.write(diagnostic, ENTITY_CFWORKER_CONSTANTS.errorDiagnosticParametersKey, diagnosticParameters);
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
