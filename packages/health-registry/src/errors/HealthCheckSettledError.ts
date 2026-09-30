import { HealthRegistryError } from './HealthRegistryError.js';

/**
 * Abort reason for the timeout timer of a single health check.
 *
 * The timer is cancelled with this reason once the check has settled (resolved, rejected, or
 * timed out), so the deadline never outlives the check it guards.
 */
export class HealthCheckSettledError extends HealthRegistryError {
  public override readonly name: string = 'HealthCheckSettledError';

  public readonly checkName: string;

  public constructor(checkName: string) {
    super({
      'code': 'healthRegistry.checkSettled',
      'message': `Health check "${checkName}" settled; its timeout timer is cancelled.`,
      'retryable': false
    });
    this.checkName = checkName;
  }
}
