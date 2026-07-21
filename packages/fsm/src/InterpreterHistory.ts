import { CircularBuffer, type CircularBufferOptionsEntity } from '@studnicky/circular-buffer';
import { Clone } from '@studnicky/json';

import type { EffectHandlerInterface } from './EffectHandlerInterface.js';
import type { InterpreterHistoryRecordInterface } from './InterpreterHistoryRecordInterface.js';
import type { StateMachine } from './StateMachine.js';

import { EffectInterpreter } from './EffectInterpreter.js';
import { FsmConfigError } from './errors/FsmConfigError.js';

interface InterpreterHistoryCreateOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'capacity': NonNullable<CircularBufferOptionsEntity.Type['capacity']>;
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect> | undefined;
  readonly 'machineId'?: string | undefined;
}

interface InterpreterHistoryConstructorOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'capacity': NonNullable<CircularBufferOptionsEntity.Type['capacity']>;
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;
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
      'handler': options.handler,
      'machine': options.machine,
      'machineId': options.machineId
    });
  }

  readonly #records: CircularBuffer<InterpreterHistoryRecordInterface<TState, TEvent>>;

  protected constructor(options: InterpreterHistoryConstructorOptionsInterface<TState, TEvent, TEffect>) {
    super(options);
    this.#records = CircularBuffer.create<InterpreterHistoryRecordInterface<TState, TEvent>>({ 'capacity': options.capacity });
  }

  /**
   * Snapshot of recorded transitions, oldest first. Bounded to the configured
   * capacity — once full, the oldest record is dropped as new ones arrive.
   * The returned array is readonly and isolated from later transitions.
   */
  history(): readonly InterpreterHistoryRecordInterface<TState, TEvent>[] {
    const length = this.#records.length;
    const records: InterpreterHistoryRecordInterface<TState, TEvent>[] = [];
    for (let i = 0; i < length; i++) {
      const record = this.#records.shift();
      if (record !== undefined) {
        records.push(Clone.deep(record));
        this.#records.push(record);
      }
    }
    return records;
  }

  protected override onTransition(from: TState, to: TState, event: TEvent): void {
    super.onTransition(from, to, event);
    this.#records.push(Clone.deep({ 'event': event, 'from': from, 'timestamp': Date.now(), 'to': to }));
  }
}
