import { BaseError } from '#runtime';

/**
 * Thrown when EntityCompiler is used without a runtime-specific registries accessor.
 * Code: `'entity.compilerConfigurationInvalid'`.
 */
export class EntityCompilerConfigurationError extends BaseError {
  public override readonly name: string = 'EntityCompilerConfigurationError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.compilerConfigurationInvalid',
      'message': message,
      'retryable': false
    });
  }
}
