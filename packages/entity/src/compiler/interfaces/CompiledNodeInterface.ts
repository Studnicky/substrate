import type { EntityValidationErrorInterface } from '../../interfaces/EntityValidationErrorInterface.js';
import type { EvaluatedTrackerInterface } from './EvaluatedTrackerInterface.js';
import type { ValidationExecutionContextInterface } from './ValidationExecutionContextInterface.js';

/** One schema node compiled to a specialised closure pair: a bailing predicate and an error-collecting walk. */
export interface CompiledNodeInterface {
  readonly 'check': (
    value: unknown,
    context: ValidationExecutionContextInterface,
    evaluated?: EvaluatedTrackerInterface
  ) => boolean;
  readonly 'collect': (
    value: unknown,
    context: ValidationExecutionContextInterface,
    instancePath: string,
    schemaPath: string,
    evaluated?: EvaluatedTrackerInterface
  ) => EntityValidationErrorInterface[];
}
