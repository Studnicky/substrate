/**
 * Named type-level diagnostic for a failed schema constraint: the constraint
 * name, its expected parameter, the offending value, and the JSON Pointer
 * location — surfaced on hover instead of a bare `never`/TS2322 mismatch.
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

export type ConstraintViolationType<
  TConstraint extends string,
  TExpected,
  TActual,
  TPointer extends string
> = IdentityType<{
  'actual': TActual;
  'constraint': TConstraint;
  'expected': TExpected;
  'kind': 'ConstraintViolation';
  'pointer': TPointer;
}>;
