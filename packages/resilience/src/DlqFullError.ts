export class DlqFullError extends Error {
  constructor() { super('Dead letter queue is full'); this.name = 'DlqFullError'; }
}
