import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompileByPointerFunctionInterface } from './interfaces/CompileByPointerFunctionInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { SchemaCompileContextInterface } from './interfaces/SchemaCompileContextInterface.js';

import { ArrayNodeCompiler } from './ArrayNodeCompiler.js';
import { CompositionNodeCompiler } from './CompositionNodeCompiler.js';
import { DynamicAnchorNodeCompiler } from './DynamicAnchorNodeCompiler.js';
import { ReferenceNodeCompiler } from './ReferenceNodeCompiler.js';
import { ScalarNodeCompiler } from './ScalarNodeCompiler.js';
import { SchemaNodePlanBuilder } from './SchemaNodePlanBuilder.js';
import { SchemaPointer } from './SchemaPointer.js';
import { StructuralNodeCompiler } from './StructuralNodeCompiler.js';
import { UnevaluatedNodeCompiler } from './UnevaluatedNodeCompiler.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles one schema node into a specialised closure pair, recursing into every nested schema it declares. */
export class SchemaNodeCompiler {
  private static readonly ALWAYS_TRUE_NODE: CompiledNodeInterface = {
    'check': SchemaNodeCompiler.alwaysTrue, 'collect': SchemaNodeCompiler.alwaysValid
  };

  public static compile(
    schema: unknown, compileContext: SchemaCompileContextInterface, schemaPointer: string
  ): CompiledNodeInterface {
    if (schema === false) {
      const result = SchemaNodeCompiler.alwaysFalseNode(schemaPointer);
      return result;
    }
    if (schema === true || !Predicates.isRecord(schema)) {
      return SchemaNodeCompiler.ALWAYS_TRUE_NODE;
    }

    const plan = SchemaNodePlanBuilder.build(schema, schemaPointer);
    const compileChild = (childSchema: unknown, segment: string): CompiledNodeInterface => {
      const node = SchemaNodeCompiler.compile(childSchema, compileContext, SchemaPointer.append(schemaPointer, segment));
      return node;
    };
    const compileByPointer: CompileByPointerFunctionInterface = (pointer) => {
      const node = SchemaNodeCompiler.compileByPointer(pointer, compileContext);
      return node;
    };

    const clauses: CompiledNodeInterface[] = [];
    const scalarNode = ScalarNodeCompiler.compile(plan);
    if (scalarNode !== undefined) { clauses.push(scalarNode); }
    const structuralNode = StructuralNodeCompiler.compile(plan, compileChild);
    if (structuralNode !== undefined) { clauses.push(structuralNode); }
    const arrayNode = ArrayNodeCompiler.compile(plan, compileChild);
    if (arrayNode !== undefined) { clauses.push(arrayNode); }
    const compositionNode = CompositionNodeCompiler.compile(plan, compileChild);
    if (compositionNode !== undefined) { clauses.push(compositionNode); }
    const referenceNode = ReferenceNodeCompiler.compile(plan, compileContext.rootSchema, compileByPointer);
    if (referenceNode !== undefined) { clauses.push(referenceNode); }

    const combined = SchemaNodeCompiler.combine(clauses);
    const withUnevaluated = UnevaluatedNodeCompiler.wrap(plan, combined, compileChild);
    const result = plan.dynamicAnchor === undefined
      ? withUnevaluated
      : DynamicAnchorNodeCompiler.wrap(plan.dynamicAnchor, withUnevaluated);
    return result;
  }

  /** Resolves and compiles (or reuses) the node a JSON Pointer addresses, memoised on the shared compile context. */
  private static compileByPointer(pointer: string, compileContext: SchemaCompileContextInterface): CompiledNodeInterface {
    const cached = compileContext.referenceCache.get(pointer);
    if (cached !== undefined) { return cached; }
    const target = SchemaPointer.resolve(pointer, compileContext.rootSchema);
    const node = SchemaNodeCompiler.compile(target, compileContext, pointer);
    compileContext.referenceCache.set(pointer, node);
    return node;
  }

  private static combine(clauses: readonly CompiledNodeInterface[]): CompiledNodeInterface {
    if (clauses.length === 0) { return SchemaNodeCompiler.ALWAYS_TRUE_NODE; }
    if (clauses.length === 1) { return clauses[0]!; }
    const check: CompiledNodeInterface['check'] = (value, context, evaluated) => {
      const count = clauses.length;
      for (let index = 0; index < count; index += 1) {
        if (!clauses[index]!.check(value, context, evaluated)) { return false; }
      }
      return true;
    };
    const collect: CompiledNodeInterface['collect'] = (value, context, instancePath, schemaPath, evaluated) => {
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

  private static alwaysFalseNode(schemaPath: string): CompiledNodeInterface {
    const lastSegment = schemaPath.slice(schemaPath.lastIndexOf('/') + 1);
    const keyword = lastSegment.length > 0 ? lastSegment : 'false';
    const collect = (_value: unknown, _context: unknown, instancePath: string): EntityValidationErrorInterface[] => {
      const errors = [ValidationErrorFactory.build(instancePath, schemaPath, { 'keyword': keyword })];
      return errors;
    };
    const result = { 'check': SchemaNodeCompiler.alwaysFalse, 'collect': collect };
    return result;
  }

  private static alwaysTrue(): boolean {
    return true;
  }

  private static alwaysFalse(): boolean {
    return false;
  }

  private static alwaysValid(): EntityValidationErrorInterface[] {
    return [];
  }
}
