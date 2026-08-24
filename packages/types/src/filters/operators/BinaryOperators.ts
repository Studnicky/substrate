/**
 * Binary data operators for Buffer, Uint8Array, ArrayBuffer, DataView comparison
 */

import type {
  FilterCondition, FilterValue, OperatorFunction
} from '../types.js';

// Helper function to convert binary data to comparable format
const toBinary = (value: FilterValue): Uint8Array | null => {
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
};

// Helper function for binary equality comparison
const binaryEquals = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};

// BINARY.EQUALS - Compare binary data content
const binaryEqualsOperator: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  const binaryValue = toBinary(value);
  const binaryFilterValue = toBinary(filterValue);

  if (binaryValue === null) {
    throw new Error(`BINARY.EQUALS requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`);
  }
  if (binaryFilterValue === null) {
    throw new Error(`BINARY.EQUALS requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`);
  }

  return binaryEquals(binaryValue, binaryFilterValue);
};

// BINARY.NOT_EQUALS - Compare binary data content (not equal)
const binaryNotEquals: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  return !binaryEqualsOperator(value, filterValue);
};

// BINARY.LENGTH - Check binary data length
const binaryLength: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  const binaryValue = toBinary(value);

  if (binaryValue === null) {
    throw new Error(`BINARY.LENGTH requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`);
  }
  if (typeof filterValue !== 'number') {
    throw new Error(`BINARY.LENGTH requires filter value to be a number, got ${typeof filterValue}`);
  }

  return binaryValue.length === filterValue;
};

// BINARY.EMPTY - Check if binary data is empty
const binaryEmpty: OperatorFunction = (value: FilterValue): boolean => {
  const binaryValue = toBinary(value);

  if (binaryValue === null) {
    throw new Error(`BINARY.EMPTY requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`);
  }

  return binaryValue.length === 0;
};

// BINARY.NOT_EMPTY - Check if binary data is not empty
const binaryNotEmpty: OperatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition): boolean => {
  return !binaryEmpty(value, filterValue, condition);
};

// BINARY.CONTAINS - Check if binary data contains a sequence
const binaryContains: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  const binaryValue = toBinary(value);
  const binaryFilterValue = toBinary(filterValue);

  if (binaryValue === null) {
    throw new Error(`BINARY.CONTAINS requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`);
  }
  if (binaryFilterValue === null) {
    throw new Error(`BINARY.CONTAINS requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`);
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
};

// BINARY.STARTS_WITH - Check if binary data starts with a sequence
const binaryStartsWith: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  const binaryValue = toBinary(value);
  const binaryFilterValue = toBinary(filterValue);

  if (binaryValue === null) {
    throw new Error(`BINARY.STARTS_WITH requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`);
  }
  if (binaryFilterValue === null) {
    throw new Error(`BINARY.STARTS_WITH requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`);
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
};

// BINARY.ENDS_WITH - Check if binary data ends with a sequence
const binaryEndsWith: OperatorFunction = (value: FilterValue, filterValue: FilterValue): boolean => {
  const binaryValue = toBinary(value);
  const binaryFilterValue = toBinary(filterValue);

  if (binaryValue === null) {
    throw new Error(`BINARY.ENDS_WITH requires value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof value}`);
  }
  if (binaryFilterValue === null) {
    throw new Error(`BINARY.ENDS_WITH requires filter value to be binary data (Buffer, Uint8Array, ArrayBuffer, DataView), got ${typeof filterValue}`);
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
};

export {
  binaryContains,
  binaryEmpty,
  binaryEndsWith,
  binaryEqualsOperator as binaryEquals,
  binaryLength,
  binaryNotEmpty,
  binaryNotEquals,
  binaryStartsWith
};
