import { EventBusError } from './EventBusError.js';

/** Abort reason for a subscriber queue when its subscription is removed. */
export class EventBusUnsubscribedError extends EventBusError {
  public override readonly name: string = 'EventBusUnsubscribedError';

  public constructor() {
    super({ 'code': 'eventBus.unsubscribed', 'message': 'Subscription is removed; its queue is cancelled.', 'retryable': false });
  }
}
