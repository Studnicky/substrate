import type { JsonValueEntity } from '@studnicky/json/entities';

import { RuntimeError } from '@studnicky/errors/node';
import { JsonObject } from '@studnicky/types/node';

import { ScenarioValues } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { PlatformCalls } from './PlatformCalls.js';
import { StaticRequestIdGenerator } from './StaticRequestIdGenerator.js';

interface CircularTagInterface {
  'name': string;
  'self'?: unknown;
}

interface TagResultInterface {
  readonly 'found': boolean;
  readonly 'value': unknown;
}

/**
 * Turns a JSON fixture value into the runtime value a test feeds the library.
 * A tag object (`{ "shape": "infinity" }`) stands in for a value JSON cannot carry — `undefined`,
 * `NaN`, the infinities, an `AbortSignal`, a `bigint`, a `Buffer`, a cyclic object — and materializes
 * to that value; every other object and array is rebuilt with its members materialized.
 */
export class RuntimeValueMaterializer {
  static materialize(value: JsonValueEntity.Type): unknown {
    const materialized = RuntimeValueMaterializer.#materializeNode(value, undefined);
    return materialized;
  }

  /** Materializes `value`, replacing the `__TEST_URL__` and `__TEST_SERVER_URL__` placeholders in every string with `serverUrl`. */
  static materializeWithServer(value: JsonValueEntity.Type, serverUrl: string): unknown {
    const materialized = RuntimeValueMaterializer.#materializeNode(value, serverUrl);
    return materialized;
  }

  static #materializeArray(value: JsonValueEntity.Type[], serverUrl: string | undefined): unknown[] {
    const items: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      items.push(RuntimeValueMaterializer.#materializeNode(value[index] ?? null, serverUrl));
    }
    return items;
  }

  static #materializeBufferTag(shape: unknown, value: object): TagResultInterface {
    if (shape === 'buffer') {
      return { 'found': true, 'value': Buffer.from(ScenarioValues.requireString(Reflect.get(value, 'text'), 'buffer text'), 'utf8') };
    }
    if (shape === 'array-buffer') {
      return { 'found': true, 'value': new TextEncoder().encode(ScenarioValues.requireString(Reflect.get(value, 'text'), 'array-buffer text')).buffer };
    }
    if (shape === 'uint8-array') {
      return { 'found': true, 'value': new TextEncoder().encode(ScenarioValues.requireString(Reflect.get(value, 'text'), 'uint8-array text')) };
    }
    if (shape === 'filled-buffer') {
      return { 'found': true, 'value': Buffer.alloc(ScenarioValues.requireInteger(Reflect.get(value, 'length'), 'filled-buffer length'), ScenarioValues.requireString(Reflect.get(value, 'fill'), 'filled-buffer fill')) };
    }
    return { 'found': false, 'value': undefined };
  }

  static #materializeNode(value: JsonValueEntity.Type, serverUrl: string | undefined): unknown {
    if (typeof value === 'string' && typeof serverUrl === 'string') {
      const resolvedText = value.replaceAll('__TEST_URL__', serverUrl).replaceAll('__TEST_SERVER_URL__', serverUrl);
      return resolvedText;
    }
    if (Array.isArray(value)) {
      const items = RuntimeValueMaterializer.#materializeArray(value, serverUrl);
      return items;
    }
    if (typeof value === 'object' && value !== null) {
      const tagged = RuntimeValueMaterializer.#materializeTag(value);
      const materialized = tagged.found ? tagged.value : RuntimeValueMaterializer.#materializeObject(value, serverUrl);
      return materialized;
    }
    return value;
  }

  static #materializeObject(value: object, serverUrl: string | undefined): unknown {
    const entries = new Map<string, unknown>();
    const pairs = Object.entries(value);
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index] ?? ['', null];
      entries.set(pair[0], RuntimeValueMaterializer.#materializeNode(pair[1], serverUrl));
    }
    const materialized = JsonObject.fromEntries(entries);
    return materialized;
  }

  static #materializeObjectTag(shape: unknown, value: object): TagResultInterface {
    if (shape === 'circular') {
      const circular: CircularTagInterface = { 'name': ScenarioValues.requireString(Reflect.get(value, 'name'), 'circular name') };
      circular.self = circular;
      return { 'found': true, 'value': circular };
    }
    if (shape === 'symbol-properties') {
      const name = ScenarioValues.requireString(Reflect.get(value, 'name'), 'symbol-properties name');
      const withSymbol = { 'name': name };
      JsonObject.write(withSymbol, Symbol(name), 'symbol value');
      return { 'found': true, 'value': withSymbol };
    }
    if (shape === 'function-properties') {
      const withFunction = {
        'data': ScenarioValues.requireString(Reflect.get(value, 'data'), 'function-properties data'),
        'method': (): string => {
          const name = 'function';
          return name;
        }
      };
      return { 'found': true, 'value': withFunction };
    }
    if (shape === 'static-request-id') {
      const staticValue: unknown = Reflect.get(value, 'value');
      return { 'found': true, 'value': new StaticRequestIdGenerator(staticValue).generate };
    }
    if (shape === 'throwing-request-id') {
      const message = ScenarioValues.requireString(Reflect.get(value, 'message'), 'throwing-request-id message');
      const generator = (): never => {
        throw RuntimeError.create(message);
      };
      return { 'found': true, 'value': generator };
    }
    const buffered = RuntimeValueMaterializer.#materializeBufferTag(shape, value);
    return buffered;
  }

  static #materializeTag(value: object): TagResultInterface {
    const shape: unknown = Reflect.get(value, 'shape');
    if (shape === 'undefined') {
      return { 'found': true, 'value': undefined };
    }
    if (shape === 'infinity') {
      return { 'found': true, 'value': Number.POSITIVE_INFINITY };
    }
    if (shape === 'negative-infinity') {
      return { 'found': true, 'value': Number.NEGATIVE_INFINITY };
    }
    if (shape === 'nan') {
      return { 'found': true, 'value': Number.NaN };
    }
    if (shape === 'abort-signal') {
      return { 'found': true, 'value': new AbortController().signal };
    }
    if (shape === 'bigint') {
      return { 'found': true, 'value': PlatformCalls.toBigInt(ScenarioValues.requireString(Reflect.get(value, 'value'), 'bigint value')) };
    }
    if (shape === 'date') {
      return { 'found': true, 'value': new Date(ScenarioValues.requireString(Reflect.get(value, 'iso'), 'date iso')) };
    }
    const objectTag = RuntimeValueMaterializer.#materializeObjectTag(shape, value);
    return objectTag;
  }
}
