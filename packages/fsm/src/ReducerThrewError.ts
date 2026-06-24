import { FsmError } from './errors/FsmError.js';

export class ReducerThrewError extends FsmError {
  readonly eventType: string;
  readonly stateVariant: string;

  constructor(options: { readonly 'cause': unknown; readonly 'eventType': string; readonly 'stateVariant': string }) {
    super({
      'cause': options.cause,
      'code': 'fsm.reducerThrew',
      'message': `Reducer threw on event '${options.eventType}' in state '${options.stateVariant}'`
    });
    this.eventType = options.eventType;
    this.stateVariant = options.stateVariant;
  }
}
