import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';

/** The engine-agnostic seam: any compiler matching `EntityCompiler.compile`'s shape can be gated by the runner. */
export interface ConformanceCompileFunctionInterface {
  <TValidated>(schema: object): EntityValidateFunctionInterface<TValidated>;
}
