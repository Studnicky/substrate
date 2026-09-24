import type { DynamicScopeFrameInterface } from './DynamicScopeFrameInterface.js';
import type { ValidationExecutionOptionsInterface } from './ValidationExecutionOptionsInterface.js';

/** Per-call runtime state threaded through every nested closure invocation. */
export interface ValidationExecutionContextInterface {
  readonly 'dynamicScope': DynamicScopeFrameInterface[];
  readonly 'options': ValidationExecutionOptionsInterface;
}
