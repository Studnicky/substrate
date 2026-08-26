/**
 * Registry class that extends Map with built-in protection
 */

export class Registry<T> extends Map<string, T> {
  private readonly builtIn: Set<string>;
  private readonly name: string;

  constructor(name: string, enumObject: Record<string, Record<string, T>>) {
    super();
    this.name = name;
    this.builtIn = new Set();
    this.registerFromEnum(enumObject);
  }

  /**
   * Delete a custom item (override Map's delete to protect built-ins)
   */
  override delete(key: string): boolean {
    if (this.builtIn.has(key)) {
      throw new Error(`Cannot remove built-in ${this.name}: ${key}`);
    }

    const result = super.delete(key);

    return result;
  }

  /**
   * Find the name/key for a given value (function)
   */
  findKeyByValue(value: T): string | undefined {
    for (const [
      key,
      candidate
    ] of this.entries()) {
      if (candidate === value) {
        return key;
      }
    }

    return undefined;
  }

  /**
   * Check if an item is built-in
   */
  isBuiltIn(key: string): boolean {
    const result = this.builtIn.has(key);

    return result;
  }

  private registerFromEnum(enumObject: Record<string, Record<string, T>>): void {
    // Register all items from the enum with dot notation
    const categoryEntries = Object.entries(enumObject);
    const categoryEntriesLength = categoryEntries.length;

    for (let categoryIndex = 0; categoryIndex < categoryEntriesLength; categoryIndex += 1) {
      const categoryEntry = categoryEntries[categoryIndex];

      if (categoryEntry === undefined) {
        continue;
      }
      const [category, items] = categoryEntry;
      const itemEntries = Object.entries(items);
      const itemEntriesLength = itemEntries.length;

      for (let itemIndex = 0; itemIndex < itemEntriesLength; itemIndex += 1) {
        const itemEntry = itemEntries[itemIndex];

        if (itemEntry === undefined) {
          continue;
        }
        const [name, func] = itemEntry;
        const key = `${category}.${name}`;

        super.set(key, func);
        this.builtIn.add(key);
      }
    }
  }

  /**
   * Set a custom item (override Map's set to protect built-ins)
   */
  override set(key: string, value: T): this {
    if (this.builtIn.has(key)) {
      throw new Error(`Cannot override built-in ${this.name}: ${key}`);
    }

    super.set(key, value);

    return this;
  }
}
