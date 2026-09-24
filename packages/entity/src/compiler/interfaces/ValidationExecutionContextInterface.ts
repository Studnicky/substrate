import type { DynamicScopeFrameInterface } from './DynamicScopeFrameInterface.js';
import type { ValidationExecutionOptionsInterface } from './ValidationExecutionOptionsInterface.js';

/** Per-call runtime state threaded through every nested closure invocation. */
export interface ValidationExecutionContextInterface {
  readonly 'dynamicScope': DynamicScopeFrameInterface[];
  readonly 'options': ValidationExecutionOptionsInterface;
  /** Object-identity guard: values currently being walked through an in-flight `$ref`, catching cyclic data. */
  readonly 'referenceGuard': Set<object>;
}
