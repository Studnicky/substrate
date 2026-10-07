
import type { ClockProviderInterface} from '#runtime';

import { CircularBuffer, CircularBufferError, Clock, Clone, Predicates, RealTimeClockProvider, RuntimeError, SchemaIntakeError } from '#runtime';

import type { EffectHandlerInterface } from './interfaces/EffectHandlerInterface.js';
import type { InterpreterHistoryCollaboratorsInterface } from './interfaces/InterpreterHistoryCollaboratorsInterface.js';
import type { InterpreterHistoryRecordInterface } from './interfaces/InterpreterHistoryRecordInterface.js';
import type { StateMachine } from './StateMachine.js';

import { EffectInterpreter } from './EffectInterpreter.js';
import { InterpreterHistoryOptionsEntity } from './entities/InterpreterHistoryOptionsEntity.js';
import { FsmConfigError } from './errors/FsmConfigError.js';

interface InterpreterHistoryConstructorOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'capacity': unknown;
  readonly 'clock': ClockProviderInterface;
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
  >(
    machine: StateMachine<S, E, Ef>,
    config: unknown,
    collaborators: InterpreterHistoryCollaboratorsInterface<E, Ef> = {}
  ): InterpreterHistory<S, E, Ef> {
    if (!Predicates.isRecord(config)) {
      throw new FsmConfigError('config must be an object');
    }
    const { capacity, ...rest } = config;

    let options: InterpreterHistoryOptionsEntity.Type;
    try {
      options = InterpreterHistoryOptionsEntity.intake(rest);
    } catch (error) {
      throw new FsmConfigError(error instanceof SchemaIntakeError ? RuntimeError.toMessage(error) : 'InterpreterHistory options intake failed', error);
    }

    return new InterpreterHistory<S, E, Ef>({
      'capacity': capacity,
      'clock': collaborators.clock ?? RealTimeClockProvider.create(),
      'handler': collaborators.handler,
      'machine': machine,
      'machineId': options.machineId
    });
  }

  readonly #records: CircularBuffer<InterpreterHistoryRecordInterface<TState, TEvent>>;
  readonly #clock: Clock;

  protected constructor(options: InterpreterHistoryConstructorOptionsInterface<TState, TEvent, TEffect>) {
    super(options);
    this.#clock = Clock.create(options.clock);
    try {
      this.#records = CircularBuffer.create<InterpreterHistoryRecordInterface<TState, TEvent>>({ 'capacity': options.capacity });
    } catch (error) {
      throw new FsmConfigError(error instanceof CircularBufferError ? 'capacity must be a positive integer' : 'history buffer creation failed', error);
    }
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
    this.#records.push(Clone.deep({ 'event': event, 'from': from, 'timestamp': this.#clock.now(), 'to': to }));
  }
}
