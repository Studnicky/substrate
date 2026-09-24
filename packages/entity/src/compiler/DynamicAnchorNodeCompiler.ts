import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { DynamicScopeFrameInterface } from './interfaces/DynamicScopeFrameInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

/** Wraps a schema resource's compiled node: pushes its `$dynamicAnchor` bookending frame on entry, pops on exit. */
export class DynamicAnchorNodeCompiler {
  public static wrap(frame: DynamicScopeFrameInterface, node: CompiledNodeInterface): CompiledNodeInterface {
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      context.dynamicScope.push(frame);
      try {
        const result = node.check(value, context, evaluated);
        return result;
      } finally {
        context.dynamicScope.pop();
      }
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      context.dynamicScope.push(frame);
      try {
        const result = node.collect(value, context, instancePath, schemaPath, evaluated);
        return result;
      } finally {
        context.dynamicScope.pop();
      }
    };
    const result: CompiledNodeInterface = { 'check': check, 'collect': collect };
    return result;
  }
}
