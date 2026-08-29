import { Predicates } from '@studnicky/types';

export class ImportSourceValue {
  public static get(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) { return undefined; }

    const source: unknown = node.source;
    if (!Predicates.isRecord(source)) { return undefined; }

    const value: unknown = source.value;
    const result = typeof value === 'string' ? value : undefined;
    return result;
  }
}
