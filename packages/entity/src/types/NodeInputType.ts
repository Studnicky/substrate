import type { SchemaNodeInterface } from '../interfaces/SchemaNodeInterface.js';

/**
 * Reads a compiled node's own pre-validation type: the same field names and
 * optionality as `NodeStaticType`, carrying no constraint brand. A caller
 * assembling untrusted input types this way, not with `NodeStaticType`.
 *
 * @module
 */
export type NodeInputType<TNode extends SchemaNodeInterface<unknown, unknown>> = Exclude<TNode['input'], undefined>;
