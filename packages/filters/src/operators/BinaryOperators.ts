/**
 * Binary data operators for Buffer, Uint8Array, ArrayBuffer, DataView comparison
 */

import type { FilterValueEntity } from '../FilterValueEntity.js';

import { FilterOperatorError } from '../errors/FilterOperatorError.js';

export class BinaryOperators {
  private static toBinary(value: FilterValueEntity.Type): Uint8Array | null {
    if (value instanceof Buffer) {
      return new Uint8Array(value);
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    if (value instanceof DataView) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }

    return null;
  }

  private static binaryEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const binaryValue = BinaryOperators.toBinary(value);
    const binaryFilterValue = BinaryOperators.toBinary(filterValue);

    if (binaryValue === null) {
      throw new FilterOperatorError(`BINARY.EQUALS requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`, { 'operator': 'BINARY.EQUALS' });
    }
    if (binaryFilterValue === null) {
      throw new FilterOperatorError(`BINARY.EQUALS requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`, { 'operator': 'BINARY.EQUALS' });
    }

    const result = BinaryOperators.binaryEquals(binaryValue, binaryFilterValue);

    return result;
  }

  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !BinaryOperators.handleEquals(value, filterValue);

    return result;
  }

  static handleLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const binaryValue = BinaryOperators.toBinary(value);

    if (binaryValue === null) {
      throw new FilterOperatorError(`BINARY.LENGTH requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`, { 'operator': 'BINARY.LENGTH' });
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`BINARY.LENGTH requires filter value to be a number, got ${typeof filterValue}`, { 'operator': 'BINARY.LENGTH' });
    }

    const result = binaryValue.length === filterValue;

    return result;
  }

  static handleEmpty(value: FilterValueEntity.Type): boolean {
    const binaryValue = BinaryOperators.toBinary(value);

    if (binaryValue === null) {
      throw new FilterOperatorError(`BINARY.EMPTY requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`, { 'operator': 'BINARY.EMPTY' });
    }

    const result = binaryValue.length === 0;

    return result;
  }

  static handleNotEmpty(value: FilterValueEntity.Type): boolean {
    const result = !BinaryOperators.handleEmpty(value);

    return result;
  }

  static handleContains(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const binaryValue = BinaryOperators.toBinary(value);
    const binaryFilterValue = BinaryOperators.toBinary(filterValue);

    if (binaryValue === null) {
      throw new FilterOperatorError(`BINARY.CONTAINS requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`, { 'operator': 'BINARY.CONTAINS' });
    }
    if (binaryFilterValue === null) {
      throw new FilterOperatorError(`BINARY.CONTAINS requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`, { 'operator': 'BINARY.CONTAINS' });
    }

    if (binaryFilterValue.length === 0) {
      return true; // Empty sequence is contained in any data
    }
    if (binaryFilterValue.length > binaryValue.length) {
      return false; // Longer sequence cannot be contained in shorter data
    }

    // Search for the sequence
    for (let i = 0; i <= binaryValue.length - binaryFilterValue.length; i++) {
      let found = true;

      for (let j = 0; j < binaryFilterValue.length; j++) {
        if (binaryValue[i + j] !== binaryFilterValue[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        return true;
      }
    }

    return false;
  }

  static handleStartsWith(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const binaryValue = BinaryOperators.toBinary(value);
    const binaryFilterValue = BinaryOperators.toBinary(filterValue);

    if (binaryValue === null) {
      throw new FilterOperatorError(`BINARY.STARTS_WITH requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`, { 'operator': 'BINARY.STARTS_WITH' });
    }
    if (binaryFilterValue === null) {
      throw new FilterOperatorError(`BINARY.STARTS_WITH requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`, { 'operator': 'BINARY.STARTS_WITH' });
    }

    if (binaryFilterValue.length > binaryValue.length) {
      return false;
    }

    for (let i = 0; i < binaryFilterValue.length; i++) {
      if (binaryValue[i] !== binaryFilterValue[i]) {
        return false;
      }
    }

    return true;
  }

  static handleEndsWith(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const binaryValue = BinaryOperators.toBinary(value);
    const binaryFilterValue = BinaryOperators.toBinary(filterValue);

    if (binaryValue === null) {
      throw new FilterOperatorError(`BINARY.ENDS_WITH requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`, { 'operator': 'BINARY.ENDS_WITH' });
    }
    if (binaryFilterValue === null) {
      throw new FilterOperatorError(`BINARY.ENDS_WITH requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`, { 'operator': 'BINARY.ENDS_WITH' });
    }

    if (binaryFilterValue.length > binaryValue.length) {
      return false;
    }

    const offset = binaryValue.length - binaryFilterValue.length;

    for (let i = 0; i < binaryFilterValue.length; i++) {
      if (binaryValue[offset + i] !== binaryFilterValue[i]) {
        return false;
      }
    }

    return true;
  }
}
