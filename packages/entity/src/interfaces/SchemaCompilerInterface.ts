import type { EntityValidateFunctionInterface } from './EntityValidateFunctionInterface.js';

/** One schema-keyed compilation backend: compiles a schema once and caches it by `$id`. */
export interface SchemaCompilerInterface {
  /** `remoteSchemas`, keyed by the URI a `$ref` addresses them by, are resolved as if externally retrieved — no network I/O. */
  readonly 'compile': <TValidated>(
    schema: object | boolean, remoteSchemas?: ReadonlyMap<string, object | boolean>
  ) => EntityValidateFunctionInterface<TValidated>;
  readonly 'getSchema': <TValidated>(key: string) => EntityValidateFunctionInterface<TValidated> | undefined;
}
