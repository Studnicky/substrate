import type { EntityValidateFunctionInterface } from './EntityValidateFunctionInterface.js';

/** One schema-keyed compilation backend: compiles a schema once and caches it by `$id`. */
export interface SchemaCompilerInterface {
  readonly 'compile': <TValidated>(schema: object | boolean) => EntityValidateFunctionInterface<TValidated>;
  readonly 'getSchema': <TValidated>(key: string) => EntityValidateFunctionInterface<TValidated> | undefined;
}
