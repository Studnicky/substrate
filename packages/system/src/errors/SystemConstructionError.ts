import { BaseError } from '@studnicky/types/browser';

export class SystemConstructionError extends BaseError {
  public override readonly name: string = 'SystemConstructionError';

  public constructor() {
    super({
      'code': 'system.staticOnly',
      'message': 'System is a static-only class',
      'retryable': false
    });
  }
}
