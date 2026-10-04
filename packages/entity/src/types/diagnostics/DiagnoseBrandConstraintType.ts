/**
 * Resolves to `TValue` when it satisfies `TBrand`, otherwise to a named
 * `ConstraintViolationType` instead of a bare structural mismatch. Uniform
 * over every phantom constraint brand — `minLength`, `pattern`, `const`,
 * `enum`, and so on — since each differs only by name, expected param, and
 * carrier brand, never by check shape.
 * @module
 */
import type { ConstraintViolationType } from './ConstraintViolationType.js';

export type DiagnoseBrandConstraintType<
  TConstraint extends string,
  TExpected,
  TBrand,
  TValue,
  TPointer extends string
> = TValue extends TBrand
  ? TValue
  : ConstraintViolationType<TConstraint, TExpected, TValue, TPointer>;
