/** Default primitive configuration used by `BoundaryKit.create()`. */
export const BOUNDARY_KIT_DEFAULTS = {
  'circuitBreakerOptions': {
    'failureThreshold': 5,
    'resetTimeoutMs': 30_000
  }
} as const;
