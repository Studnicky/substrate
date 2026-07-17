/**
 * Fetch-local extension seam for @studnicky/config's ConfigValidation.
 * Routes validation failures through fetch's own ConfigurationError
 * instead of @studnicky/config's, preserving fetch's public error type.
 */
import { ConfigValidation } from '@studnicky/config/validation';

import { ConfigurationError } from '../../errors/index.js';

export class FetchConfigValidation extends ConfigValidation {
  protected static override onValidationError(message: string): never {
    throw new ConfigurationError(message);
  }
}
