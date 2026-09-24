import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { SchemaCompilerInterface } from '../interfaces/SchemaCompilerInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { SchemaId } from '../SchemaId.js';
import { SchemaNodeCompiler } from './SchemaNodeCompiler.js';

interface MutableValidateFunctionInterface<TValidated> {
  (data: unknown): data is TValidated;
  'errors': readonly EntityValidationErrorInterface[] | null;
}

/**
 * EntityClosureRegistry — specialised-closure compilation backend, no code construction on any path.
 *
 * Compiles a schema to a tree of closures once, at `compile` time; validation walks that tree without
 * building or evaluating source text. Serves node and browser identically since it has no runtime split.
 */
export class EntityClosureRegistry {
  public static create(fillDefaults: boolean): SchemaCompilerInterface {
    const cache = new Map<string, MutableValidateFunctionInterface<unknown>>();

    const compile = <TValidated>(schema: object | boolean): EntityValidateFunctionInterface<TValidated> => {
      const id = SchemaId.of(schema);
      if (id !== undefined) {
        const existing = cache.get(id);
        if (existing !== undefined) {
          const result = existing as MutableValidateFunctionInterface<TValidated>;
          return result;
        }
      }
      const node = SchemaNodeCompiler.compile(schema, { 'referenceCache': new Map(), 'rootSchema': schema }, '#');
      const predicate = EntityClosureRegistry.toPredicate<TValidated>(node, fillDefaults);
      if (id !== undefined) {
        cache.set(id, predicate);
      }
      return predicate;
    };

    const getSchema = <TValidated>(key: string): EntityValidateFunctionInterface<TValidated> | undefined => {
      const result = cache.get(key) as MutableValidateFunctionInterface<TValidated> | undefined;
      return result;
    };

    const result = { 'compile': compile, 'getSchema': getSchema };
    return result;
  }

  private static toPredicate<TValidated>(node: CompiledNodeInterface, fillDefaults: boolean): MutableValidateFunctionInterface<TValidated> {
    const predicate = ((data: unknown): data is TValidated => {
      const context: ValidationExecutionContextInterface = {
        'dynamicScope': [], 'options': { 'fillDefaults': fillDefaults }, 'referenceGuard': new Set<object>()
      };
      const valid = node.check(data, context);
      predicate.errors = valid ? null : node.collect(data, context, '', '');
      return valid;
    }) as MutableValidateFunctionInterface<TValidated>;
    predicate.errors = null;
    return predicate;
  }
}
