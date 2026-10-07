import { BaseError } from '#runtime';

/** Thrown when the recursive drilldown rules schema node cannot be assembled. */
export class DrilldownRulesBuildError extends BaseError {
  public override readonly name: string = 'DrilldownRulesBuildError';

  public constructor(message: string) {
    super({ 'code': 'drilldown.rulesBuildFailed', 'message': message, 'retryable': false });
  }
}
