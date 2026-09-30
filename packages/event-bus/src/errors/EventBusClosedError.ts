import { EventBusError } from './EventBusError.js';

/** Abort reason for every subscriber queue when the bus closes. */
export class EventBusClosedError extends EventBusError {
  public override readonly name: string = 'EventBusClosedError';

  public constructor() {
    super({ 'code': 'eventBus.closed', 'message': 'EventBus is closed; its subscriber queues are cancelled.', 'retryable': false });
  }
}
