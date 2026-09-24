import { Predicates } from '@studnicky/types/browser';

import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { CompiledNodeInterface } from './interfaces/CompiledNodeInterface.js';
import type { DynamicScopeFrameInterface } from './interfaces/DynamicScopeFrameInterface.js';
import type { ReferenceTargetResolverFunctionInterface } from './interfaces/ReferenceTargetResolverFunctionInterface.js';
import type { ResolvedUriReferenceInterface } from './interfaces/ResolvedUriReferenceInterface.js';
import type { SchemaCompileContextInterface } from './interfaces/SchemaCompileContextInterface.js';

import { ArrayNodeCompiler } from './ArrayNodeCompiler.js';
import { CompositionNodeCompiler } from './CompositionNodeCompiler.js';
import { DynamicAnchorNodeCompiler } from './DynamicAnchorNodeCompiler.js';
import { LazyCompiledNode } from './LazyCompiledNode.js';
import { ReferenceNodeCompiler } from './ReferenceNodeCompiler.js';
import { ScalarNodeCompiler } from './ScalarNodeCompiler.js';
import { SchemaNodePlanBuilder } from './SchemaNodePlanBuilder.js';
import { SchemaPointer } from './SchemaPointer.js';
import { StructuralNodeCompiler } from './StructuralNodeCompiler.js';
import { UnevaluatedNodeCompiler } from './UnevaluatedNodeCompiler.js';
import { UriReference } from './UriReference.js';
import { ValidationErrorFactory } from './ValidationErrorFactory.js';

/** Compiles one schema node into a specialised closure pair, recursing into every nested schema it declares. */
export class SchemaNodeCompiler {
  private static readonly ALWAYS_TRUE_NODE: CompiledNodeInterface = {
    'check': SchemaNodeCompiler.alwaysTrue, 'collect': SchemaNodeCompiler.alwaysValid
  };

  public static compile(
    schema: unknown, compileContext: SchemaCompileContextInterface, schemaPointer: string, currentBase: string
  ): CompiledNodeInterface {
    if (schema === false) {
      const result = SchemaNodeCompiler.alwaysFalseNode(schemaPointer);
      return result;
    }
    if (schema === true || !Predicates.isRecord(schema)) {
      return SchemaNodeCompiler.ALWAYS_TRUE_NODE;
    }

    const plan = SchemaNodePlanBuilder.build(schema, schemaPointer);
    const effectiveBase = plan.id === undefined ? currentBase : UriReference.resolve(plan.id, currentBase).base;
    const compileChild = (childSchema: unknown, segment: string): CompiledNodeInterface => {
      const node = SchemaNodeCompiler.compile(childSchema, compileContext, SchemaNodeCompiler.appendSegment(schemaPointer, segment), effectiveBase);
      return node;
    };
    const resolveReference: ReferenceTargetResolverFunctionInterface = (reference) => {
      const node = SchemaNodeCompiler.resolveReference(reference, effectiveBase, compileContext);
      return node;
    };
    const isDynamicAnchorTarget = (reference: string): boolean => {
      const resolved = UriReference.resolve(reference, effectiveBase);
      const result = compileContext.resourceIndex.dynamicAnchors.has(`${resolved.base}#${resolved.fragment}`);
      return result;
    };

    const clauses: CompiledNodeInterface[] = [];
    const scalarNode = compileContext.validationVocabularyEnabled ? ScalarNodeCompiler.compile(plan) : undefined;
    if (scalarNode !== undefined) { clauses.push(scalarNode); }
    const structuralNode = StructuralNodeCompiler.compile(plan, compileChild);
    if (structuralNode !== undefined) { clauses.push(structuralNode); }
    const arrayNode = ArrayNodeCompiler.compile(plan, compileChild);
    if (arrayNode !== undefined) { clauses.push(arrayNode); }
    const compositionNode = CompositionNodeCompiler.compile(plan, compileChild);
    if (compositionNode !== undefined) { clauses.push(compositionNode); }
    const referenceNode = ReferenceNodeCompiler.compile(plan, resolveReference, isDynamicAnchorTarget);
    if (referenceNode !== undefined) { clauses.push(referenceNode); }

    const combined = SchemaNodeCompiler.combine(clauses);
    const withUnevaluated = UnevaluatedNodeCompiler.wrap(plan, combined, compileChild);
    if (plan.id === undefined) { return withUnevaluated; }
    const result = SchemaNodeCompiler.withResourceEntry(effectiveBase, compileContext, withUnevaluated);
    return result;
  }

  /** Compiles the whole document's root node and bookends its `$dynamicAnchor`s onto the dynamic scope. `parentBase` is normally `''` — no retrieval URI known. */
  public static compileRoot(schema: unknown, compileContext: SchemaCompileContextInterface, schemaPointer: string, parentBase: string): CompiledNodeInterface {
    const declaredId = Predicates.isRecord(schema) ? Reflect.get(schema, '$id') : undefined;
    const frameBase = Predicates.isString(declaredId) ? UriReference.resolve(declaredId, parentBase).base : parentBase;
    const node = SchemaNodeCompiler.compile(schema, compileContext, schemaPointer, parentBase);
    const result = SchemaNodeCompiler.withResourceEntry(frameBase, compileContext, node);
    return result;
  }

  private static withResourceEntry(base: string, compileContext: SchemaCompileContextInterface, node: CompiledNodeInterface): CompiledNodeInterface {
    const frame = SchemaNodeCompiler.buildDynamicScopeFrame(base, compileContext);
    const result = frame.anchors.size === 0 ? node : DynamicAnchorNodeCompiler.wrap(frame, node);
    return result;
  }

  /**
   * Bookends every `$dynamicAnchor` a schema resource declares — even one never structurally visited, whose sole
   * purpose is being a `$dynamicRef` target (the "bookending" requirement) — onto the resource's dynamic scope frame.
   */
  private static buildDynamicScopeFrame(base: string, compileContext: SchemaCompileContextInterface): DynamicScopeFrameInterface {
    const resource = compileContext.resourceIndex.resources.get(base);
    const anchors = new Map<string, CompiledNodeInterface>();
    if (resource === undefined) { return { 'anchors': anchors }; }
    const prefix = `${base}#`;
    compileContext.resourceIndex.dynamicAnchors.forEach((pointer, key) => {
      if (!key.startsWith(prefix)) { return; }
      const name = key.slice(prefix.length);
      const target = LazyCompiledNode.wrap(() => {
        const result = SchemaNodeCompiler.compile(SchemaPointer.resolve(pointer, resource.document), compileContext, pointer, base);
        return result;
      });
      anchors.set(name, target);
    });
    return { 'anchors': anchors };
  }

  /** A caller's `segment` may be `keyword/name` (e.g. `properties/${name}`); only the first `/` is the pointer separator, the rest belongs to `name` and gets escaped. */
  private static appendSegment(pointer: string, segment: string): string {
    const separatorIndex = segment.indexOf('/');
    if (separatorIndex === -1) {
      const result = SchemaPointer.append(pointer, segment);
      return result;
    }
    const keyword = segment.slice(0, separatorIndex);
    const name = segment.slice(separatorIndex + 1);
    const result = SchemaPointer.append(SchemaPointer.append(pointer, keyword), name);
    return result;
  }

  /** Resolves a `$ref`/`$dynamicRef` string against its base URI and compiles (or reuses) the target, lazily to tolerate cycles. */
  private static resolveReference(reference: string, currentBase: string, compileContext: SchemaCompileContextInterface): CompiledNodeInterface {
    const resolved = UriReference.resolve(reference, currentBase);
    const cacheKey = `${resolved.base}#${resolved.fragment}`;
    const cached = compileContext.referenceCache.get(cacheKey);
    if (cached !== undefined) { return cached; }
    const node = LazyCompiledNode.wrap(() => {
      const result = SchemaNodeCompiler.compileResolvedReference(resolved, compileContext);
      return result;
    });
    compileContext.referenceCache.set(cacheKey, node);
    return node;
  }

  /**
   * `mergeBase` feeds `compile()`'s own `$id` re-merge (the parent base, so a resource-root target's own relative
   * `$id` merges exactly once); `frameBase` is the resource's true resolved base — always used for bookending,
   * since re-deriving it from `mergeBase` a second time would double the merge.
   */
  private static compileResolvedReference(resolved: ResolvedUriReferenceInterface, compileContext: SchemaCompileContextInterface): CompiledNodeInterface {
    const target = SchemaNodeCompiler.locateReferenceTarget(resolved, compileContext);
    if (target === undefined) {
      throw new Error(`Unresolvable reference: ${resolved.base}#${resolved.fragment}`);
    }
    const node = SchemaNodeCompiler.compile(target.schema, compileContext, target.pointer, target.mergeBase);
    const result = SchemaNodeCompiler.withResourceEntry(target.frameBase, compileContext, node);
    return result;
  }

  private static locateReferenceTarget(
    resolved: ResolvedUriReferenceInterface, compileContext: SchemaCompileContextInterface
  ): { readonly 'frameBase': string; readonly 'mergeBase': string; readonly 'pointer': string; readonly 'schema': unknown; } | undefined {
    const resource = compileContext.resourceIndex.resources.get(resolved.base);
    if (resource === undefined) { return undefined; }
    if (resolved.fragment === '') {
      const schema = SchemaPointer.resolve(resource.pointerPrefix, resource.document);
      return { 'frameBase': resolved.base, 'mergeBase': resource.parentBase, 'pointer': resource.pointerPrefix, 'schema': schema };
    }
    if (resolved.fragment.startsWith('/')) {
      const pointer = `${resource.pointerPrefix}${resolved.fragment}`;
      const schema = SchemaPointer.resolve(pointer, resource.document);
      return { 'frameBase': resolved.base, 'mergeBase': resolved.base, 'pointer': pointer, 'schema': schema };
    }
    const anchorPointer = compileContext.resourceIndex.anchors.get(`${resolved.base}#${resolved.fragment}`);
    if (anchorPointer === undefined) { return undefined; }
    const schema = SchemaPointer.resolve(anchorPointer, resource.document);
    return { 'frameBase': resolved.base, 'mergeBase': resolved.base, 'pointer': anchorPointer, 'schema': schema };
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
