/**
 * Fluent builder for ProcessKit instances
 */

import type { EffectHandlerMapType, StateMachine } from '@studnicky/fsm';
import type { SchedulerProviderType } from '@studnicky/scheduler';
import type { Signal } from '@studnicky/signal';

import type { ProcessKit } from './ProcessKit.js';
import type { ProcessKitConfigType } from './types/ProcessKitConfigType.js';

/**
 * Builder for creating ProcessKit instances with a fluent API.
 *
 * @example
 * ```typescript
 * const kit = ProcessKit.builder<JobState, JobEvent, JobEffect>()
 *   .machine(new JobProcess())
 *   .handlers({ requestAck: (_effect, dispatch) => dispatch({ type: 'acknowledge' }) })
 *   .build();
 * ```
 */
export class ProcessKitBuilder<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  static create<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string } = never
  >(create: (config: ProcessKitConfigType<S, E, Ef>) => ProcessKit<S, E, Ef>): ProcessKitBuilder<S, E, Ef> {
    return new ProcessKitBuilder(create);
  }

  readonly #create: (config: ProcessKitConfigType<TState, TEvent, TEffect>) => ProcessKit<TState, TEvent, TEffect>;
  #handlers?: EffectHandlerMapType<TEffect, TEvent>;
  #machine?: StateMachine<TState, TEvent, TEffect>;
  #scheduler?: SchedulerProviderType;
  #signal?: Signal;

  private constructor(create: (config: ProcessKitConfigType<TState, TEvent, TEffect>) => ProcessKit<TState, TEvent, TEffect>) {
    this.#create = create;
  }

  /**
   * Build and return the ProcessKit instance. `machine` must have been set.
   */
  build(): ProcessKit<TState, TEvent, TEffect> {
    if (this.#machine === undefined) {
      throw new Error('ProcessKitBuilder: machine is required');
    }

    const config: ProcessKitConfigType<TState, TEvent, TEffect> = {
      'machine': this.#machine,
      ...(this.#handlers !== undefined ? { 'handlers': this.#handlers } : {}),
      ...(this.#scheduler !== undefined ? { 'scheduler': this.#scheduler } : {}),
      ...(this.#signal !== undefined ? { 'signal': this.#signal } : {})
    };
    return this.#create(config);
  }

  /**
   * Set the effect handler map passed to the composed EffectInterpreter
   */
  handlers(value: EffectHandlerMapType<TEffect, TEvent>): this {
    this.#handlers = value;
    return this;
  }

  /**
   * Set the caller-supplied StateMachine subclass. Required before build().
   */
  machine(value: StateMachine<TState, TEvent, TEffect>): this {
    this.#machine = value;
    return this;
  }

  /**
   * Set the composed SchedulerProviderType
   */
  scheduler(value: SchedulerProviderType): this {
    this.#scheduler = value;
    return this;
  }

  /**
   * Set the composed Signal instance
   */
  signal(value: Signal): this {
    this.#signal = value;
    return this;
  }
}
