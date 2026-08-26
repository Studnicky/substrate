import { BaseError } from './BaseError.js';
/**
 * Error used to exit a CLI process with a specific exit code.
 *
 * Commander action handlers throw this to terminate early without
 * printing a stack trace to the user. The `exitCode` field carries
 * the process exit code (defaults to `1`).
 *
 * @module
 */
import { ErrorCodeRegistry } from './ErrorCodeRegistry.js';

// Register at module load.
ErrorCodeRegistry.register({
  'code': 'cli.exit',
  'description': 'CLI process exit requested with a specific exit code.',
  'retryable': false
});

/**
 * Thrown by CLI action handlers to request a clean process exit.
 * Caught at the top-level handler; stack trace is not printed.
 *
 * Subclasses that need a custom exit message should call
 * `CliExitError.buildExitMessage(exitCode)` as the `message` argument
 * passed to `super()` in their own constructor.
 */
export class CliExitError extends BaseError {
  /** Process exit code to pass to `process.exit()`. */
  public readonly exitCode: number;

  public constructor(exitCode = 1) {
    super({
      'code': 'cli.exit',
      'message': '',
      'retryable': false
    });
    this.exitCode = exitCode;
  }
}
