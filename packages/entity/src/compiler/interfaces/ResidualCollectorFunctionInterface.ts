import type { EntityValidationErrorInterface } from '../../interfaces/EntityValidationErrorInterface.js';
import type { ValidationExecutionContextInterface } from './CompilerExecutionStateInterface.js';
import type { EvaluatedTrackerInterface } from './EvaluatedTrackerInterface.js';

/** Collects errors for one `unevaluated*` residual (properties or items), marking each visited member on `own`. */
export interface ResidualCollectorFunctionInterface {
  (
    value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string, own: EvaluatedTrackerInterface
  ): EntityValidationErrorInterface[];
}
