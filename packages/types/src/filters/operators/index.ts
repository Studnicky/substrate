/**
 * Type-specific operator class exports
 * All operators are organized in meaningful type-specific namespaces.
 * Use Types.Operator.TYPE.OPERATION directly (e.g., Types.Operator.STRING.EQUALS)
 */

// Export individual operator classes for advanced usage
export { BooleanOperators } from './BooleanOperators.js';
export { DateOperators } from './DateOperators.js';
export { NumericOperators } from './NumericOperators.js';
export { ObjectOperators } from './ObjectOperators.js';
export { StringOperators } from './StringOperators.js';
export { ValueOperators } from './ValueOperators.js';

// CORE namespace removed - it was meaningless and redundant
// All operators are now properly organized in type-specific namespaces:
// - ARRAY.*, BOOLEAN.*, DATE.*, MAP.*, NUMBER.*, OBJECT.*, SET.*, STRING.*
// - CROSS.* for legitimate cross-type operations
// Use Types.Operator.TYPE.OPERATION directly (e.g., Types.Operator.STRING.EQUALS)
