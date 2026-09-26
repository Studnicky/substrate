import type { EntityValidationErrorInterface } from '../../interfaces/EntityValidationErrorInterface.js';
import type { EvaluatedTrackerInterface } from './EvaluatedTrackerInterface.js';
import type { ValidationExecutionOptionsInterface } from './ValidationExecutionOptionsInterface.js';

/**
 * One schema node compiled to a specialised closure pair, the per-call context threaded through every
 * invocation, and one schema resource's `$dynamicAnchor` bindings — mutually recursive by construction
 * (a dynamic scope frame holds compiled nodes, a compiled node takes a context, a context holds frames),
 * so the three live in one module rather than importing each other across files.
 */
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

export interface ValidationExecutionContextInterface {
  readonly 'dynamicScope': DynamicScopeFrameInterface[];
  readonly 'options': ValidationExecutionOptionsInterface;
}

export interface DynamicScopeFrameInterface {
  readonly 'anchors': ReadonlyMap<string, CompiledNodeInterface>;
}
