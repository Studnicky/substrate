import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';

/** The engine-agnostic seam: any compiler exposing `EntityCompiler.compile`'s shape can be gated by the runner. */
export interface ConformanceCompilerInterface {
  compile(schema: boolean | object, remoteSchemas?: ReadonlyMap<string, object | boolean>): EntityValidateFunctionInterface<unknown>;
}
