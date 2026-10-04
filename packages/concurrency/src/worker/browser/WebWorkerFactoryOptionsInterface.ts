/** Options used to create native browser Workers. */
export interface WebWorkerFactoryOptionsInterface {
  readonly 'options'?: Readonly<Partial<Pick<WorkerOptions, 'credentials' | 'name' | 'type'>>>;
  readonly 'script': string | URL;
}
