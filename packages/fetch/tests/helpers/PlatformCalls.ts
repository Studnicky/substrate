import { FetchTestError } from './FetchTestError.js';

/** Platform calls that throw native errors, wrapped so a failure surfaces as a named `FetchTestError` carrying the original as `cause`. */
export class PlatformCalls {
  static decodeText(bytes: ArrayBuffer | Uint8Array): string {
    try {
      const decoded = new TextDecoder().decode(bytes);
      return decoded;
    } catch (error) {
      throw new FetchTestError('cannot decode the bytes as text', error);
    }
  }

  static encodeComponent(text: string): string {
    let encoded = '';
    try {
      encoded = encodeURIComponent(text);
    } catch (error) {
      throw new FetchTestError(`cannot URI-encode ${text}`, error);
    }
    return encoded;
  }

  static toBigInt(text: string): bigint {
    try {
      const value = BigInt(text);
      return value;
    } catch (error) {
      throw new FetchTestError(`cannot convert ${text} to a bigint`, error);
    }
  }

  static parseUrl(text: string): URL {
    try {
      const parsed = new URL(text);
      return parsed;
    } catch (error) {
      throw new FetchTestError(`cannot parse ${text} as a URL`, error);
    }
  }

  static stringify(value: unknown): string {
    let serialized = '';
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new FetchTestError('cannot serialize the value to JSON', error);
    }
    return serialized;
  }
}
