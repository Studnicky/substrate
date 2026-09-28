import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface, ValidationExecutionContextInterface } from './interfaces/CompilerExecutionStateInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';

/** Wraps a resolver so its target compiles at most once, on first validation call — breaks compile-time reference cycles. */
export class LazyCompiledNode {
  public static wrap(resolve: () => CompiledNodeInterface): CompiledNodeInterface {
    let resolved: CompiledNodeInterface | undefined;
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      resolved ??= resolve();
      const result = resolved.check(value, context, evaluated);
      return result;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      resolved ??= resolve();
      const result = resolved.collect(value, context, instancePath, schemaPath, evaluated);
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }
}
