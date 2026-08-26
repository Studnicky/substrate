import { Predicates } from '@studnicky/types';

import type { EntityCreateFunctionInterface } from './interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from './interfaces/EntityIntakeFunctionInterface.js';

// WHY THIS EXISTS.
//
// `@studnicky/errors` cannot depend on `@studnicky/json`'s `SchemaValidator` — `json` already
// depends on `errors` (for `BaseError`), so the reverse edge would be a circular workspace
// reference. Every schema-backed error entity worked around that by hand-rolling its own
// clone/validate/coerce wrapping instead (`errors/src/validation/EntityIntake.ts`), which
// duplicated the ONE piece of logic that doesn't vary between an Ajv-schema-driven parser and a
// hand-written one: given a candidate value and a parser capable of turning it into `TEntity` or
// rejecting it, produce a `{create, intake}` pair with the right clone-before-parse and
// coerce/reject-unknown semantics for each, and fail through a caller-supplied error path.
//
// That orchestration is what lives here. It has no dependency on `@studnicky/errors` or
// `@studnicky/json` — every failure path and every clone strategy is injected — so both packages
// depend downward on it instead of on each other, and the circular-dependency comments scattered
// across two dozen `errors` entities describe a constraint that no longer exists once they build
// on this instead of a private copy. `@studnicky/json`'s `SchemaValidator` keeps its own
// Ajv-specific `intake`/`create` closures — Ajv validates through three pre-configured instances
// with baked-in coercion settings, not a single function taking per-call options, so forcing it
// onto this exact shape would be a forced-fit rewrite of working code for no behavioral gain. Only
// `@studnicky/errors`, whose parser genuinely is a `(candidate, options) => TEntity | undefined`
// function, adopts this scaffold directly.

export namespace IntakeCompiler {
  export interface ParseOptionsInterface {
    readonly 'coerce': boolean;
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
export class IntakeCompiler {
  public static compile<TEntity>(
    parser: IntakeCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: IntakeCompiler.BoundaryConfigInterface
  ): {
    readonly 'create': EntityCreateFunctionInterface<TEntity>;
    readonly 'intake': EntityIntakeFunctionInterface<TEntity>;
  } {
    const create = IntakeCompiler.compileCreate(parser, entityName, config);
    const intake = IntakeCompiler.compileIntake(parser, entityName, config);
    const result = { 'create': create, 'intake': intake };
    return result;
  }

  public static compileCreate<TEntity>(
    parser: IntakeCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: IntakeCompiler.BoundaryConfigInterface
  ): EntityCreateFunctionInterface<TEntity> {
    const create: EntityCreateFunctionInterface<TEntity> = (partial = {}) => {
      const candidate = config.clone(partial, entityName);
      const result = IntakeCompiler.parse(candidate, parser, entityName, config, {
        'coerce': false,
        'rejectUnknownProperties': true
      });
      return result;
    };
    return create;
  }

  public static compileIntake<TEntity>(
    parser: IntakeCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: IntakeCompiler.BoundaryConfigInterface
  ): EntityIntakeFunctionInterface<TEntity> {
    const intake: EntityIntakeFunctionInterface<TEntity> = (input) => {
      const candidate = config.clone(input, entityName);
      const result = IntakeCompiler.parse(candidate, parser, entityName, config, {
        'coerce': true,
        'rejectUnknownProperties': false
      });
      return result;
    };
    return intake;
  }

  private static parse<TEntity>(
    candidate: unknown,
    parser: IntakeCompiler.ParserInterface<TEntity>,
    entityName: string,
    config: IntakeCompiler.BoundaryConfigInterface,
    options: IntakeCompiler.ParseOptionsInterface
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
