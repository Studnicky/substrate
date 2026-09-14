/** Options used to create native browser Workers. */
export interface WebWorkerFactoryOptionsInterface {
  readonly 'options'?: Readonly<Pick<WorkerOptions, 'credentials' | 'name' | 'type'>>;
  readonly 'script': string | URL;
}
