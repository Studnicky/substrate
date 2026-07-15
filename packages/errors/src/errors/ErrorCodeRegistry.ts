/**
 * Registry of all error codes used in this system.
 * Every error code must be registered before a `BaseError` subclass may use it.
 * Duplicate registrations after initial boot signal a collision via the
 * registered handler (set by `BaseError` bootstrap).
 *
 * @module
 */
import type { ErrorCodeDescriptorType } from '../types/ErrorCodeDescriptorType.js';

// Module-level singleton map.
const registry = new Map<string, ErrorCodeDescriptorType>();

// Collision handler — set during bootstrap. Before it is set, any collision during
// the early-registration window is silently ignored (structurally unreachable in
// normal operation; the bootstrap path registers each code exactly once).
let collisionHandler: ((code: string) => never) | undefined = undefined;

/**
 * Static registry for hierarchical dotted camelCase error codes.
 * All `BaseError` subclasses register their codes here at module load.
 *
 * Process-scoped registry — not designed for subclassing; use `reset()` for
 * test isolation.
 */
export class ErrorCodeRegistry {
  private constructor() {
    // Sealed — all access is via static methods. Not designed for subclassing.
    throw new Error('ErrorCodeRegistry is not instantiable');
  }

  /**
   * Sets the collision handler used by `ErrorCodeRegistry.register()`.
   * Called once during bootstrap to break the circular dependency between the
   * registry and its first error subclass.
   *
   * @internal — not re-exported through the package barrel.
   */
  public static setCollisionHandler(handler: (code: string) => never): void {
    collisionHandler = handler;
  }

  /**
   * Returns the descriptor for a registered code, or `undefined` if not found.
   */
  public static describe(code: string): ErrorCodeDescriptorType | undefined {
    if (code.length === 0) {
      return undefined;
    }
    return registry.get(code);
  }

  /**
   * Returns `true` if the code has been registered.
   */
  public static isRegistered(code: string): boolean {
    if (code.length === 0) {
      return false;
    }
    return registry.has(code);
  }

  /**
   * Returns all registered descriptors as a readonly array.
   */
  public static list(): readonly ErrorCodeDescriptorType[] {
    const snapshot: ErrorCodeDescriptorType[] = [];
    for (const entry of registry.values()) {
      snapshot.push(entry);
    }
    return snapshot;
  }

  /**
   * Register an error code descriptor.
   * On collision after bootstrap, signals the registered collision handler.
   * During the collision-free bootstrap window, duplicates are silently ignored.
   */
  public static register(descriptor: Readonly<ErrorCodeDescriptorType>): void {
    if (registry.has(descriptor.code)) {
      if (collisionHandler !== undefined) {
        collisionHandler(descriptor.code);
      }
      return;
    }
    registry.set(descriptor.code, descriptor);
  }

  /**
   * Clears all registered codes and the collision handler.
   * For testing only — not for production use.
   *
   * @internal
   */
  public static reset(): void {
    registry.clear();
    collisionHandler = undefined;
  }
}
