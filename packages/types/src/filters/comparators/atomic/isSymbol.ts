import { Guard } from '../../../guards/Guard.js';

export class IsSymbol {
  static isSymbol(value: unknown): value is symbol   {
    const result = Guard.isSymbol(value);
    return result;
  }
}
