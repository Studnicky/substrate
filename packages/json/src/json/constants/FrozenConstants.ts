/** Mutating `Map` methods guarded against calls on a frozen `Map`, used by {@link Frozen}. */
export const FROZEN_MAP_MUTATORS = new Set<PropertyKey>(['clear', 'delete', 'set']);

/** Mutating `Set` methods guarded against calls on a frozen `Set`, used by {@link Frozen}. */
export const FROZEN_SET_MUTATORS = new Set<PropertyKey>(['add', 'clear', 'delete']);
