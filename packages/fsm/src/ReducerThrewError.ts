export class ReducerThrewError extends Error {
  readonly eventType: string;
  readonly stateVariant: string;

  constructor(options: { 'cause': unknown; 'eventType': string; 'stateVariant': string }) {
    super(`Reducer threw on event '${options.eventType}' in state '${options.stateVariant}'`);
    this.cause = options.cause;
    this.eventType = options.eventType;
    this.stateVariant = options.stateVariant;
  }
}
