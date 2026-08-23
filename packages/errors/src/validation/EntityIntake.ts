import { Guard } from '@studnicky/types';

import { ValidationError } from '../errors/ValidationError.js';

export namespace EntityIntake {
  export interface ParseOptionsInterface {
    readonly 'coerce': boolean;
    readonly 'rejectUnknownProperties': boolean;
  }

  export interface ParserInterface<TEntity> {
    (candidate: Record<string, unknown>, options: ParseOptionsInterface): TEntity | undefined;
  }
}

/** Shared untrusted-input boundary for schema-backed error entities. */
export class EntityIntake {
  public static create<TEntity>(
    input: unknown,
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
  ): (partial?: Partial<TEntity>) => TEntity {
    const create = (partial: Partial<TEntity> = {}): TEntity => {
      const result = EntityIntake.create(partial, parser, entityName);
      return result;
    };
    return create;
  }

  public static compile<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): {
    readonly 'create': (partial?: Partial<TEntity>) => TEntity;
    readonly 'intake': (input: unknown) => TEntity;
  } {
    const create = EntityIntake.compileCreate(parser, entityName);
    const intake = EntityIntake.compileIntake(parser, entityName);
    const result = { 'create': create, 'intake': intake };
    return result;
  }

  public static compileIntake<TEntity>(
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string
  ): (input: unknown) => TEntity {
    const intake = (input: unknown): TEntity => {
      const result = EntityIntake.intake(input, parser, entityName);
      return result;
    };
    return intake;
  }

  public static intake<TEntity>(input: unknown, parser: EntityIntake.ParserInterface<TEntity>, entityName: string): TEntity {
    const candidate = EntityIntake.clone(input, entityName);
    const result = EntityIntake.parse(candidate, parser, entityName, {
      'coerce': true,
      'rejectUnknownProperties': false
    });
    return result;
  }

  public static hasOnlyKeys(candidate: Record<string, unknown>, keys: readonly string[]): boolean {
    const permittedKeys = new Set(keys);
    const result = Object.keys(candidate).every((key) => {
      const permitted = permittedKeys.has(key);
      return permitted;
    });
    return result;
  }

  public static boolean(value: unknown, coerce: boolean): boolean | undefined {
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

  public static number(value: unknown, coerce: boolean): number | undefined {
    if (Guard.isNumber(value) && Number.isFinite(value)) {
      return value;
    }
    if (!coerce) {
      return undefined;
    }
    if (value === null || Guard.isBoolean(value) || (Guard.isString(value) && value !== '')) {
      const result = Number(value);
      return Number.isFinite(result) ? result : undefined;
    }
    return undefined;
  }

  public static string(value: unknown, coerce: boolean): string | undefined {
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

  private static clone(value: unknown, entityName: string): unknown {
    return EntityIntake.cloneValue(value, new WeakSet<object>(), entityName);
  }

  private static cloneValue(value: unknown, ancestors: WeakSet<object>, entityName: string): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (ancestors.has(value)) {
      EntityIntake.fail(entityName, 'cyclic input is not supported');
    }

    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        return value.map((item) => {return EntityIntake.cloneValue(item, ancestors, entityName);});
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
        return new Date(value.getTime());
      }
      if (Guard.isObject(value)) {
        const cloned: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
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
    candidate: unknown,
    parser: EntityIntake.ParserInterface<TEntity>,
    entityName: string,
    options: EntityIntake.ParseOptionsInterface
  ): TEntity {
    if (!Guard.isObject(candidate)) {
      return EntityIntake.fail(entityName, 'must be an object');
    }
    const result = parser(candidate, options);
    if (result === undefined) {
      return EntityIntake.fail(entityName, 'does not match the declared schema');
    }
    return result;
  }
}
