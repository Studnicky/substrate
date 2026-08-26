import { BoundaryCycleGuard, IntakeCompiler } from '@studnicky/intake-kit';
import { Predicates } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from '../interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';

import { ValidationError } from '../errors/ValidationError.js';

// WHY THIS DELEGATES TO `@studnicky/intake-kit`.
//
// `@studnicky/errors` cannot depend on `@studnicky/json`'s Ajv-backed `SchemaValidator` — `json`
// already depends on `errors` for `BaseError`, so the reverse edge would be circular. Every
// schema-backed error entity used to work around that by inheriting a hand-rolled copy of the
// generic `{create, intake}` wrapping and cycle-detection logic that lived entirely in this file.
// `@studnicky/intake-kit` has no dependency on either package — it factors out exactly that
// generic orchestration — so this file now supplies its own error type and clone strategy to
// `IntakeCompiler`/`BoundaryCycleGuard` instead of re-deriving them. The wrapping semantics
// (`intake` clones-then-strips-unknown; `create` clones-then-fills-defaults; neither coerces a
// scalar's type) are unchanged, and every one of the entities that call `EntityIntake.compile*`
// below keeps its existing call signature.

export namespace EntityIntake {
  export interface ParseOptionsInterface {
    readonly 'rejectUnknownProperties': boolean;
  }

  export interface ParserInterface<TEntity> {
    (candidate: Record<string, Parameters<EntityIntakeFunctionInterface<never>>[0]>, options: ParseOptionsInterface): TEntity | undefined;
  }
}

/** Shared untrusted-input boundary for schema-backed error entities. */
export class EntityIntake {
  private static readonly BOUNDARY_CONFIG: IntakeCompiler.BoundaryConfigInterface = {
    'clone': EntityIntake.clone,
    'onInvalidCandidate': EntityIntake.fail
  };

  public static compileCreate<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): EntityCreateFunctionInterface<TEntity> {
    const result = IntakeCompiler.compileCreate(parser, entityName, EntityIntake.BOUNDARY_CONFIG);
    return result;
  }

  public static compile<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): {
    readonly 'create': EntityCreateFunctionInterface<TEntity>;
    readonly 'intake': EntityIntakeFunctionInterface<TEntity>;
  } {
    const result = IntakeCompiler.compile(parser, entityName, EntityIntake.BOUNDARY_CONFIG);
    return result;
  }

  public static compileIntake<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): EntityIntakeFunctionInterface<TEntity> {
    const result = IntakeCompiler.compileIntake(parser, entityName, EntityIntake.BOUNDARY_CONFIG);
    return result;
  }

  public static hasOnlyKeys(candidate: Record<string, Parameters<EntityIntakeFunctionInterface<never>>[0]>, keys: readonly string[]): boolean {
    const permittedKeys = new Set(keys);
    const result = Object.keys(candidate).every((key) => {
      const permitted = permittedKeys.has(key);
      return permitted;
    });
    return result;
  }

  public static boolean(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): boolean | undefined {
    if (Predicates.isBoolean(value)) {
      return value;
    }
    return undefined;
  }

  public static number(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): number | undefined {
    if (Predicates.isNumber(value) && Number.isFinite(value)) {
      return value;
    }
    return undefined;
  }

  public static string(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): string | undefined {
    if (Predicates.isString(value)) {
      return value;
    }
    return undefined;
  }

  /** Deep-clones `value`, rejecting a cyclic graph before attempting to walk it. */
  private static clone(value: Parameters<EntityIntakeFunctionInterface<never>>[0], entityName: string): Parameters<EntityIntakeFunctionInterface<never>>[0] {
    if (BoundaryCycleGuard.hasCycle(value)) {
      EntityIntake.fail(entityName, 'cyclic input is not supported');
    }

    const result = EntityIntake.cloneValue(value);
    return result;
  }

  /** Recursively clones an already-verified-acyclic value. */
  private static cloneValue(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): Parameters<EntityIntakeFunctionInterface<never>>[0] {
    if (!Predicates.isObjectLike(value)) {
      return value;
    }
    if (Predicates.isArray(value)) {
      const result: unknown[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = value[index];
        result.push(EntityIntake.cloneValue(item));
      }
      return result;
    }
    if (Predicates.isMap(value)) {
      const cloned = new Map<unknown, unknown>();
      for (const [key, item] of value.entries()) {
        cloned.set(EntityIntake.cloneValue(key), EntityIntake.cloneValue(item));
      }
      return cloned;
    }
    if (Predicates.isSet(value)) {
      const cloned = new Set<unknown>();
      for (const item of value.values()) {
        cloned.add(EntityIntake.cloneValue(item));
      }
      return cloned;
    }
    if (Predicates.isDate(value)) {
      const result = new Date(value.getTime());
      return result;
    }
    if (Predicates.isObject(value)) {
      const cloned: Record<string, unknown> = {};
      const keys = Object.keys(value);
      const keysLength = keys.length;
      for (let keyIndex = 0; keyIndex < keysLength; keyIndex += 1) {
        const key = keys[keyIndex];
        if (key === undefined) { continue; }
        Reflect.set(cloned, key, EntityIntake.cloneValue(Reflect.get(value, key)));
      }
      return cloned;
    }
    return value;
  }

  private static fail(entityName: string, message: string): never {
    throw ValidationError.create({
      'message': message,
      'path': entityName
    });
  }
}
