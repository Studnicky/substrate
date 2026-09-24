import { Predicates } from '@studnicky/types/browser';

/** Resolves and renders JSON Pointers (RFC 6901) against a schema document. */
export class SchemaPointer {
  /** Resolves a `#/a/b` pointer, or bare `#`, against `rootSchema`. */
  public static resolve(pointer: string, rootSchema: unknown): unknown {
    if (pointer === '#') {
      return rootSchema;
    }
    if (!pointer.startsWith('#/')) {
      return undefined;
    }
    const segments = pointer.slice(2).split('/');
    let target: unknown = rootSchema;
    const count = segments.length;
    for (let index = 0; index < count; index += 1) {
      const segment = segments[index]!.replaceAll('~1', '/').replaceAll('~0', '~');
      if (!Predicates.isRecord(target)) {
        return undefined;
      }
      target = Reflect.get(target, segment);
    }
    return target;
  }

  /** Appends one path segment to a JSON Pointer, escaping `~` and `/`. */
  public static append(pointer: string, segment: string): string {
    const escaped = segment.replaceAll('~', '~0').replaceAll('/', '~1');
    return `${pointer}/${escaped}`;
  }

}
