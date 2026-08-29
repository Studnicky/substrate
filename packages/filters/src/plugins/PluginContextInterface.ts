// Context passed to plugin operators with field-level options
export interface PluginContextInterface {
  // Additional context data
  'condition'?: unknown;
  'data'?: unknown;
  // Field-level configuration that overrides plugin defaults
  'options'?: Record<string, unknown>;
}
