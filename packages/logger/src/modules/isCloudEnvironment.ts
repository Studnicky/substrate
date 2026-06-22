/**
 * Detects if the application is running in a production environment
 * where structured JSON logging should be used instead of pretty printing
 *
 * @returns true if NODE_ENV is 'production' or stdout is not a TTY
 */
export function isCloudEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || !process.stdout.isTTY;
}
