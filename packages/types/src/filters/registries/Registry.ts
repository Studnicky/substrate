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

    return super.delete(key);
  }

  /**
   * Find the name/key for a given value (function)
   */
  findKeyByValue(value: T): string | undefined {
    for (const [
      key,
      val
    ] of this.entries()) {
      if (val === value) {
        return key;
      }
    }

    return undefined;
  }

  /**
   * Check if an item is built-in
   */
  isBuiltIn(key: string): boolean {
    return this.builtIn.has(key);
  }

  private registerFromEnum(enumObject: Record<string, Record<string, T>>): void {
    // Register all items from the enum with dot notation
    for (const [
      category,
      items
    ] of Object.entries(enumObject)) {
      for (const [
        name,
        func
      ] of Object.entries(items)) {
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

    return super.set(key, value);
  }
}
