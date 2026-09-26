import type { SchemaIntakeError } from '@studnicky/entity/browser';

/** Resolves a `LogBuildError` message from a config entity's `SchemaIntakeError`, naming the missing field when the failure is a required-property violation. */
class LogBuildErrorMessage {
  public static resolve(prefix: string, error: SchemaIntakeError): string {
    const requiredError = error.errors.find((item) => {
      const result = item.keyword === 'required';
      return result;
    });
    const missingProperty: unknown = requiredError === undefined
      ? undefined
      : Reflect.get(requiredError.parameters, 'missingProperty');
    const result = typeof missingProperty !== 'string'
      ? error.message
      : `${prefix}: ${missingProperty} is required${missingProperty === 'context' ? ' (use empty object {} if no context needed)' : ''}`;
    return result;
  }
}

export { LogBuildErrorMessage };
