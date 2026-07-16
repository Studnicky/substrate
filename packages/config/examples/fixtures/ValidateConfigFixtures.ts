export namespace ValidateConfigFixtures {
  export const knownKeys = new Set<string>(['debug', 'host', 'maxRetries', 'port']);

  export const config: Record<string, unknown> = {
    'debug': false,
    'host': 'localhost',
    'maxRetries': 3,
    'port': 8080
  };
}
