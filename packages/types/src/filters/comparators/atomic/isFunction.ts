import { Guard } from '../../../guards/Guard.js';

export function isFunction(value: unknown): boolean {
  const result = Guard.isFunction(value);
  return result;
}
