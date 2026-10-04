import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface, ValidationExecutionContextInterface } from './interfaces/CompilerExecutionStateInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

interface ArraySizeConstraintsInterface {
  readonly 'maximumItems': number | undefined;
  readonly 'minimumItems': number | undefined;
  readonly 'uniqueItems': boolean;
}

interface ArrayContainsBoundsInterface {
  readonly 'maximumContains': number | undefined;
  readonly 'minimumContains': number;
}

interface ArrayCollectCallInterface {
  readonly 'context': ValidationExecutionContextInterface;
  readonly 'evaluated': EvaluatedTrackerInterface | undefined;
  readonly 'instancePath': string;
  readonly 'schemaPath': string;
}

/** Compiles `items` through `uniqueItems` into one specialised closure pair, marking evaluated indices. */
export class ArrayNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    if (!ArrayNodeCompiler.hasArrayKeywords(plan)) { return undefined; }

    const prefixNodes = ArrayNodeCompiler.compilePrefixNodes(plan, compileChild);
    const itemsNode = ArrayNodeCompiler.compileOptionalChild(plan.items, 'items', compileChild);
    const containsNode = ArrayNodeCompiler.compileOptionalChild(plan.contains, 'contains', compileChild);
    const constraints: ArraySizeConstraintsInterface = {
      'maximumItems': plan.maximumItems, 'minimumItems': plan.minimumItems, 'uniqueItems': plan.uniqueItems
    };
    const bounds: ArrayContainsBoundsInterface = { 'maximumContains': plan.maximumContains, 'minimumContains': plan.minimumContains ?? 1 };

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      if (!Predicates.isArray(value)) { return true; }
      if (!ArrayNodeCompiler.sizeConstraintsSatisfied(value, constraints)) { return false; }
      const prefixCount = prefixNodes.length;
      if (!ArrayNodeCompiler.checkPrefixItems(value, prefixNodes, context, evaluated)) { return false; }
      if (itemsNode !== undefined && !ArrayNodeCompiler.checkItems(value, itemsNode, prefixCount, context, evaluated)) { return false; }
      if (containsNode !== undefined && !ArrayNodeCompiler.checkContains(value, containsNode, bounds, context, evaluated)) { return false; }
      return true;
    };

    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      if (!Predicates.isArray(value)) { return []; }
      const call: ArrayCollectCallInterface = { 'context': context, 'evaluated': evaluated, 'instancePath': instancePath, 'schemaPath': schemaPath };
      const errors: EntityValidationErrorInterface[] = [];
      errors.push(...ArrayNodeCompiler.collectSizeErrors(value, constraints, instancePath, schemaPath));
      const prefixCount = prefixNodes.length;
      errors.push(...ArrayNodeCompiler.collectPrefixItemErrors(value, prefixNodes, call));
      if (itemsNode !== undefined) { errors.push(...ArrayNodeCompiler.collectItemErrors(value, itemsNode, prefixCount, call)); }
      if (containsNode !== undefined) { errors.push(...ArrayNodeCompiler.collectContainsError(value, containsNode, bounds, call)); }
      return errors;
    };

    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static hasArrayKeywords(plan: SchemaNodePlanInterface): boolean {
    const result = plan.items !== undefined || plan.prefixItems !== undefined || plan.contains !== undefined
      || plan.minimumItems !== undefined || plan.maximumItems !== undefined || plan.uniqueItems;
    return result;
  }

  private static compilePrefixNodes(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface[] {
    const result = (plan.prefixItems ?? []).map((subschema, index) => {
      const node = compileChild(subschema, `prefixItems/${index}`);
      return node;
    });
    return result;
  }

  private static compileOptionalChild(
    schema: unknown, segment: string, compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    if (schema === undefined) { return undefined; }
    const result = compileChild(schema, segment);
    return result;
  }

  private static sizeConstraintsSatisfied(value: readonly unknown[], constraints: ArraySizeConstraintsInterface): boolean {
    const { maximumItems, minimumItems, uniqueItems } = constraints;
    if (minimumItems !== undefined && !Predicates.satisfiesMinimumItems([...value], minimumItems)) { return false; }
    if (maximumItems !== undefined && !Predicates.satisfiesMaximumItems([...value], maximumItems)) { return false; }
    if (uniqueItems && !Predicates.satisfiesUniqueItems([...value])) { return false; }
    return true;
  }

  private static checkPrefixItems(
    value: readonly unknown[], prefixNodes: readonly CompiledNodeInterface[], context: ValidationExecutionContextInterface,
    evaluated: EvaluatedTrackerInterface | undefined
  ): boolean {
    const prefixCount = prefixNodes.length;
    for (let index = 0; index < prefixCount; index += 1) {
      if (index >= value.length) { break; }
      if (!prefixNodes[index]!.check(value[index], context)) { return false; }
      evaluated?.items.add(index);
    }
    return true;
  }

  private static checkItems(
    value: readonly unknown[], itemsNode: CompiledNodeInterface, prefixCount: number, context: ValidationExecutionContextInterface,
    evaluated: EvaluatedTrackerInterface | undefined
  ): boolean {
    for (let index = prefixCount; index < value.length; index += 1) {
      if (!itemsNode.check(value[index], context)) { return false; }
      evaluated?.items.add(index);
    }
    return true;
  }

  private static checkContains(
    value: readonly unknown[], containsNode: CompiledNodeInterface, bounds: ArrayContainsBoundsInterface,
    context: ValidationExecutionContextInterface, evaluated: EvaluatedTrackerInterface | undefined
  ): boolean {
    const matchCount = ArrayNodeCompiler.countContainsMatches(value, containsNode, context, evaluated);
    const result = ArrayNodeCompiler.containsBoundsSatisfied(matchCount, bounds);
    return result;
  }

  private static containsBoundsSatisfied(matchCount: number, bounds: ArrayContainsBoundsInterface): boolean {
    const result = matchCount >= bounds.minimumContains && (bounds.maximumContains === undefined || matchCount <= bounds.maximumContains);
    return result;
  }

  private static collectSizeErrors(
    value: readonly unknown[], constraints: ArraySizeConstraintsInterface, instancePath: string, schemaPath: string
  ): EntityValidationErrorInterface[] {
    const { maximumItems, minimumItems, uniqueItems } = constraints;
    const errors: EntityValidationErrorInterface[] = [];
    if (minimumItems !== undefined && !Predicates.satisfiesMinimumItems([...value], minimumItems)) {
      errors.push(ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, 'minItems'), { 'keyword': 'minItems', 'keywordValue': minimumItems }, { 'limit': minimumItems }
      ));
    }
    if (maximumItems !== undefined && !Predicates.satisfiesMaximumItems([...value], maximumItems)) {
      errors.push(ValidationErrorFactory.build(
        instancePath, SchemaPointer.append(schemaPath, 'maxItems'), { 'keyword': 'maxItems', 'keywordValue': maximumItems }, { 'limit': maximumItems }
      ));
    }
    if (uniqueItems && !Predicates.satisfiesUniqueItems([...value])) {
      errors.push(ValidationErrorFactory.build(instancePath, SchemaPointer.append(schemaPath, 'uniqueItems'), { 'keyword': 'uniqueItems' }));
    }
    return errors;
  }

  private static collectPrefixItemErrors(
    value: readonly unknown[], prefixNodes: readonly CompiledNodeInterface[], call: ArrayCollectCallInterface
  ): EntityValidationErrorInterface[] {
    const errors: EntityValidationErrorInterface[] = [];
    const prefixCount = prefixNodes.length;
    for (let index = 0; index < prefixCount; index += 1) {
      if (index >= value.length) { break; }
      errors.push(...prefixNodes[index]!.collect(
        value[index], call.context, `${call.instancePath}/${index}`, SchemaPointer.append(call.schemaPath, `prefixItems/${index}`)
      ));
      call.evaluated?.items.add(index);
    }
    return errors;
  }

  private static collectItemErrors(
    value: readonly unknown[], itemsNode: CompiledNodeInterface, prefixCount: number, call: ArrayCollectCallInterface
  ): EntityValidationErrorInterface[] {
    const errors: EntityValidationErrorInterface[] = [];
    for (let index = prefixCount; index < value.length; index += 1) {
      errors.push(...itemsNode.collect(value[index], call.context, `${call.instancePath}/${index}`, SchemaPointer.append(call.schemaPath, 'items')));
      call.evaluated?.items.add(index);
    }
    return errors;
  }

  private static collectContainsError(
    value: readonly unknown[], containsNode: CompiledNodeInterface, bounds: ArrayContainsBoundsInterface, call: ArrayCollectCallInterface
  ): EntityValidationErrorInterface[] {
    const matchCount = ArrayNodeCompiler.countContainsMatches(value, containsNode, call.context, call.evaluated);
    if (ArrayNodeCompiler.containsBoundsSatisfied(matchCount, bounds)) { return []; }
    const result = [ValidationErrorFactory.build(
      call.instancePath, SchemaPointer.append(call.schemaPath, 'contains'),
      { 'containsMaximum': bounds.maximumContains, 'containsMinimum': bounds.minimumContains, 'keyword': 'contains' }
    )];
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
