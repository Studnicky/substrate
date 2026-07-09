import { CircularBuffer } from '@studnicky/circular-buffer';

import type { EffectHandlerMapType } from './EffectHandlerMapType.js';
import type { InterpreterHistoryRecordType } from './InterpreterHistoryRecordType.js';
import type { StateMachine } from './StateMachine.js';

import { EffectInterpreter } from './EffectInterpreter.js';
import { FsmConfigError } from './errors/FsmConfigError.js';

interface InterpreterHistoryCreateOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'capacity': number;
  readonly 'handlers'?: EffectHandlerMapType<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect> | undefined;
  readonly 'machineId'?: string | undefined;
}

interface InterpreterHistoryConstructorOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'capacity': number;
  readonly 'handlers'?: EffectHandlerMapType<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect>;
  readonly 'machineId'?: string | undefined;
}

/**
 * A bounded recorder of an EffectInterpreter's own transition events.
 *
 * Overrides `onTransition` to push a `{ event, from, to, timestamp }` record
 * into an internal `CircularBuffer`, so a caller can inspect "what happened"
 * without wiring a bespoke accumulator. Behaves as a strict superset of
 * `EffectInterpreter` — start/send/stop work identically to the base class.
 */
export class InterpreterHistory<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> extends EffectInterpreter<TState, TEvent, TEffect> {
  static override create<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string } = never
  >(options: InterpreterHistoryCreateOptionsInterface<S, E, Ef>): InterpreterHistory<S, E, Ef> {
    if (options.machine === undefined) {
      throw new FsmConfigError('machine is required');
    }
    if (options.machineId !== undefined && options.machineId === '') {
      throw new FsmConfigError('machineId must not be empty');
    }
    if (!Number.isInteger(options.capacity) || options.capacity <= 0) {
      throw new FsmConfigError('capacity must be a positive integer');
    }
    return new InterpreterHistory<S, E, Ef>({
      'capacity': options.capacity,
      'handlers': options.handlers,
      'machine': options.machine,
      'machineId': options.machineId
    });
  }

  readonly #records: CircularBuffer<InterpreterHistoryRecordType<TState, TEvent>>;

  protected constructor(options: InterpreterHistoryConstructorOptionsInterface<TState, TEvent, TEffect>) {
    super(options);
    this.#records = CircularBuffer.create<InterpreterHistoryRecordType<TState, TEvent>>({ 'capacity': options.capacity });
  }

  /**
   * Snapshot of recorded transitions, oldest first. Bounded to the configured
   * capacity — once full, the oldest record is dropped as new ones arrive.
   * Mutating the returned array does not affect the internal buffer.
   */
  history(): readonly InterpreterHistoryRecordType<TState, TEvent>[] {
    const length = this.#records.length;
    const records: InterpreterHistoryRecordType<TState, TEvent>[] = [];
    for (let i = 0; i < length; i++) {
      const record = this.#records.shift();
      if (record !== undefined) {
        records.push(record);
        this.#records.push(record);
      }
    }
    return records;
  }

  protected override onTransition(from: TState, to: TState, event: TEvent): void {
    super.onTransition(from, to, event);
    this.#records.push({ 'event': event, 'from': from, 'timestamp': Date.now(), 'to': to });
  }
}
