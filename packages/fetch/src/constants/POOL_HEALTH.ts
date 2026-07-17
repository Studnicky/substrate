/**
 * Pool health constants for connection management
 */

/** Multiplier for doubling connection pool size when overloaded */
export const POOL_OVERLOAD_MULTIPLIER = 2;

/** Multiplier for increasing connection pool size under pressure */
export const POOL_PRESSURE_MULTIPLIER = 1.5;

/** Queue ratio threshold indicating pool is under pressure */
export const POOL_PRESSURE_THRESHOLD = 0.5;

/** Queue ratio threshold indicating pool is overloaded */
export const POOL_OVERLOAD_THRESHOLD = 1;
