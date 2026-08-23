export namespace ValidateConfigFixtures {
  export const knownKeys = new Set<string>(['debug', 'host', 'maximumRetries', 'port']);

  export const config: Record<string, unknown> = {
    'debug': false,
    'host': 'localhost',
    'maximumRetries': 3,
    'port': 8080
  };
}
