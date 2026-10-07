import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';

import { Clone } from '#runtime';

import type { JsonStateCodecOptionsInterface } from './interfaces/JsonStateCodecOptionsInterface.js';
import type { StateCodecInterface } from './interfaces/StateCodecInterface.js';

import { StateDecodeError } from './errors/StateDecodeError.js';
import { StateEncodeError } from './errors/StateEncodeError.js';

export class JsonStateCodec<TState> implements StateCodecInterface<TState> {
  readonly #decodeValue: (value: unknown) => TState;

  readonly #entityIntake: EntityIntakeFunctionInterface<TState> | undefined;

  public static create<TState>(options: JsonStateCodecOptionsInterface<TState>): JsonStateCodec<TState> {
    const result = new JsonStateCodec(options);

    return result;
  }

  public static fromEntity<TState>(intake: EntityIntakeFunctionInterface<TState>): JsonStateCodec<TState> {
    const result = new JsonStateCodec({ 'decode': intake }, intake);

    return result;
  }

  protected constructor(
    options: JsonStateCodecOptionsInterface<TState>,
    entityIntake: EntityIntakeFunctionInterface<TState> | undefined = undefined
  ) {
    this.#decodeValue = options.decode;
    this.#entityIntake = entityIntake;
  }

  public decode(serialized: string): TState {
    const parsed = JsonStateCodec.#parse(serialized);

    const result = Clone.deep(this.#decodeValue(parsed));

    return result;
  }

  public encode(state: TState): string {
    const detached = Clone.deep(state);
    const normalized = this.#entityIntake === undefined ? detached : this.#entityIntake(detached);
    const result = JsonStateCodec.#stringify(normalized);

    return result;
  }

  static #parse(serialized: string): unknown {
    try {
      const result: unknown = JSON.parse(serialized);

      return result;
    } catch (cause) {
      throw new StateDecodeError(cause);
    }
  }

  static #stringify(value: unknown): string {
    let serialized: string | undefined;

    try {
      serialized = JSON.stringify(value);
    } catch (cause) {
      throw new StateEncodeError('JSON state serialization failed', cause);
    }

    if (typeof serialized === 'string') {
      return serialized;
    }

    throw new StateEncodeError('JSON state serialization must produce a string');
  }
}
