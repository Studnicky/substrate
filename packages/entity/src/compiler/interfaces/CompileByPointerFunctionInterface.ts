import type { CompiledNodeInterface } from './CompiledNodeInterface.js';

/** Resolves and compiles (or reuses) the node a JSON Pointer or dynamic anchor name addresses. */
export interface CompileByPointerFunctionInterface {
  (pointer: string): CompiledNodeInterface;
}
