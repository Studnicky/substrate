import { FsmError } from './FsmError.js';

/**
 * Thrown to reject a queued event's settlement when the mailbox is full and
 * the event is evicted to make room for a newer one.
 */
export class MailboxCapacityExceededError extends FsmError {
  constructor(message: string) {
    super({ 'code': 'fsm.mailboxCapacityExceeded', 'message': message, 'retryable': false });
  }
}
