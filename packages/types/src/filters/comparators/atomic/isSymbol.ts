import { Guard } from '../../../guards/Guard.js';

export class IsSymbol {
  static isSymbol(value: unknown): boolean   {
    const result = Guard.isSymbol(value);
    return result;
  }
}
