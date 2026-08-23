import { Guard } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from '../interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';

import { ValidationError } from '../errors/ValidationError.js';

export namespace EntityIntake {
  export interface ParseOptionsInterface {
    readonly 'coerce': boolean;
    readonly 'rejectUnknownProperties': boolean;
  }

  export interface ParserInterface<TEntity> {
    (candidate: Record<string, Parameters<EntityIntakeFunctionInterface<never>>[0]>, options: ParseOptionsInterface): TEntity | undefined;
  }
}

/** Shared untrusted-input boundary for schema-backed error entities. */
export class EntityIntake {
  private static create<TEntity>(
    input: Parameters<EntityIntakeFunctionInterface<never>>[0],
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): TEntity {
    const candidate = EntityIntake.clone(input, entityName);
    const result = EntityIntake.parse(candidate, parser, entityName, {
      'coerce': false,
      'rejectUnknownProperties': true
    });
    return result;
  }

  public static compileCreate<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): EntityCreateFunctionInterface<TEntity> {
    const create: EntityCreateFunctionInterface<TEntity> = (partial = {}) => {
      const result = EntityIntake.create(partial, parser, entityName);
      return result;
    };
    return create;
  }

  public static compile<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): {
    readonly 'create': EntityCreateFunctionInterface<TEntity>;
    readonly 'intake': EntityIntakeFunctionInterface<TEntity>;
  } {
    const create = EntityIntake.compileCreate(parser, entityName);
    const intake = EntityIntake.compileIntake(parser, entityName);
    const result = { 'create': create, 'intake': intake };
    return result;
  }

  public static compileIntake<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): EntityIntakeFunctionInterface<TEntity> {
    const intake: EntityIntakeFunctionInterface<TEntity> = (input) => {
      const result = EntityIntake.intake(input, parser, entityName);
      return result;
    };
    return intake;
  }

  private static intake<TEntity>(input: Parameters<EntityIntakeFunctionInterface<never>>[0], parser: EntityIntake.ParserInterface<TEntity>, entityName: string): TEntity {
    const candidate = EntityIntake.clone(input, entityName);
    const result = EntityIntake.parse(candidate, parser, entityName, {
      'coerce': true,
      'rejectUnknownProperties': false
    });
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

  public static boolean(value: Parameters<EntityIntakeFunctionInterface<never>>[0], coerce: boolean): boolean | undefined {
    if (Guard.isBoolean(value)) {
      return value;
    }
    if (!coerce) {
      return undefined;
    }
    if (value === 'true' || value === 1) {
      return true;
    }
    if (value === 'false' || value === 0 || value === null) {
      return false;
    }
    return undefined;
  }

  public static number(value: Parameters<EntityIntakeFunctionInterface<never>>[0], coerce: boolean): number | undefined {
    if (Guard.isNumber(value) && Number.isFinite(value)) {
      return value;
    }
    if (!coerce) {
      return undefined;
    }
    if (value === null || Guard.isBoolean(value) || (Guard.isString(value) && value !== '')) {
      const number = Number(value);
      const result = Number.isFinite(number) ? number : undefined;
      return result;
    }
    return undefined;
  }

  public static string(value: Parameters<EntityIntakeFunctionInterface<never>>[0], coerce: boolean): string | undefined {
    if (Guard.isString(value)) {
      return value;
    }
    if (!coerce) {
      return undefined;
    }
    if (value === null) {
      return '';
    }
    if (Guard.isBoolean(value) || Guard.isNumber(value)) {
      const result = String(value);
      return result;
    }
    return undefined;
  }

  private static clone(value: Parameters<EntityIntakeFunctionInterface<never>>[0], entityName: string): Parameters<EntityIntakeFunctionInterface<never>>[0] {
    const result = EntityIntake.cloneValue(value, new WeakSet<object>(), entityName);
    return result;
  }

  private static cloneValue(value: Parameters<EntityIntakeFunctionInterface<never>>[0], ancestors: WeakSet<object>, entityName: string): Parameters<EntityIntakeFunctionInterface<never>>[0] {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (ancestors.has(value)) {
      EntityIntake.fail(entityName, 'cyclic input is not supported');
    }

    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        const result: unknown[] = [];
        const length = value.length;
        for (let index = 0; index < length; index += 1) {
          const item: unknown = value[index];
          result.push(EntityIntake.cloneValue(item, ancestors, entityName));
        }
        return result;
      }
      if (value instanceof Map) {
        const cloned = new Map<unknown, unknown>();
        for (const [key, item] of value.entries()) {
          cloned.set(
            EntityIntake.cloneValue(key, ancestors, entityName),
            EntityIntake.cloneValue(item, ancestors, entityName)
          );
        }
        return cloned;
      }
      if (value instanceof Set) {
        const cloned = new Set<unknown>();
        for (const item of value.values()) {
          cloned.add(EntityIntake.cloneValue(item, ancestors, entityName));
        }
        return cloned;
      }
      if (value instanceof Date) {
        const result = new Date(value.getTime());
        return result;
      }
      if (Guard.isObject(value)) {
        const cloned: Record<string, unknown> = {};
        const keys = Object.keys(value);
        const keysLength = keys.length;
        for (let keyIndex = 0; keyIndex < keysLength; keyIndex += 1) {
          const key = keys[keyIndex];
          if (key === undefined) { continue; }
          Reflect.set(cloned, key, EntityIntake.cloneValue(Reflect.get(value, key), ancestors, entityName));
        }
        return cloned;
      }
      return value;
    } finally {
      ancestors.delete(value);
    }
  }

  private static fail(entityName: string, message: string): never {
    throw ValidationError.create({
      'message': message,
      'path': entityName
    });
  }

  private static parse<TEntity>(
    candidate: Parameters<EntityIntakeFunctionInterface<never>>[0],
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string,
    options: EntityIntake.ParseOptionsInterface
  ): TEntity {
    if (!Guard.isObject(candidate)) {
      const result = EntityIntake.fail(entityName, 'must be an object');
      return result;
    }
    const result = parser(candidate, options);
    if (result === undefined) {
      const failure = EntityIntake.fail(entityName, 'does not match the declared schema');
      return failure;
    }
    return result;
  }
}
