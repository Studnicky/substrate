export class DlqAbortedError extends Error {
  constructor() { super('Dead letter queue is aborted'); this.name = 'DlqAbortedError'; }
}
