import { SchemaPatternError } from './SchemaPatternError.js';

/** Compiles schema-supplied patterns, surfacing an invalid pattern as a named error. */
export class SchemaPattern {
  public static compile(pattern: string): RegExp {
    try {
      const result = new RegExp(pattern, 'u');
      return result;
    } catch (error: unknown) {
      throw new SchemaPatternError(`Invalid schema pattern: ${pattern}`, error);
    }
  }
}
