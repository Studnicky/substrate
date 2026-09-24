import type { CompiledNodeInterface } from './CompiledNodeInterface.js';

/** One compiled `patternProperties` entry: its source pattern, the matcher built from it, and its compiled node. */
export interface PatternApplicatorInterface {
  readonly 'matcher': RegExp;
  readonly 'node': CompiledNodeInterface;
  readonly 'pattern': string;
}
