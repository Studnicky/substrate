import type { ValidationExecutionContextInterface } from './CompilerExecutionStateInterface.js';
import type { EvaluatedTrackerInterface } from './EvaluatedTrackerInterface.js';

/** Checks one `unevaluated*` residual (properties or items), marking each visited member on `own`. */
export interface ResidualCheckerFunctionInterface {
  (value: unknown, context: ValidationExecutionContextInterface, own: EvaluatedTrackerInterface): boolean;
}
