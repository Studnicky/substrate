import type { CompiledNodeInterface } from './CompiledNodeInterface.js';

/** Compiles a directly-nested schema fragment, appending one JSON Pointer segment to the caller's location. */
export interface CompileChildFunctionInterface {
  (schema: unknown, pointerSegment: string): CompiledNodeInterface;
}
