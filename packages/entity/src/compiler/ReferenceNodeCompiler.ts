import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileByPointerFunctionInterface } from './interfaces/CompileByPointerFunctionInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { SchemaAnchorIndex } from './SchemaAnchorIndex.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles `$ref` and `$dynamicRef` to memoised closures resolving their target on first validation call. */
export class ReferenceNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    rootSchema: unknown,
    compileByPointer: CompileByPointerFunctionInterface
  ): CompiledNodeInterface | undefined {
    if (plan.reference !== undefined) {
      const reference = plan.reference;
      const staticPointer = ReferenceNodeCompiler.staticTarget(reference, rootSchema);
      const lazyNode = ReferenceNodeCompiler.lazy(() => {
        const node = compileByPointer(staticPointer);
        return node;
      });
      const result = ReferenceNodeCompiler.wrapGuarded(lazyNode);
      return result;
    }
    if (plan.dynamicReference !== undefined) {
      const dynamicReference = plan.dynamicReference;
      const staticPointer = ReferenceNodeCompiler.staticTarget(dynamicReference, rootSchema);
      const fallback = ReferenceNodeCompiler.lazy(() => {
        const node = compileByPointer(staticPointer);
        return node;
      });
      const resolve = (context: ValidationExecutionContextInterface): CompiledNodeInterface => {
        const fromScope = ReferenceNodeCompiler.resolveDynamic(dynamicReference, context);
        const result = fromScope ?? fallback;
        return result;
      };
      const result = ReferenceNodeCompiler.wrapDynamicGuarded(resolve);
      return result;
    }
    return undefined;
  }

  /** `#/a/b` resolves as a pointer; a bare fragment name (`#name`) resolves through the anchor index. */
  private static staticTarget(reference: string, rootSchema: unknown): string {
    if (reference === '#' || reference.startsWith('#/')) { return reference; }
    if (reference.startsWith('#')) {
      const anchorPointer = SchemaAnchorIndex.resolve(rootSchema, reference.slice(1));
      if (anchorPointer !== undefined) { return anchorPointer; }
    }
    return reference;
  }

  /** A named fragment scans the dynamic scope outermost-inward; the bare `'#'` fragment has no named entry to scan and always falls back to the static root. */
  private static resolveDynamic(dynamicReference: string, context: ValidationExecutionContextInterface): CompiledNodeInterface | undefined {
    if (dynamicReference === '#') { return undefined; }
    const scope = context.dynamicScope;
    const anchorName = dynamicReference.startsWith('#') ? dynamicReference.slice(1) : dynamicReference;
    const count = scope.length;
    for (let index = 0; index < count; index += 1) {
      const frame = scope[index]!.anchors.get(anchorName);
      if (frame !== undefined) { return frame; }
    }
    return undefined;
  }

  private static lazy(resolve: () => CompiledNodeInterface): CompiledNodeInterface {
    let resolved: CompiledNodeInterface | undefined;
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      resolved ??= resolve();
      const result = resolved.check(value, context, evaluated);
      return result;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      resolved ??= resolve();
      const result = resolved.collect(value, context, instancePath, schemaPath, evaluated);
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static wrapGuarded(target: CompiledNodeInterface): CompiledNodeInterface {
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!ReferenceNodeCompiler.enterGuard(value, context)) { return false; }
      try {
        const result = target.check(value, context, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, context);
      }
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!ReferenceNodeCompiler.enterGuard(value, context)) {
        const result = [ValidationErrorFactory.build(instancePath, schemaPath, { 'keyword': '$ref' })];
        return result;
      }
      try {
        const result = target.collect(value, context, instancePath, schemaPath, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, context);
      }
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static wrapDynamicGuarded(resolve: (context: ValidationExecutionContextInterface) => CompiledNodeInterface): CompiledNodeInterface {
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!ReferenceNodeCompiler.enterGuard(value, context)) { return false; }
      try {
        const result = resolve(context).check(value, context, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, context);
      }
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!ReferenceNodeCompiler.enterGuard(value, context)) {
        const result = [ValidationErrorFactory.build(instancePath, schemaPath, { 'keyword': '$dynamicRef' })];
        return result;
      }
      try {
        const result = resolve(context).collect(value, context, instancePath, schemaPath, evaluated);
        return result;
      } finally {
        ReferenceNodeCompiler.exitGuard(value, context);
      }
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  /** Only object/array values can carry a real cycle; primitives always enter. */
  private static enterGuard(value: unknown, context: ValidationExecutionContextInterface): boolean {
    if (!Predicates.isObjectLike(value)) { return true; }
    if (context.referenceGuard.has(value)) { return false; }
    context.referenceGuard.add(value);
    return true;
  }

  private static exitGuard(value: unknown, context: ValidationExecutionContextInterface): void {
    if (Predicates.isObjectLike(value)) { context.referenceGuard.delete(value); }
  }
}
