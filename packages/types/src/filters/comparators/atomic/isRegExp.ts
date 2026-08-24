import { Guard } from '../../../guards/Guard.js';

export function isRegExp(value: unknown): boolean {
  const result = Guard.isRegExp(value);
  return result;
}
