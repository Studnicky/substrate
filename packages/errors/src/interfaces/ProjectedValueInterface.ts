/**
 * A projected caught value with the remainder of its cause chain flattened behind it.
 *
 * @module
 */
import type { ProjectedNodeInterface } from './ProjectedNodeInterface.js';

/** A projected head node plus its flattened cause chain. */
export interface ProjectedValueInterface extends ProjectedNodeInterface {
  /** Remainder of the cause chain, nearest first, excluding this node. */
  readonly 'causes'?: readonly ProjectedNodeInterface[];
}
