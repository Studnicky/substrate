import { Guard } from '../../../guards/Guard.js';

export function isSymbol(value: unknown): boolean {
  const result = Guard.isSymbol(value);
  return result;
}
