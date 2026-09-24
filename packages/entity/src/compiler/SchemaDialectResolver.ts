import type { SchemaResourceInterface } from './interfaces/SchemaResourceInterface.js';

/** Walks a resource's `parentBase` chain to find its declared dialect — the nearest ancestor resource's own `$schema`. */
export class SchemaDialectResolver {
  private static readonly MAXIMUM_HOPS = 64;

  /** `undefined` means no resource in the chain declares a `$schema` — callers default that to the current dialect. */
  public static resolve(base: string, resources: ReadonlyMap<string, SchemaResourceInterface>): string | undefined {
    const visited = new Set<string>();
    let currentBase = base;
    for (let hop = 0; hop < SchemaDialectResolver.MAXIMUM_HOPS; hop += 1) {
      const resource = resources.get(currentBase);
      if (resource === undefined || visited.has(currentBase)) { return undefined; }
      if (resource.declaredDialect !== undefined) { return resource.declaredDialect; }
      visited.add(currentBase);
      if (resource.parentBase === currentBase) { return undefined; }
      currentBase = resource.parentBase;
    }
    return undefined;
  }
}
