import type { SchemaNodeInterface } from '../interfaces/SchemaNodeInterface.js';

/**
 * Reads a compiled node's own derived type. One indexed access per call site;
 * resolving a parent's property never forces this to recurse into siblings.
 *
 * @module
 */
export type NodeStaticType<TNode extends SchemaNodeInterface<unknown, unknown>> = Exclude<TNode['static'], undefined>;
