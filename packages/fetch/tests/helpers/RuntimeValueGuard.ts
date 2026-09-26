import { Predicates } from '@studnicky/types/node';

/**
 * Builds a recursive runtime-value checker for the `RuntimeValue`/`RuntimeTag` fixture pattern used
 * across this package's `*.scenarios.json` files: JSON plus tag objects (`{shape: 'infinity'}`) standing
 * in for non-JSON-safe primitives. A tag object structurally collides with a plain nested object in a
 * declarative JSON-schema `oneOf` (both accept `{shape: 'infinity'}`), so this checks tag-first,
 * imperatively, instead of routing through scenario-kit.
 */
export function createRuntimeValueGuard<TTag extends string>(tagShapes: readonly TTag[]): { isRuntimeTag: (value: unknown) => value is { shape: TTag }; isRuntimeValue: (value: unknown) => boolean } {
  function isRuntimeTag(value: unknown): value is { shape: TTag } {
    return Predicates.isObject(value) && typeof value.shape === 'string' && (tagShapes as readonly string[]).includes(value.shape);
  }

  function isRuntimeValue(value: unknown): boolean {
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.every(isRuntimeValue);
    }
    if (isRuntimeTag(value)) {
      return true;
    }
    if (Predicates.isObject(value)) {
      return Object.values(value).every(isRuntimeValue);
    }
    return false;
  }

  return { isRuntimeTag, isRuntimeValue };
}
