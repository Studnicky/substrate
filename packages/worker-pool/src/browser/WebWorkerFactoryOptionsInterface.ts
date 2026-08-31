/** Options used to create native browser Workers. */
export interface WebWorkerFactoryOptionsInterface {
  readonly 'options'?: {
    readonly 'credentials'?: 'include' | 'omit' | 'same-origin';
    readonly 'name'?: string;
    readonly 'type'?: 'classic' | 'module';
  };
  readonly 'script': string | URL;
}
