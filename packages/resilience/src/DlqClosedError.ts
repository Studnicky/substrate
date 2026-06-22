export class DlqClosedError extends Error {
  constructor() { super('Dead letter queue is closed'); this.name = 'DlqClosedError'; }
}
