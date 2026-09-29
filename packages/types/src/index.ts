/**
 * @packageDocumentation
 * Shared runtime type-guard and object helpers for
 * @studnicky/substrate.
 *
 * Guards:
 *   - `Predicates`       — pure-static type-safe accessors, type guards, and JSON Schema predicates
 *   - `JsonObject`       — narrowing guard and trust-boundary writes for plain objects (`JsonObject.is`, `.fromEntries`, `.write`)
 *   - `JsonValue`        — validation and coercion of `unknown` into canonical JSON data
 *   - `RuntimeValue`     — validation of runtime operands that retain native values
 *
 * Errors:
 *   - `BaseError`        — abstract root of the error hierarchy; serializes as RFC 9457 Problem Details
 *   - `ThrownValueProjection` — total, cycle-safe projection of any caught value into RFC 9457 members
 *
 * Objects:
 *   - `Hash`             — FNV-1a structural hashing for arbitrary in-memory values (`Hash.value`)
 *   - `StructuralHash`   — schema hashing with metadata-key stripping (`StructuralHash.of`)
 */

export { BaseError } from './errors/BaseError.js';
export {
  CAUSE_CHAIN_DEPTH_LIMIT,
  CAUSE_DEPTH_SENTINEL
} from './errors/constants/CauseChainConstants.js';
export {
  PROBLEM_TITLE_AGGREGATE_ERROR,
  PROBLEM_TITLE_ERROR,
  PROBLEM_TITLE_THROWN_NULLISH,
  PROBLEM_TITLE_THROWN_OBJECT,
  PROBLEM_TITLE_THROWN_PRIMITIVE,
  PROBLEM_TITLE_THROWN_STRING,
  PROBLEM_TYPE_AGGREGATE_ERROR,
  PROBLEM_TYPE_BASE,
  PROBLEM_TYPE_ERROR,
  PROBLEM_TYPE_THROWN_NULLISH,
  PROBLEM_TYPE_THROWN_OBJECT,
  PROBLEM_TYPE_THROWN_PRIMITIVE,
  PROBLEM_TYPE_THROWN_STRING
} from './errors/constants/ProblemConstants.js';
export { ThrownValueProjection } from './errors/ThrownValueProjection.js';
export { Empty } from './guards/Empty.js';
export { JsonObject } from './guards/JsonObject.js';
export { JsonValue } from './guards/JsonValue.js';
export { RuntimeValue } from './guards/RuntimeValue.js';
export type {
  BaseErrorArgumentsInterface,
  CauseNodeInterface,
  PredicateFunctionInterface,
  ProblemDetailsInterface,
  ThrownValueInterface
} from './interfaces/index.js';
export { Hash } from './objects/Hash.js';
export { StructuralHash } from './objects/StructuralHash.js';
export { TIME_ONLY_PATTERN } from './predicates/constants/TimeOnlyPattern.js';
export { Predicate } from './predicates/Predicate.js';
export { Predicates } from './predicates/Predicates.js';
