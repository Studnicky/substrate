import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';

import { Clone } from '@studnicky/json/browser';

import type { JsonStateCodecOptionsInterface } from './interfaces/JsonStateCodecOptionsInterface.js';
import type { StateCodecInterface } from './interfaces/StateCodecInterface.js';

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
    const parsed: unknown = JSON.parse(serialized);

    const result = Clone.deep(this.#decodeValue(parsed));

    return result;
  }

  public encode(state: TState): string {
    const detached = Clone.deep(state);
    const normalized = this.#entityIntake === undefined ? detached : this.#entityIntake(detached);
    const result = JSON.stringify(normalized);

    if (typeof result !== 'string') {
      throw new TypeError('JSON state serialization must produce a string');
    }

    return result;
  }
}
