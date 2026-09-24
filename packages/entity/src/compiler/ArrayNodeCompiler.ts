import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles `items` through `uniqueItems` into one specialised closure pair, marking evaluated indices. */
export class ArrayNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    const hasKeywords = plan.items !== undefined || plan.prefixItems !== undefined || plan.contains !== undefined
      || plan.minimumItems !== undefined || plan.maximumItems !== undefined || plan.uniqueItems;
    if (!hasKeywords) {
      return undefined;
    }

    const prefixNodes = (plan.prefixItems ?? []).map((subschema, index) => {
      const node = compileChild(subschema, `prefixItems/${index}`);
      return node;
    });
    const itemsNode = plan.items === undefined ? undefined : compileChild(plan.items, 'items');
    const containsNode = plan.contains === undefined ? undefined : compileChild(plan.contains, 'contains');
    const { 'maximumContains': maximumContainsValue, 'maximumItems': maximumItemsValue, 'minimumContains': minimumContainsValue = 1, 'minimumItems': minimumItemsValue, uniqueItems } = plan;

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!Predicates.isArray(value)) {
        return true;
      }
      if (minimumItemsValue !== undefined && !Predicates.satisfiesMinimumItems([...value], minimumItemsValue)) { return false; }
      if (maximumItemsValue !== undefined && !Predicates.satisfiesMaximumItems([...value], maximumItemsValue)) { return false; }
      if (uniqueItems && !Predicates.satisfiesUniqueItems([...value])) { return false; }
      const prefixCount = prefixNodes.length;
      for (let index = 0; index < prefixCount; index += 1) {
        if (index >= value.length) { break; }
        if (!prefixNodes[index]!.check(value[index], context)) { return false; }
        evaluated?.items.add(index);
      }
      if (itemsNode !== undefined) {
        for (let index = prefixCount; index < value.length; index += 1) {
          if (!itemsNode.check(value[index], context)) { return false; }
          evaluated?.items.add(index);
        }
      }
      if (containsNode !== undefined) {
        const matchCount = ArrayNodeCompiler.countContainsMatches(value, containsNode, context, evaluated);
        if (matchCount < minimumContainsValue || (maximumContainsValue !== undefined && matchCount > maximumContainsValue)) { return false; }
      }
      return true;
    };

    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!Predicates.isArray(value)) { return []; }
      const errors: EntityValidationErrorInterface[] = [];
      if (minimumItemsValue !== undefined && !Predicates.satisfiesMinimumItems([...value], minimumItemsValue)) {
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPath, 'minItems'), { 'keyword': 'minItems', 'keywordValue': minimumItemsValue }, { 'limit': minimumItemsValue }
        ));
      }
      if (maximumItemsValue !== undefined && !Predicates.satisfiesMaximumItems([...value], maximumItemsValue)) {
        errors.push(ValidationErrorFactory.build(
          instancePath, SchemaPointer.append(schemaPath, 'maxItems'), { 'keyword': 'maxItems', 'keywordValue': maximumItemsValue }, { 'limit': maximumItemsValue }
        ));
      }
      if (uniqueItems && !Predicates.satisfiesUniqueItems([...value])) {
        errors.push(ValidationErrorFactory.build(instancePath, SchemaPointer.append(schemaPath, 'uniqueItems'), { 'keyword': 'uniqueItems' }));
      }
      const prefixCount = prefixNodes.length;
      for (let index = 0; index < prefixCount; index += 1) {
        if (index >= value.length) { break; }
        errors.push(...prefixNodes[index]!.collect(
          value[index], context, `${instancePath}/${index}`, SchemaPointer.append(schemaPath, `prefixItems/${index}`)
        ));
        evaluated?.items.add(index);
      }
      if (itemsNode !== undefined) {
        for (let index = prefixCount; index < value.length; index += 1) {
          errors.push(...itemsNode.collect(value[index], context, `${instancePath}/${index}`, SchemaPointer.append(schemaPath, 'items')));
          evaluated?.items.add(index);
        }
      }
      if (containsNode !== undefined) {
        const matchCount = ArrayNodeCompiler.countContainsMatches(value, containsNode, context, evaluated);
        if (matchCount < minimumContainsValue || (maximumContainsValue !== undefined && matchCount > maximumContainsValue)) {
          errors.push(ValidationErrorFactory.build(
            instancePath, SchemaPointer.append(schemaPath, 'contains'),
            { 'containsMaximum': maximumContainsValue, 'containsMinimum': minimumContainsValue, 'keyword': 'contains' }
          ));
        }
      }
      return errors;
    };

    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static countContainsMatches(
    value: readonly unknown[], containsNode: CompiledNodeInterface, context: ValidationExecutionContextInterface,
    evaluated: EvaluatedTrackerInterface | undefined
  ): number {
    let count = 0;
    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      if (containsNode.check(value[index], context)) {
        count += 1;
        evaluated?.items.add(index);
      }
    }
    return count;
  }
}
