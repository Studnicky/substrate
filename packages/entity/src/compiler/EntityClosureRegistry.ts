import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { SchemaCompilerInterface } from '../interfaces/SchemaCompilerInterface.js';
import type { CompiledNodeInterface, ValidationExecutionContextInterface } from './interfaces/CompilerExecutionStateInterface.js';

import { SchemaId } from '../SchemaId.js';
import { KnownMetaschemaRegistry } from './KnownMetaschemaRegistry.js';
import { SchemaNodeCompiler } from './SchemaNodeCompiler.js';
import { SchemaResourceIndex } from './SchemaResourceIndex.js';
import { SchemaVocabularyResolver } from './SchemaVocabularyResolver.js';

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
  private static readonly NO_REMOTES: ReadonlyMap<string, object | boolean> = new Map();

  public static create(fillDefaults: boolean): SchemaCompilerInterface {
    const cache = new Map<string, MutableValidateFunctionInterface<never>>();

    const compile = <TValidated>(
      schema: object | boolean, remoteSchemas: ReadonlyMap<string, object | boolean> = EntityClosureRegistry.NO_REMOTES
    ): EntityValidateFunctionInterface<TValidated> => {
      const id = SchemaId.of(schema);
      if (id !== undefined) {
        const existing = cache.get(id);
        if (existing !== undefined) {
          return existing;
        }
      }
      const knownRemotes = EntityClosureRegistry.withKnownMetaschemas(remoteSchemas);
      const resourceIndex = SchemaResourceIndex.build(schema, knownRemotes);
      const validationVocabularyEnabled = SchemaVocabularyResolver.isValidationEnabled(schema, knownRemotes);
      const formatAssertionVocabularyEnabled = SchemaVocabularyResolver.isFormatAssertionEnabled(schema, knownRemotes);
      const compileContext = {
        'formatAssertionVocabularyEnabled': formatAssertionVocabularyEnabled, 'referenceCache': new Map(),
        'remoteSchemas': knownRemotes, 'resourceIndex': resourceIndex, 'validationVocabularyEnabled': validationVocabularyEnabled
      };
      const node = SchemaNodeCompiler.compileRoot(schema, compileContext, '#', '');
      const predicate = EntityClosureRegistry.toPredicate(node, fillDefaults);
      if (id !== undefined) {
        cache.set(id, predicate);
      }
      return predicate;
    };

    const getSchema = <TValidated>(key: string): EntityValidateFunctionInterface<TValidated> | undefined => {
      const cached = cache.get(key);
      return cached;
    };

    const result = { 'compile': compile, 'getSchema': getSchema };
    return result;
  }

  /** A caller's remote registration for the same URI shadows the built-in metaschema. */
  private static withKnownMetaschemas(remoteSchemas: ReadonlyMap<string, object | boolean>): ReadonlyMap<string, object | boolean> {
    const merged = new Map<string, object | boolean>(KnownMetaschemaRegistry.remoteSchemas);
    remoteSchemas.forEach((value, key) => { merged.set(key, value); });
    return merged;
  }

  /** The predicate's declared type is a phantom over `TValidated`; `never` is the sound universal witness a caller's generic narrows from. */
  private static toPredicate(node: CompiledNodeInterface, fillDefaults: boolean): MutableValidateFunctionInterface<never> {
    const predicate: MutableValidateFunctionInterface<never> = (data: unknown): data is never => {
      const context: ValidationExecutionContextInterface = {
        'dynamicScope': [], 'options': { 'fillDefaults': fillDefaults }
      };
      const valid = node.check(data, context);
      predicate.errors = valid ? null : node.collect(data, context, '', '');
      return valid;
    };
    predicate.errors = null;
    return predicate;
  }
}
