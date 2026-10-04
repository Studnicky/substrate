import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface, ValidationExecutionContextInterface } from './interfaces/CompilerExecutionStateInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { ResidualCheckerFunctionInterface } from './interfaces/ResidualCheckerFunctionInterface.js';
import type { ResidualCollectorFunctionInterface } from './interfaces/ResidualCollectorFunctionInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

import { EvaluatedTracker } from './EvaluatedTracker.js';
import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/**
 * Wraps a node's every-other-keyword closure with `unevaluatedProperties`/`unevaluatedItems`.
 * Runs the prior closure into a fresh tracker so every composition branch's annotations —
 * winning or not — count toward the residual, then asserts the schema against what's left over.
 */
export class UnevaluatedNodeCompiler {
  public static wrap(
    plan: SchemaNodePlanInterface,
    priorNode: CompiledNodeInterface,
    compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface {
    if (plan.unevaluatedProperties === undefined && plan.unevaluatedItems === undefined) {
      return priorNode;
    }
    const unevaluatedItemsNode = plan.unevaluatedItems === undefined ? undefined : compileChild(plan.unevaluatedItems, 'unevaluatedItems');
    const unevaluatedPropertiesNode = plan.unevaluatedProperties === undefined
      ? undefined : compileChild(plan.unevaluatedProperties, 'unevaluatedProperties');

    const checkResidualProperties = UnevaluatedNodeCompiler.makePropertyResidualChecker(unevaluatedPropertiesNode);
    const checkResidualItems = UnevaluatedNodeCompiler.makeItemResidualChecker(unevaluatedItemsNode);
    const collectResidualProperties = UnevaluatedNodeCompiler.makePropertyResidualCollector(unevaluatedPropertiesNode);
    const collectResidualItems = UnevaluatedNodeCompiler.makeItemResidualCollector(unevaluatedItemsNode);

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const own = EvaluatedTracker.create();
      if (!priorNode.check(value, context, own)) { return false; }
      if (!checkResidualProperties(value, context, own)) { return false; }
      if (!checkResidualItems(value, context, own)) { return false; }
      if (evaluated !== undefined) { EvaluatedTracker.mergeInto(evaluated, own); }
      return true;
    };

    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const own = EvaluatedTracker.create();
      const errors = priorNode.collect(value, context, instancePath, schemaPath, own);
      errors.push(...collectResidualProperties(value, context, instancePath, schemaPath, own));
      errors.push(...collectResidualItems(value, context, instancePath, schemaPath, own));
      if (evaluated !== undefined) { EvaluatedTracker.mergeInto(evaluated, own); }
      return errors;
    };

    const result = { 'check': check, 'collect': collect };
    return result;
  }

  /** Builds a closure over `node` so the returned checker's own arity stays within the parameter budget. */
  private static makePropertyResidualChecker(node: CompiledNodeInterface | undefined): ResidualCheckerFunctionInterface {
    return (value, context, own) => {
      if (node === undefined || !Predicates.isRecord(value)) { return true; }
      const keys = Object.keys(value);
      const count = keys.length;
      for (let index = 0; index < count; index += 1) {
        const key = keys[index]!;
        if (own.properties.has(key)) { continue; }
        if (!node.check(Reflect.get(value, key), context)) { return false; }
        own.properties.add(key);
      }
      return true;
    };
  }

  private static makeItemResidualChecker(node: CompiledNodeInterface | undefined): ResidualCheckerFunctionInterface {
    return (value, context, own) => {
      if (node === undefined || !Predicates.isArray(value)) { return true; }
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        if (own.items.has(index)) { continue; }
        if (!node.check(value[index], context)) { return false; }
        own.items.add(index);
      }
      return true;
    };
  }

  private static makePropertyResidualCollector(node: CompiledNodeInterface | undefined): ResidualCollectorFunctionInterface {
    return (value, context, instancePath, schemaPath, own) => {
      const errors: EntityValidationErrorInterface[] = [];
      if (node === undefined || !Predicates.isRecord(value)) { return errors; }
      const keys = Object.keys(value);
      const count = keys.length;
      for (let index = 0; index < count; index += 1) {
        const key = keys[index]!;
        if (own.properties.has(key)) { continue; }
        const propertyValue = Reflect.get(value, key);
        const escapedKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
        const propertyErrors = node.collect(
          propertyValue, context, `${instancePath}/${escapedKey}`, SchemaPointer.append(schemaPath, 'unevaluatedProperties')
        );
        if (propertyErrors.length > 0) {
          errors.push(ValidationErrorFactory.build(
            instancePath, SchemaPointer.append(schemaPath, 'unevaluatedProperties'), { 'keyword': 'unevaluatedProperties' }, { 'unevaluatedProperty': key }
          ));
        }
        own.properties.add(key);
      }
      return errors;
    };
  }

  private static makeItemResidualCollector(node: CompiledNodeInterface | undefined): ResidualCollectorFunctionInterface {
    return (value, context, instancePath, schemaPath, own) => {
      const errors: EntityValidationErrorInterface[] = [];
      if (node === undefined || !Predicates.isArray(value)) { return errors; }
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        if (own.items.has(index)) { continue; }
        const itemErrors = node.collect(value[index], context, `${instancePath}/${index}`, SchemaPointer.append(schemaPath, 'unevaluatedItems'));
        if (itemErrors.length > 0) {
          errors.push(ValidationErrorFactory.build(
            instancePath, SchemaPointer.append(schemaPath, 'unevaluatedItems'), { 'keyword': 'unevaluatedItems', 'keywordValue': index }, { 'limit': index }
          ));
        }
        own.items.add(index);
      }
      return errors;
    };
  }
}
