export class ExactMatcher {
  static matches(pattern: string, value: string): boolean {
    const result = pattern === value;
    return result;
  }
}
