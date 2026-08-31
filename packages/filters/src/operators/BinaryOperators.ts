/**
 * Binary data operators for Uint8Array, ArrayBuffer, and DataView comparison
 */

import type { FilterValueEntity } from '../FilterValueEntity.js';

import { FilterOperatorError } from '../errors/FilterOperatorError.js';

export class BinaryOperators {
  static toBinary(value: FilterValueEntity.Type): Uint8Array | null {
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

  static binaryEquals(first: Uint8Array, second: Uint8Array): boolean {
    const firstLength = first.length;

    if (firstLength !== second.length) {
      return false;
    }

    for (let index = 0; index < firstLength; index += 1) {
      if (first[index] !== second[index]) {
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
      // Empty sequence is contained in any data.
      return true;
    }
    if (binaryFilterValue.length > binaryValue.length) {
      // Longer sequences cannot be contained in shorter data.
      return false;
    }

    const binaryFilterValueLength = binaryFilterValue.length;
    const lastStartIndex = binaryValue.length - binaryFilterValueLength;

    for (let startIndex = 0; startIndex <= lastStartIndex; startIndex += 1) {
      let found = true;

      for (let filterIndex = 0; filterIndex < binaryFilterValueLength; filterIndex += 1) {
        if (binaryValue[startIndex + filterIndex] !== binaryFilterValue[filterIndex]) {
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

    const binaryFilterValueLength = binaryFilterValue.length;

    for (let index = 0; index < binaryFilterValueLength; index += 1) {
      if (binaryValue[index] !== binaryFilterValue[index]) {
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

    const binaryFilterValueLength = binaryFilterValue.length;

    for (let index = 0; index < binaryFilterValueLength; index += 1) {
      if (binaryValue[offset + index] !== binaryFilterValue[index]) {
        return false;
      }
    }

    return true;
  }
}
