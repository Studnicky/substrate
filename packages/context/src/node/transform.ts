import type { ContextAsyncTransformPluginInterface } from '../interfaces/ContextAsyncTransformPluginInterface.js';

import { ContextAsyncTransform } from '../transform/ContextAsyncTransform.js';

export const transform: () => ContextAsyncTransformPluginInterface = ContextAsyncTransform.bind('@studnicky/context/node');
