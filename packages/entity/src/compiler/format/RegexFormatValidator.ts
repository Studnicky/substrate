/** ECMA-262 regular expression syntax validity, per JSON Schema's `regex` format. */
export class RegexFormatValidator {
  public static test(value: string): boolean {
    try {
      const probe = new RegExp(value, 'u');
      const result = probe instanceof RegExp;
      return result;
    } catch {
      return false;
    }
  }
}
