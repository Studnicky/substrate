import { Predicates } from '@studnicky/types/node';

import type { EntityCreateFunctionInterface } from './interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from './interfaces/EntityIntakeFunctionInterface.js';

export namespace EntityCompiler {
  export interface ParseOptionsInterface {
    readonly 'rejectUnknownProperties': boolean;
  }

  export interface ParserInterface<TEntity> {
    (candidate: Record<string, unknown>, options: ParseOptionsInterface): TEntity | undefined;
  }

  /** Injected, package-specific behavior the generic orchestration never hardcodes. */
  export interface BoundaryConfigInterface {
    /** Produces an independent copy of `value`, rejecting cycles however the caller sees fit. */
    readonly 'clone': (value: unknown, entityName: string) => unknown;
    /** Throws the caller's own domain error when `candidate` isn't a parseable object. */
    readonly 'onInvalidCandidate': (entityName: string, reason: string) => never;
  }
}

/** Generic `{create, intake}` compile orchestration, parameterized over an injected parser. */
export class EntityCompiler {
  public static compile<TEntity>(
    parser: EntityCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: EntityCompiler.BoundaryConfigInterface
  ): {
    readonly 'create': EntityCreateFunctionInterface<TEntity>;
    readonly 'intake': EntityIntakeFunctionInterface<TEntity>;
  } {
    const create = EntityCompiler.compileCreate(parser, entityName, config);
    const intake = EntityCompiler.compileIntake(parser, entityName, config);
    const result = { 'create': create, 'intake': intake };
    return result;
  }

  public static compileCreate<TEntity>(
    parser: EntityCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: EntityCompiler.BoundaryConfigInterface
  ): EntityCreateFunctionInterface<TEntity> {
    const create: EntityCreateFunctionInterface<TEntity> = (partial = {}) => {
      const candidate = config.clone(partial, entityName);
      const result = EntityCompiler.parse(candidate, parser, entityName, config, {
        'rejectUnknownProperties': true
      });
      return result;
    };
    return create;
  }

  public static compileIntake<TEntity>(
    parser: EntityCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: EntityCompiler.BoundaryConfigInterface
  ): EntityIntakeFunctionInterface<TEntity> {
    const intake: EntityIntakeFunctionInterface<TEntity> = (input) => {
      const candidate = config.clone(input, entityName);
      const result = EntityCompiler.parse(candidate, parser, entityName, config, {
        'rejectUnknownProperties': true
      });
      return result;
    };
    return intake;
  }

  private static parse<TEntity>(
    candidate: unknown,
    parser: EntityCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: EntityCompiler.BoundaryConfigInterface,
    options: EntityCompiler.ParseOptionsInterface
  ): TEntity {
    if (!Predicates.isObject(candidate)) {
      const result = config.onInvalidCandidate(entityName, 'must be an object');
      return result;
    }

    const result = parser(candidate, options);
    if (result === undefined) {
      const failure = config.onInvalidCandidate(entityName, 'does not match the declared schema');
      return failure;
    }
    return result;
  }
}
