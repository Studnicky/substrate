import type { JsonStateCodecOptionsInterface } from './interfaces/JsonStateCodecOptionsInterface.js';
import type { StateCodecInterface } from './interfaces/StateCodecInterface.js';

export class JsonStateCodec<TState> implements StateCodecInterface<TState> {
  readonly #decodeValue: (value: unknown) => TState;

  readonly #encodeValue: (state: TState) => string = JSON.stringify;

  public static create<TState>(options: JsonStateCodecOptionsInterface<TState>): JsonStateCodec<TState> {
    const result = new JsonStateCodec(options);

    return result;
  }

  protected constructor(options: JsonStateCodecOptionsInterface<TState>) {
    this.#decodeValue = options.decode;
  }

  public decode(serialized: string): TState {
    const parsed: unknown = JSON.parse(serialized);

    const result = this.#decodeValue(parsed);

    return result;
  }

  public encode(state: TState): string {
    const result = this.#encodeValue(state);

    return result;
  }
}
