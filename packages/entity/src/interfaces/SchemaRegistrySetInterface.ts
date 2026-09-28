import type { SchemaCompilerInterface } from './SchemaCompilerInterface.js';

/** The three isolated compilation backends `EntityCompiler` dispatches to. */
export interface SchemaRegistrySetInterface {
  readonly 'assert': SchemaCompilerInterface;
  readonly 'create': SchemaCompilerInterface;
  readonly 'intake': SchemaCompilerInterface;
}
