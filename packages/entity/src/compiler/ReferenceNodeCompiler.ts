import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { ReferenceTargetResolverFunctionInterface } from './interfaces/ReferenceTargetResolverFunctionInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles `$ref` and `$dynamicRef` to a guarded closure over its resolved (and memoised) target. */
export class ReferenceNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    resolveReference: ReferenceTargetResolverFunctionInterface,
    isDynamicAnchorTarget: (reference: string) => boolean
  ): CompiledNodeInterface | undefined {
    if (plan.reference !== undefined) {
      const target = resolveReference(plan.reference);
      const result = ReferenceNodeCompiler.wrapGuarded(target, new Set<object>());
      return result;
    }
    if (plan.dynamicReference !== undefined) {
      const dynamicReference = plan.dynamicReference;
      const fallback = resolveReference(dynamicReference);
      /** Bookending: a `$dynamicRef` whose own static target has no matching `$dynamicAnchor` behaves exactly like `$ref` — no dynamic scan. */
      if (!isDynamicAnchorTarget(dynamicReference)) {
        const result = ReferenceNodeCompiler.wrapGuarded(fallback, new Set<object>());
        return result;
      }
      const resolve = (context: ValidationExecutionContextInterface): CompiledNodeInterface => {
        const fromScope = ReferenceNodeCompiler.resolveDynamic(dynamicReference, context);
        const result = fromScope ?? fallback;
        return result;
      };
      const result = ReferenceNodeCompiler.wrapDynamicGuarded(resolve, new Set<object>());
      return result;
    }
    return undefined;
  }

  /** A plain-name fragment scans the dynamic scope outermost-inward; a JSON-pointer or empty fragment has no dynamic entry and always falls back to the static target. */
  private static resolveDynamic(dynamicReference: string, context: ValidationExecutionContextInterface): CompiledNodeInterface | undefined {
    const hashIndex = dynamicReference.indexOf('#');
    if (hashIndex === -1) { return undefined; }
    const anchorName = dynamicReference.slice(hashIndex + 1);
    if (anchorName === '' || anchorName.startsWith('/')) { return undefined; }
    const scope = context.dynamicScope;
    const count = scope.length;
    for (let index = 0; index < count; index += 1) {
      const frame = scope[index]!.anchors.get(anchorName);
      if (frame !== undefined) { return frame; }
    }
    return undefined;
  }

  /**
   * `guard` is dedicated to this one `$ref` site (never shared with another reference), so it only
   * trips when THIS site re-enters with the SAME value while already in flight — a genuine cycle —
   * never when an unrelated reference happens to see the same value.
   */
  private static wrapGuarded(target: CompiledNodeInterface, guard: Set<object>): CompiledNodeInterface {
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!ReferenceNodeCompiler.enterGuard(value, guard)) { return false; }
      try {
        const result = target.check(value, context, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, guard);
      }
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!ReferenceNodeCompiler.enterGuard(value, guard)) {
        const result = [ValidationErrorFactory.build(instancePath, schemaPath, { 'keyword': '$ref' })];
        return result;
      }
      try {
        const result = target.collect(value, context, instancePath, schemaPath, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, guard);
      }
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static wrapDynamicGuarded(
    resolve: (context: ValidationExecutionContextInterface) => CompiledNodeInterface, guard: Set<object>
  ): CompiledNodeInterface {
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!ReferenceNodeCompiler.enterGuard(value, guard)) { return false; }
      try {
        const result = resolve(context).check(value, context, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, guard);
      }
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!ReferenceNodeCompiler.enterGuard(value, guard)) {
        const result = [ValidationErrorFactory.build(instancePath, schemaPath, { 'keyword': '$dynamicRef' })];
        return result;
      }
      try {
        const result = resolve(context).collect(value, context, instancePath, schemaPath, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, guard);
      }
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  /** Only object/array values can carry a real cycle; primitives always enter. */
  private static enterGuard(value: unknown, guard: Set<object>): boolean {
    if (!Predicates.isObjectLike(value)) { return true; }
    if (guard.has(value)) { return false; }
    guard.add(value);
    return true;
  }

  private static exitGuard(value: unknown, guard: Set<object>): void {
    if (Predicates.isObjectLike(value)) { guard.delete(value); }
  }
}
