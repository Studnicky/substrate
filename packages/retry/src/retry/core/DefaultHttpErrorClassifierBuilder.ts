import type { DefaultHttpErrorClassifier } from './DefaultHttpErrorClassifier.js';

export class DefaultHttpErrorClassifierBuilder {
  static create(create: () => DefaultHttpErrorClassifier): DefaultHttpErrorClassifierBuilder {
    return new DefaultHttpErrorClassifierBuilder(create);
  }

  readonly #create: () => DefaultHttpErrorClassifier;

  private constructor(create: () => DefaultHttpErrorClassifier) {
    this.#create = create;
  }

  build(): DefaultHttpErrorClassifier {
    const result = this.#create();
    return result;
  }
}
