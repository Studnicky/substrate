import { ProjectHostRegistry } from '../runtime/ProjectHostRegistry.js';
import { NodeProjectHost } from './NodeProjectHost.js';

ProjectHostRegistry.setDefaultHost(new NodeProjectHost());

export * from '../index.js';
