/**
 * Registry of built-in error codes declared by this package.
 * Duplicate registrations signal an internal definition collision.
 *
 * @module
 */
import type { ErrorCodeDescriptorEntity } from '../entities/ErrorCodeDescriptorEntity.js';

// Module-level singleton map.
const registry = new Map<string, ErrorCodeDescriptorEntity.Type>();

/**
 * Static registry for the package's hierarchical dotted camelCase error codes.
 * Built-in error modules register their codes here at module load.
 *
 * Process-scoped registry used only while package modules initialize.
 */
export class ErrorCodeRegistry {
  private constructor() {
    // Sealed — all access is via static methods. Not designed for subclassing.
    throw new Error('ErrorCodeRegistry is not instantiable');
  }

  /**
   * Register an error code descriptor.
   * Duplicate codes indicate conflicting internal definitions.
   */
  public static register(descriptor: Readonly<ErrorCodeDescriptorEntity.Type>): void {
    if (registry.has(descriptor.code)) {
      throw new Error(`Duplicate error code: ${descriptor.code}`);
    }
    registry.set(descriptor.code, descriptor);
  }
}
