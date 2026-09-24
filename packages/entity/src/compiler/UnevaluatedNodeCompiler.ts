import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { EvaluatedTracker } from './EvaluatedTracker.js';
import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

interface UnevaluatedNodesInterface {
  readonly 'unevaluatedItemsNode': CompiledNodeInterface | undefined;
  readonly 'unevaluatedPropertiesNode': CompiledNodeInterface | undefined;
}

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
    const nodes: UnevaluatedNodesInterface = {
      'unevaluatedItemsNode': plan.unevaluatedItems === undefined ? undefined : compileChild(plan.unevaluatedItems, 'unevaluatedItems'),
      'unevaluatedPropertiesNode': plan.unevaluatedProperties === undefined
        ? undefined : compileChild(plan.unevaluatedProperties, 'unevaluatedProperties')
    };

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const own = EvaluatedTracker.create();
      if (!priorNode.check(value, context, own)) { return false; }
      const residualOk = UnevaluatedNodeCompiler.checkResidual(value, context, own, nodes);
      if (!residualOk) { return false; }
      if (evaluated !== undefined) { EvaluatedTracker.mergeInto(evaluated, own); }
      return true;
    };

    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const own = EvaluatedTracker.create();
      const errors = priorNode.collect(value, context, instancePath, schemaPath, own);
      errors.push(...UnevaluatedNodeCompiler.collectResidual(value, context, instancePath, schemaPath, own, nodes));
      if (evaluated !== undefined) { EvaluatedTracker.mergeInto(evaluated, own); }
      return errors;
    };

    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static checkResidual(
    value: unknown, context: ValidationExecutionContextInterface, own: EvaluatedTrackerInterface, nodes: UnevaluatedNodesInterface
  ): boolean {
    const { unevaluatedItemsNode, unevaluatedPropertiesNode } = nodes;
    if (unevaluatedPropertiesNode !== undefined && Predicates.isRecord(value)) {
      const keys = Object.keys(value);
      const count = keys.length;
      for (let index = 0; index < count; index += 1) {
        const key = keys[index]!;
        if (own.properties.has(key)) { continue; }
        if (!unevaluatedPropertiesNode.check(Reflect.get(value, key), context)) { return false; }
        own.properties.add(key);
      }
    }
    if (unevaluatedItemsNode !== undefined && Predicates.isArray(value)) {
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        if (own.items.has(index)) { continue; }
        if (!unevaluatedItemsNode.check(value[index], context)) { return false; }
        own.items.add(index);
      }
    }
    return true;
  }

  private static collectResidual(
    value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string, own: EvaluatedTrackerInterface,
    nodes: UnevaluatedNodesInterface
  ): EntityValidationErrorInterface[] {
    const { unevaluatedItemsNode, unevaluatedPropertiesNode } = nodes;
    const errors: EntityValidationErrorInterface[] = [];
    if (unevaluatedPropertiesNode !== undefined && Predicates.isRecord(value)) {
      const keys = Object.keys(value);
      const count = keys.length;
      for (let index = 0; index < count; index += 1) {
        const key = keys[index]!;
        if (own.properties.has(key)) { continue; }
        const propertyValue = Reflect.get(value, key);
        const escapedKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
        const propertyErrors = unevaluatedPropertiesNode.collect(
          propertyValue, context, `${instancePath}/${escapedKey}`, SchemaPointer.append(schemaPath, 'unevaluatedProperties')
        );
        if (propertyErrors.length > 0) {
          errors.push(ValidationErrorFactory.build(
            instancePath, SchemaPointer.append(schemaPath, 'unevaluatedProperties'), { 'keyword': 'unevaluatedProperties' }, { 'unevaluatedProperty': key }
          ));
        }
        own.properties.add(key);
      }
    }
    if (unevaluatedItemsNode !== undefined && Predicates.isArray(value)) {
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        if (own.items.has(index)) { continue; }
        const itemErrors = unevaluatedItemsNode.collect(
          value[index], context, `${instancePath}/${index}`, SchemaPointer.append(schemaPath, 'unevaluatedItems')
        );
        if (itemErrors.length > 0) {
          errors.push(ValidationErrorFactory.build(
            instancePath, SchemaPointer.append(schemaPath, 'unevaluatedItems'), { 'keyword': 'unevaluatedItems', 'keywordValue': index }, { 'limit': index }
          ));
        }
        own.items.add(index);
      }
    }
    return errors;
  }
}
