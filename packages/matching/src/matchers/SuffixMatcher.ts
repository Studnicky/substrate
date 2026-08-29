import { LruCache } from '@studnicky/cache';

export class SuffixMatcher {
  private static readonly skipTables = LruCache.create<string, ReadonlyMap<string, number>>({ 'capacity': 256 });

  static matches(pattern: string, value: string): boolean {
    const suffix = pattern.startsWith('**.') ? pattern.slice(3) : pattern;
    if (suffix.length === 0 || suffix.length > value.length) {
      return false;
    }

    const skipTable = SuffixMatcher.buildSkipTable(suffix);
    let valueIndex = suffix.length - 1;
    while (valueIndex < value.length) {
      let patternIndex = suffix.length - 1;
      let comparisonIndex = valueIndex;
      while (patternIndex >= 0 && value[comparisonIndex] === suffix[patternIndex]) {
        patternIndex -= 1;
        comparisonIndex -= 1;
      }
      if (patternIndex < 0) {
        const result = valueIndex === value.length - 1;
        return result;
      }
      const mismatched = value[valueIndex] ?? '';
      valueIndex += skipTable.get(mismatched) ?? suffix.length;
    }
    return false;
  }

  private static buildSkipTable(pattern: string): ReadonlyMap<string, number> {
    const cached = SuffixMatcher.skipTables.get(pattern);
    if (cached !== undefined) {
      return cached;
    }
    const table = new Map<string, number>();
    for (let index = 0; index < pattern.length - 1; index += 1) {
      const character = pattern[index];
      if (character !== undefined) {
        table.set(character, pattern.length - index - 1);
      }
    }
    SuffixMatcher.skipTables.set(pattern, table);
    return table;
  }
}
