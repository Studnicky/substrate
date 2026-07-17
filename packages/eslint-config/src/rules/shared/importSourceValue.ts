import { ObjectGuard } from './ObjectGuard.js';

export class ImportSourceValue {
  public static get(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }

    const source: unknown = node.source;
    if (!ObjectGuard.isObject(source)) { return undefined; }

    const value: unknown = source.value;
    return typeof value === 'string' ? value : undefined;
  }
}
