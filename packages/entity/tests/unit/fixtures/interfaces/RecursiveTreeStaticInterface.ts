/** Static shape of the recursive tree node built by the `defineRecursive` checks. */
export interface RecursiveTreeStaticInterface {
  readonly 'children': RecursiveTreeStaticInterface[];
  readonly 'label': string;
}
