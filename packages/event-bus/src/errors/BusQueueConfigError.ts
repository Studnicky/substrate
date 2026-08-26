/** Thrown when BusQueue is constructed with invalid configuration. */

import { EventBusError } from './EventBusError.js';

export class BusQueueConfigError extends EventBusError {
  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'eventBus.invalidConfig', 'message': message, 'retryable': false });
  }
}
