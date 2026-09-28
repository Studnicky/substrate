import { ErrorDefaults } from '../constants/index.js';

/**
 * Type guard for `keyof typeof ErrorDefaults`, the finite set of scenario names
 * `ModuleError.create` accepts. Reads `ErrorDefaults`'s own keys so the guard
 * cannot drift from the scenario list it checks against.
 */
class ErrorScenarioGuard {
  public static isKnownScenario(value: unknown): value is keyof typeof ErrorDefaults {
    const result = typeof value === 'string' && Object.hasOwn(ErrorDefaults, value);
    return result;
  }
}

export { ErrorScenarioGuard };
