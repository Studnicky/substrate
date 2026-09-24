import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileChildFunctionInterface } from './interfaces/CompileChildFunctionInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { EvaluatedTrackerInterface } from './interfaces/EvaluatedTrackerInterface.js';
import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';
import type { ValidationExecutionContextInterface } from './interfaces/ValidationExecutionContextInterface.js';

import { EvaluatedTracker } from './EvaluatedTracker.js';
import { SchemaPointer } from './SchemaPointer.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles `allOf`/`anyOf`/`oneOf`/`not`/`if`-`then`-`else`. Every composition branch's annotations count, winning or not. */
export class CompositionNodeCompiler {
  public static compile(
    plan: SchemaNodePlanInterface,
    compileChild: CompileChildFunctionInterface
  ): CompiledNodeInterface | undefined {
    const clauses: CompiledNodeInterface[] = [];
    const allOfNode = CompositionNodeCompiler.compileAllOf(plan, compileChild);
    if (allOfNode !== undefined) { clauses.push(allOfNode); }
    const anyOfNode = CompositionNodeCompiler.compileAnyOf(plan, compileChild);
    if (anyOfNode !== undefined) { clauses.push(anyOfNode); }
    const oneOfNode = CompositionNodeCompiler.compileOneOf(plan, compileChild);
    if (oneOfNode !== undefined) { clauses.push(oneOfNode); }
    const notNode = CompositionNodeCompiler.compileNot(plan, compileChild);
    if (notNode !== undefined) { clauses.push(notNode); }
    const conditionalNode = CompositionNodeCompiler.compileConditional(plan, compileChild);
    if (conditionalNode !== undefined) { clauses.push(conditionalNode); }
    if (clauses.length === 0) { return undefined; }
    if (clauses.length === 1) { return clauses[0]; }

    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const count = clauses.length;
      for (let index = 0; index < count; index += 1) {
        if (!clauses[index]!.check(value, context, evaluated)) { return false; }
      }
      return true;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const errors: EntityValidationErrorInterface[] = [];
      const count = clauses.length;
      for (let index = 0; index < count; index += 1) {
        errors.push(...clauses[index]!.collect(value, context, instancePath, schemaPath, evaluated));
      }
      return errors;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static compileAllOf(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface | undefined {
    if (plan.allOf === undefined) { return undefined; }
    const branches = plan.allOf.map((subschema, index) => {
      const node = compileChild(subschema, `allOf/${index}`);
      return node;
    });
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const count = branches.length;
      for (let index = 0; index < count; index += 1) {
        if (!branches[index]!.check(value, context, evaluated)) { return false; }
      }
      return true;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const errors: EntityValidationErrorInterface[] = [];
      const count = branches.length;
      for (let index = 0; index < count; index += 1) {
        errors.push(...branches[index]!.collect(value, context, instancePath, SchemaPointer.append(schemaPath, `allOf/${index}`), evaluated));
      }
      return errors;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static compileAnyOf(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface | undefined {
    if (plan.anyOf === undefined) { return undefined; }
    const branches = plan.anyOf.map((subschema, index) => {
      const node = compileChild(subschema, `anyOf/${index}`);
      return node;
    });
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const outcome = CompositionNodeCompiler.evaluateEveryBranch(branches, value, context, evaluated);
      const result = outcome.passCount > 0;
      return result;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const outcome = CompositionNodeCompiler.evaluateEveryBranch(branches, value, context, evaluated);
      if (outcome.passCount > 0) { return []; }
      const result = [ValidationErrorFactory.build(instancePath, SchemaPointer.append(schemaPath, 'anyOf'), { 'keyword': 'anyOf' })];
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static compileOneOf(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface | undefined {
    if (plan.oneOf === undefined) { return undefined; }
    const branches = plan.oneOf.map((subschema, index) => {
      const node = compileChild(subschema, `oneOf/${index}`);
      return node;
    });
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const outcome = CompositionNodeCompiler.evaluateEveryBranch(branches, value, context, evaluated);
      const result = outcome.passCount === 1;
      return result;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const outcome = CompositionNodeCompiler.evaluateEveryBranch(branches, value, context, evaluated);
      if (outcome.passCount === 1) { return []; }
      const result = [ValidationErrorFactory.build(instancePath, SchemaPointer.append(schemaPath, 'oneOf'), { 'keyword': 'oneOf' })];
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  /** Runs every branch on its own tracker (so a losing branch's annotations still count) and merges into `evaluated`. */
  private static evaluateEveryBranch(
    branches: readonly CompiledNodeInterface[], value: unknown, context: ValidationExecutionContextInterface,
    evaluated: EvaluatedTrackerInterface | undefined
  ): { 'passCount': number } {
    let passCount = 0;
    const count = branches.length;
    for (let index = 0; index < count; index += 1) {
      const branchTracker = evaluated === undefined ? undefined : EvaluatedTracker.create();
      if (branches[index]!.check(value, context, branchTracker)) {
        passCount += 1;
      }
      if (evaluated !== undefined && branchTracker !== undefined) {
        EvaluatedTracker.mergeInto(evaluated, branchTracker);
      }
    }
    const result = { 'passCount': passCount };
    return result;
  }

  private static compileNot(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface | undefined {
    if (plan.not === undefined) { return undefined; }
    const node = compileChild(plan.not, 'not');
    const check = (value: unknown, context: ValidationExecutionContextInterface): boolean => {
      const result = !node.check(value, context);
      return result;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string
    ): EntityValidationErrorInterface[] => {
      if (!node.check(value, context)) { return []; }
      const result = [ValidationErrorFactory.build(instancePath, SchemaPointer.append(schemaPath, 'not'), { 'keyword': 'not' })];
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }

  private static compileConditional(plan: SchemaNodePlanInterface, compileChild: CompileChildFunctionInterface): CompiledNodeInterface | undefined {
    if (plan.if === undefined) { return undefined; }
    const ifNode = compileChild(plan.if, 'if');
    const thenNode = plan.thenSchema === undefined ? undefined : compileChild(plan.thenSchema, 'then');
    const elseNode = plan.else === undefined ? undefined : compileChild(plan.else, 'else');
    const check = (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface): boolean => {
      const branch = ifNode.check(value, context) ? thenNode : elseNode;
      const result = branch === undefined || branch.check(value, context, evaluated);
      return result;
    };
    const collect = (
      value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string,
      evaluated?: EvaluatedTrackerInterface
    ): EntityValidationErrorInterface[] => {
      const conditionPassed = ifNode.check(value, context);
      const branch = conditionPassed ? thenNode : elseNode;
      if (branch === undefined) { return []; }
      const branchKeyword = conditionPassed ? 'then' : 'else';
      const result = branch.collect(value, context, instancePath, SchemaPointer.append(schemaPath, branchKeyword), evaluated);
      return result;
    };
    const result = { 'check': check, 'collect': collect };
    return result;
  }
}
